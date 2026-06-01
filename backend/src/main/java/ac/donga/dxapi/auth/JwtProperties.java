// JWT 설정 바인딩. app.jwt.* (secret / access-ttl-seconds / refresh-ttl-seconds).
package ac.donga.dxapi.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app.jwt")
public record JwtProperties(String secret, long accessTtlSeconds, long refreshTtlSeconds) {
}
