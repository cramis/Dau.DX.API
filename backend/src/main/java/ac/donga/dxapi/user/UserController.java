// 사용자 엔드포인트. GET /api/users/me (본인) + 관리자 CRUD(목록/단건/변경/삭제). 05 §2·§3.
package ac.donga.dxapi.user;

import ac.donga.dxapi.auth.AuthPrincipal;
import ac.donga.dxapi.auth.AuthSupport;
import ac.donga.dxapi.auth.JwtAuthFilter;
import ac.donga.dxapi.common.ApiResponse;
import ac.donga.dxapi.common.ItemsResponse;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
        AuthSupport.requireLogin(principal);
        return ApiResponse.ok(userService.getMe(principal.userId()));
    }

    @GetMapping
    public ApiResponse<ItemsResponse<UserResponse>> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        return ApiResponse.ok(userService.list(q, status));
    }

    @GetMapping("/{id}")
    public ApiResponse<UserResponse> get(
            @PathVariable String id,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        return ApiResponse.ok(userService.get(id));
    }

    @PutMapping("/{id}")
    public ApiResponse<UserResponse> update(
            @PathVariable String id,
            @RequestBody UserAdminUpdateRequest req,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        return ApiResponse.ok(userService.updateByAdmin(id, principal.userId(), req));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(
            @PathVariable String id,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        userService.softDelete(id, principal.userId());
        return ApiResponse.<Void>ok(null);
    }
}
