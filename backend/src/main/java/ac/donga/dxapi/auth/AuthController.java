// 인증 엔드포인트. POST /api/auth/login · /logout · /refresh. 05 계약 §1. 토큰은 본문 반환(BFF가 쿠키화).
package ac.donga.dxapi.auth;

import ac.donga.dxapi.auth.dto.LoginRequest;
import ac.donga.dxapi.auth.dto.LoginResponse;
import ac.donga.dxapi.auth.dto.RefreshTokenRequest;
import ac.donga.dxapi.auth.dto.TokenResponse;
import ac.donga.dxapi.common.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest req, HttpServletRequest http) {
        LoginResponse result = authService.login(req.id(), req.password(), clientIp(http), http.getHeader("User-Agent"));
        return ApiResponse.ok(result);
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(@RequestBody RefreshTokenRequest req) {
        authService.logout(req.refreshToken());
        return ApiResponse.<Void>ok(null);
    }

    @PostMapping("/refresh")
    public ApiResponse<TokenResponse> refresh(@RequestBody RefreshTokenRequest req) {
        return ApiResponse.ok(authService.refresh(req.refreshToken()));
    }

    private String clientIp(HttpServletRequest http) {
        String xff = http.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            String[] parts = xff.split(",");
            for (int i = parts.length - 1; i >= 0; i--) {
                String ip = parts[i].trim();
                if (!ip.isBlank()) {
                    return ip;
                }
            }
        }
        return http.getRemoteAddr();
    }
}
