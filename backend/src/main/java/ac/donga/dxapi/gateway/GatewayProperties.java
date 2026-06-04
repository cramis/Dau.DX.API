// 게이트웨이 설정. app.gateway.cert-hmac-secret (인증키 HMAC-SHA256 서버 비밀).
package ac.donga.dxapi.gateway;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app.gateway")
public record GatewayProperties(String certHmacSecret) {
}
