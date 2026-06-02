// 응답 + 요청 파라미터 마스킹 단위 테스트. DB 불필요.
package ac.donga.dxapi.gateway;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class MaskingApplierTest {

    private final MaskingApplier masking = new MaskingApplier();

    @Test
    void none() {
        assertEquals("홍길동", masking.apply("none", "홍길동"));
    }

    @Test
    void nullPassthrough() {
        assertNull(masking.apply("name", null));
    }

    @Test
    void name() {
        assertEquals("홍**", masking.apply("name", "홍길동"));
        assertEquals("J***", masking.apply("name", "John"));
    }

    @Test
    void phone() {
        assertEquals("010-****-5678", masking.apply("phone", "010-1234-5678"));
    }

    @Test
    void phoneNoDash() {
        // 하이픈 없는 형식도 가운데 마스킹(유출 방지).
        assertEquals("010****5678", masking.apply("phone", "01012345678"));
    }

    @Test
    void cardPreservesSeparators() {
        assertEquals("1234-****-****-3456", masking.apply("card", "1234-5678-9012-3456"));
        assertEquals("1234********3456", masking.apply("card", "1234567890123456"));
    }

    @Test
    void email() {
        assertEquals("use***@donga.ac.kr", masking.apply("email", "user01@donga.ac.kr"));
    }

    @Test
    void unknownRulePassthrough() {
        assertEquals("value", masking.apply("weird", "value"));
    }

    @Test
    void paramLogHeuristicMasksRrnAndCard() {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("id", "admin01");
        params.put("rrn", "900101-1234567");
        params.put("card", "1234-5678-9012-3456");
        Map<String, Object> out = masking.maskParamsForLog(params, null);
        assertEquals("admin01", out.get("id"));                 // 일반 값 보존
        assertEquals("900101-*******", out.get("rrn"));          // 주민번호 뒤 7 마스킹
        assertEquals("1234-****-****-3456", out.get("card"));    // 카드 가운데 마스킹(구분자 보존)
    }

    @Test
    void paramLogMetaRuleOverridesHeuristic() {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("name", "홍길동");
        Map<String, Object> out = masking.maskParamsForLog(params, Map.of("name", "name"));
        assertEquals("홍**", out.get("name"));                   // 메타 rule 우선 적용
    }

    @Test
    void paramLogEmptyPassthrough() {
        assertNull(masking.maskParamsForLog(null, null));
        assertTrue(masking.maskParamsForLog(Map.of(), null).isEmpty());
    }
}
