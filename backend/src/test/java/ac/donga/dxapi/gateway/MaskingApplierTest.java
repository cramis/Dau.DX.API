// 응답 마스킹 단위 테스트. DB 불필요.
package ac.donga.dxapi.gateway;

import org.junit.jupiter.api.Test;

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
    void email() {
        assertEquals("use***@donga.ac.kr", masking.apply("email", "user01@donga.ac.kr"));
    }

    @Test
    void unknownRulePassthrough() {
        assertEquals("value", masking.apply("weird", "value"));
    }
}
