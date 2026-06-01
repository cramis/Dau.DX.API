// 등록 SQL 검증 서비스. dataSrcId 지정 시 대상 DS 에 prepare(실행X)로 구문·객체 검증, 미지정 시 정적 검사.
package ac.donga.dxapi.apidef;

import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.gateway.DataSourceRegistry;
import ac.donga.dxapi.gateway.SqlPolicy;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SqlValidationService {

    private static final Pattern BIND = Pattern.compile("#\\{\\s*(\\w+)\\s*}");

    private final DataSourceRegistry registry;

    public SqlValidationService(DataSourceRegistry registry) {
        this.registry = registry;
    }

    public ValidateSqlResult validate(String sql, String dataSrcId, String method) {
        if (sql == null || sql.isBlank()) {
            return new ValidateSqlResult(false, null, "EMPTY_SQL");
        }
        // SQL 안전 정책(C4) — 등록과 동일 기준. method 미지정 시 관대(쓰기 허용)로, 정확 강제는 등록 시점.
        SqlPolicy.Result policy = SqlPolicy.check(sql, method == null || !"GET".equalsIgnoreCase(method));
        if (!policy.allowed()) {
            return new ValidateSqlResult(false, null, policy.reason());
        }
        String verb = sql.trim().split("\\s+", 2)[0].toUpperCase();
        List<String> binds = new ArrayList<>();
        Matcher m = BIND.matcher(sql);
        while (m.find()) {
            binds.add(m.group(1));
        }

        // 대상 DS 미지정 → 정적 검사(verb·bind 추출)만.
        if (dataSrcId == null || dataSrcId.isBlank()) {
            return new ValidateSqlResult(true, plan(verb, binds, "정적 검사(DS 미지정)"), null);
        }

        // 실검증: #{param} → ? 로 바꿔 prepare. Oracle 은 prepare 시점에 구문+테이블/컬럼 검증(ORA-00942/00904). 실행하지 않음.
        String jdbcSql = BIND.matcher(sql).replaceAll("?");
        try {
            DataSource ds = registry.get(dataSrcId);
            try (Connection c = ds.getConnection();
                 PreparedStatement ps = c.prepareStatement(jdbcSql)) {
                if ("SELECT".equals(verb)) {
                    ps.getMetaData();   // 컬럼 describe 강제 → 컬럼 존재까지 검증
                }
            }
            return new ValidateSqlResult(true, plan(verb, binds, "prepare 성공 @" + dataSrcId), null);
        } catch (ApiException e) {
            return new ValidateSqlResult(false, null, e.getMessage());
        } catch (Exception e) {
            return new ValidateSqlResult(false, null, rootMessage(e));
        }
    }

    private String plan(String verb, List<String> binds, String how) {
        return "Plan: " + verb + " | binds=[" + String.join(", ", binds) + "] | " + how;
    }

    private String rootMessage(Throwable e) {
        Throwable t = e;
        while (t.getCause() != null) {
            t = t.getCause();
        }
        return t.getMessage() == null ? t.getClass().getSimpleName() : t.getMessage();
    }
}
