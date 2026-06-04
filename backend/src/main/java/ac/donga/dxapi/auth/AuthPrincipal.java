// 인증된 호출자 식별. JwtAuthFilter 가 요청 속성에 부착, 컨트롤러가 @RequestAttribute 로 수신.
package ac.donga.dxapi.auth;

public record AuthPrincipal(String userId, String role) {
}
