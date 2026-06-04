// 로그인 응답. user + access/refresh 토큰. BFF 가 토큰을 httpOnly 쿠키로 보관하고 user 만 화면에 전달.
package ac.donga.dxapi.auth.dto;

import ac.donga.dxapi.user.UserResponse;

public record LoginResponse(
        UserResponse user,
        String accessToken,
        String refreshToken
) {
}
