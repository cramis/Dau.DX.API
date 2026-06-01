// 인증 주체 가드 공통 헬퍼. 컨트롤러에서 로그인/ADMIN 권한 확인.
package ac.donga.dxapi.auth;

import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ErrorCode;

public final class AuthSupport {

    private AuthSupport() {
    }

    public static AuthPrincipal requireLogin(AuthPrincipal principal) {
        if (principal == null) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
        return principal;
    }

    public static AuthPrincipal requireAdmin(AuthPrincipal principal) {
        requireLogin(principal);
        if (!"ADMIN".equals(principal.role())) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        return principal;
    }
}
