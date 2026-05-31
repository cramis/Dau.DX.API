// bcrypt(cost 12) PasswordEncoder 동작 검증. C3 결정.
package ac.donga.dxapi.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;

class PasswordEncoderTest {

    private final PasswordEncoder encoder = new BCryptPasswordEncoder(12);

    @Test
    void matchesEncoded() {
        String hash = encoder.encode("admin01!");
        assertTrue(encoder.matches("admin01!", hash));
        assertFalse(encoder.matches("wrong", hash));
    }

    @Test
    void usesCost12() {
        assertTrue(encoder.encode("x").startsWith("$2a$12$"));
    }
}
