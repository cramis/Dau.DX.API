// JWT 발급/검증. Access(15분)·Refresh(24시간) HS256. C5 결정(장기 Refresh, jti 로 revoke) 반영.
package ac.donga.dxapi.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtProvider {

    public static final String TYP_ACCESS = "access";
    public static final String TYP_REFRESH = "refresh";

    private final SecretKey key;
    private final long accessTtlSeconds;
    private final long refreshTtlSeconds;

    public JwtProvider(JwtProperties props) {
        this.key = Keys.hmacShaKeyFor(props.secret().getBytes(StandardCharsets.UTF_8));
        this.accessTtlSeconds = props.accessTtlSeconds();
        this.refreshTtlSeconds = props.refreshTtlSeconds();
    }

    public String issueAccess(String userId, String role) {
        return build(userId, role, TYP_ACCESS, UUID.randomUUID().toString(), accessTtlSeconds);
    }

    public RefreshIssue issueRefresh(String userId, String role) {
        String jti = UUID.randomUUID().toString();
        Instant exp = Instant.now().plusSeconds(refreshTtlSeconds);
        String token = build(userId, role, TYP_REFRESH, jti, refreshTtlSeconds);
        return new RefreshIssue(token, jti, exp);
    }

    /** 서명·만료 검증 후 Claims 반환. 실패 시 io.jsonwebtoken.JwtException(unchecked) 던짐. */
    public Claims parse(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }

    private String build(String userId, String role, String typ, String jti, long ttlSeconds) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId)
                .claim("role", role)
                .claim("typ", typ)
                .id(jti)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(ttlSeconds)))
                .signWith(key)
                .compact();
    }

    public record RefreshIssue(String token, String jti, Instant expiresAt) {
    }
}
