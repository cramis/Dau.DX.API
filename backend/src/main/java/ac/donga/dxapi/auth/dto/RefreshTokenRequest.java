// refresh 토큰만 담는 요청. /logout · /refresh 공용.
package ac.donga.dxapi.auth.dto;

public record RefreshTokenRequest(String refreshToken) {
}
