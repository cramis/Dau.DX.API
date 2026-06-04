// 토큰 갱신 응답. 회전된 access/refresh 쌍.
package ac.donga.dxapi.auth.dto;

public record TokenResponse(
        String accessToken,
        String refreshToken
) {
}
