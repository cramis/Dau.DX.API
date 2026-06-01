// 등록 SQL 안전 정책. 동사 화이트리스트 + 다중 스테이트먼트 차단 + DDL/위험 키워드 거부. open-q C4.
// 적용 3지점: API 등록/수정(method 기반), validate-sql(method 기반), 게이트웨이 런타임(관대·하드가드).
package ac.donga.dxapi.gateway;

import java.util.Set;
import java.util.regex.Pattern;

public final class SqlPolicy {

    private SqlPolicy() {
    }

    public record Result(boolean allowed, String reason) {
        public static final Result OK = new Result(true, null);

        static Result deny(String reason) {
            return new Result(false, reason);
        }
    }

    // 읽기 전용(GET) 허용 동사.
    private static final Set<String> READ_VERBS = Set.of("SELECT", "WITH");
    // 쓰기 허용(非GET·런타임) 동사. DELETE 는 의도적으로 제외(데이터 삭제는 항상 거부).
    private static final Set<String> WRITE_VERBS = Set.of("SELECT", "WITH", "INSERT", "UPDATE", "MERGE", "CALL");

    // 동사 위치와 무관하게 항상 거부하는 토큰(문자열/주석 제거 후 단어경계 스캔).
    private static final Pattern FORBIDDEN = Pattern.compile(
            "\\b(DROP|TRUNCATE|ALTER|GRANT|REVOKE|RENAME|DELETE)\\b", Pattern.CASE_INSENSITIVE);
    // 위험 패키지 접두(Oracle). 단어경계 없이 부분일치로 거부.
    private static final Pattern FORBIDDEN_PKG = Pattern.compile("(DBMS_|UTL_)", Pattern.CASE_INSENSITIVE);

    /**
     * SQL 안전성 검사. allowWrite=true 면 INSERT/UPDATE/MERGE/CALL 허용(非GET·런타임), false 면 SELECT/WITH 만(GET).
     * 어느 경우든 DDL·DELETE·다중 스테이트먼트·위험 패키지는 거부.
     */
    public static Result check(String sql, boolean allowWrite) {
        if (sql == null || sql.isBlank()) {
            return Result.deny("EMPTY_SQL");
        }
        String cleaned = stripStringsAndComments(sql).trim();
        // 끝의 세미콜론 1개는 허용(제거), 그 외 내부 세미콜론은 다중 스테이트먼트.
        if (cleaned.endsWith(";")) {
            cleaned = cleaned.substring(0, cleaned.length() - 1).trim();
        }
        if (cleaned.contains(";")) {
            return Result.deny("다중 스테이트먼트 금지");
        }
        if (cleaned.isEmpty()) {
            return Result.deny("EMPTY_SQL");
        }
        String verb = firstToken(cleaned).toUpperCase();
        Set<String> allowed = allowWrite ? WRITE_VERBS : READ_VERBS;
        if (!allowed.contains(verb)) {
            return Result.deny("허용되지 않은 SQL 동사: " + verb);
        }
        if (FORBIDDEN.matcher(cleaned).find()) {
            return Result.deny("금지 키워드 포함(DDL/DELETE)");
        }
        if (FORBIDDEN_PKG.matcher(cleaned).find()) {
            return Result.deny("금지 패키지 호출(DBMS_/UTL_)");
        }
        return Result.OK;
    }

    private static String firstToken(String s) {
        int i = 0;
        while (i < s.length() && Character.isLetter(s.charAt(i))) {
            i++;
        }
        return i == 0 ? "" : s.substring(0, i);
    }

    // 문자열 리터럴('...', '' 이스케이프 포함)과 주석(-- , /* */)을 공백으로 치환. 키워드 스캔의 오탐 방지.
    private static String stripStringsAndComments(String sql) {
        StringBuilder out = new StringBuilder(sql.length());
        int n = sql.length();
        int i = 0;
        while (i < n) {
            char c = sql.charAt(i);
            // 라인 주석
            if (c == '-' && i + 1 < n && sql.charAt(i + 1) == '-') {
                while (i < n && sql.charAt(i) != '\n') {
                    i++;
                }
                continue;
            }
            // 블록 주석
            if (c == '/' && i + 1 < n && sql.charAt(i + 1) == '*') {
                i += 2;
                while (i + 1 < n && !(sql.charAt(i) == '*' && sql.charAt(i + 1) == '/')) {
                    i++;
                }
                i += 2;
                out.append(' ');
                continue;
            }
            // 문자열 리터럴
            if (c == '\'') {
                i++;
                while (i < n) {
                    if (sql.charAt(i) == '\'') {
                        if (i + 1 < n && sql.charAt(i + 1) == '\'') {
                            i += 2; // 이스케이프된 ''
                            continue;
                        }
                        i++; // 닫는 따옴표
                        break;
                    }
                    i++;
                }
                out.append(' '); // 내용은 공백으로
                continue;
            }
            out.append(c);
            i++;
        }
        return out.toString();
    }
}
