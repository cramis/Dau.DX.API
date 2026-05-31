// 사용자 본인 엔드포인트. GET /api/users/me. 05 계약 §2. 미인증이면 401.
package ac.donga.dxapi.user;

import ac.donga.dxapi.auth.AuthPrincipal;
import ac.donga.dxapi.auth.JwtAuthFilter;
import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ApiResponse;
import ac.donga.dxapi.common.ErrorCode;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ApiResponse<UserResponse> me(
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        if (principal == null) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
        return ApiResponse.ok(userService.getMe(principal.userId()));
    }
}
