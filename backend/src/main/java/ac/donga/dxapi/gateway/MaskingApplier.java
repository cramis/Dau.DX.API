// 응답 컬럼 마스킹. MASK_RULE_DVCD 별 규칙. 정확한 정규식은 C6 후속 — 현재는 단순 규칙.
package ac.donga.dxapi.gateway;

import org.springframework.stereotype.Component;

@Component
public class MaskingApplier {

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
