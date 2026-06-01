// 시크릿 대칭 암호화 단위 테스트. AES-GCM 라운드트립·레거시 평문 passthrough·IV 무작위성.
package ac.donga.dxapi.common;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SecretCipherTest {

    private final SecretCipher cipher = new SecretCipher("unit-test-master-key");

    @Test
    void roundTrip() {
        String enc = cipher.encrypt("xowh1392");
        assertTrue(enc.startsWith("enc:v1:"));
        assertNotEquals("xowh1392", enc);
        assertEquals("xowh1392", cipher.decrypt(enc));
    }

    @Test
    void legacyPlaintextPassthrough() {
        // 마커 없는 레거시 평문은 그대로 반환(무중단 전환).
        assertEquals("plain-legacy-pw", cipher.decrypt("plain-legacy-pw"));
    }

    @Test
    void randomIvDifferentCiphertext() {
        // 같은 평문도 매번 다른 암호문(IV 무작위).
        assertNotEquals(cipher.encrypt("same"), cipher.encrypt("same"));
    }

    @Test
    void nullPassthrough() {
        assertNull(cipher.encrypt(null));
        assertNull(cipher.decrypt(null));
    }

    @Test
    void wrongKeyFailsToDecrypt() {
        String enc = cipher.encrypt("secret");
        SecretCipher other = new SecretCipher("different-master-key");
        assertThrows(IllegalStateException.class, () -> other.decrypt(enc));
    }
}
