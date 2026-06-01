// 응답 컬럼 + 요청 파라미터 마스킹. MASK_RULE_DVCD 별 규칙 + 휴리스틱(주민/카드). 정확한 정규식은 C6 후속.
package ac.donga.dxapi.gateway;

import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;

@Component
public class MaskingApplier {

    // 휴리스틱 — 값 전체가 패턴이면 PII 로 간주(보수적, 오탐 최소). 호출이력 PARAM_JSON 안전망.
    private static final Pattern RRN = Pattern.compile("\\d{6}-?\\d{7}");
    private static final Pattern CARD = Pattern.compile("(?:\\d{4}[- ]?){3}\\d{4}");

    // 호출이력 적재용 파라미터 마스킹. (1) 선언된 rule(메타) 우선, (2) 없으면 휴리스틱. 원본 params 는 불변.
    public Map<String, Object> maskParamsForLog(Map<String, Object> params, Map<String, String> ruleByParam) {
        if (params == null || params.isEmpty()) {
            return params;
        }
        Map<String, Object> out = new LinkedHashMap<>();
        for (Map.Entry<String, Object> e : params.entrySet()) {
            Object v = e.getValue();
            if (!(v instanceof String s)) {
                out.put(e.getKey(), v);
                continue;
            }
            String rule = ruleByParam == null ? null : ruleByParam.get(e.getKey());
            if (rule != null && !"none".equals(rule)) {
                out.put(e.getKey(), apply(rule, s));   // 메타 명시 규칙
            } else {
                out.put(e.getKey(), maskHeuristic(s));  // 휴리스틱 안전망
            }
        }
        return out;
    }

    private String maskHeuristic(String s) {
        String t = s.trim();
        if (RRN.matcher(t).matches()) {
            return maskTail(t, 7);
        }
        if (CARD.matcher(t).matches()) {
            return maskCardMiddle(t);
        }
        return s;
    }

    public Object apply(String rule, Object value) {
        if (value == null || rule == null || "none".equals(rule)) {
            return value;
        }
        String s = value.toString();
        return switch (rule) {
            case "name" -> maskName(s);
            case "phone" -> maskPhone(s);
            case "email" -> maskEmail(s);
            case "rrn" -> maskTail(s, 7);
            case "card" -> maskCardMiddle(s);
            case "addr" -> maskAddr(s);
            default -> value;
        };
    }

    private String maskName(String s) {
        if (s.length() <= 1) {
            return s;
        }
        return s.charAt(0) + "*".repeat(s.length() - 1);
    }

    private String maskPhone(String s) {
        String[] p = s.split("-");
        if (p.length == 3) {
            p[1] = "*".repeat(p[1].length());
            return String.join("-", p);
        }
        return s;
    }

    private String maskEmail(String s) {
        int at = s.indexOf('@');
        if (at <= 0) {
            return s;
        }
        String local = s.substring(0, at);
        int keep = (local.length() + 1) / 2;
        return local.substring(0, keep) + "*".repeat(local.length() - keep) + s.substring(at);
    }

    private String maskTail(String s, int tail) {
        if (s.length() <= tail) {
            return "*".repeat(s.length());
        }
        return s.substring(0, s.length() - tail) + "*".repeat(tail);
    }

    private String maskCardMiddle(String s) {
        if (s.length() < 8) {
            return s;
        }
        return s.substring(0, 4) + "*".repeat(s.length() - 8) + s.substring(s.length() - 4);
    }

    private String maskAddr(String s) {
        String[] t = s.split(" ");
        if (t.length > 2) {
            return t[0] + " " + t[1] + " ***";
        }
        return s;
    }
}
