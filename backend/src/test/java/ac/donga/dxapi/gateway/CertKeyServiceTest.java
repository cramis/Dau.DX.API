// 인증키 HMAC 해시 단위 테스트. DB 불필요.
package ac.donga.dxapi.gateway;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CertKeyServiceTest {

    private final CertKeyService svc = new CertKeyService(new GatewayProperties("test-cert-secret-0123456789"));

    @Test
    void deterministic() {
        assertEquals(svc.hash("AKAD9001-AAAA-BBBB-CCCC"), svc.hash("AKAD9001-AAAA-BBBB-CCCC"));
    }

    @Test
    void differentInputDifferentHash() {
        assertNotEquals(svc.hash("key-one"), svc.hash("key-two"));
    }

    @Test
    void hashIsHex64AndNotPlaintext() {
        String h = svc.hash("AKAD9001-AAAA-BBBB-CCCC");
        assertEquals(64, h.length());
        assertTrue(h.matches("[0-9a-f]{64}"));
        assertNotEquals("AKAD9001-AAAA-BBBB-CCCC", h);
    }

    @Test
    void distiFirst8() {
        assertEquals("AKAD9001", svc.disti("AKAD9001-DXAPIDEMO-1234ABCD-5678EF90"));
        assertEquals("short", svc.disti("short"));
    }
}
