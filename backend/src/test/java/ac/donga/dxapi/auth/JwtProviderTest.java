// JwtProvider 단위 테스트. 발급/파싱/만료/위조서명. DB 불필요.
package ac.donga.dxapi.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtProviderTest {

    private static final String SECRET = "test-secret-0123456789-0123456789-abcdefgh";

    private JwtProvider provider(long accessTtl, long refreshTtl) {
        return new JwtProvider(new JwtProperties(SECRET, accessTtl, refreshTtl));
    }

    @Test
    void issuesAndParsesAccess() {
        JwtProvider p = provider(900, 86400);
        Claims c = p.parse(p.issueAccess("admin01", "ADMIN"));
        assertEquals("admin01", c.getSubject());
        assertEquals("ADMIN", c.get("role", String.class));
        assertEquals(JwtProvider.TYP_ACCESS, c.get("typ", String.class));
        assertNotNull(c.getId());
    }

    @Test
    void refreshHasJtiAndType() {
        JwtProvider p = provider(900, 86400);
        JwtProvider.RefreshIssue r = p.issueRefresh("user01", "USER");
        assertNotNull(r.jti());
        Claims c = p.parse(r.token());
        assertEquals(JwtProvider.TYP_REFRESH, c.get("typ", String.class));
        assertEquals(r.jti(), c.getId());
    }

    @Test
    void rejectsExpired() {
        JwtProvider p = provider(-10, -10);
        String token = p.issueAccess("admin01", "ADMIN");
        assertThrows(JwtException.class, () -> p.parse(token));
    }

    @Test
    void rejectsTamperedSignature() {
        JwtProvider p = provider(900, 86400);
        JwtProvider other = new JwtProvider(
                new JwtProperties("another-secret-0123456789-0123456789-xyzklmno", 900, 86400));
        String token = p.issueAccess("admin01", "ADMIN");
        assertThrows(JwtException.class, () -> other.parse(token));
    }
}
