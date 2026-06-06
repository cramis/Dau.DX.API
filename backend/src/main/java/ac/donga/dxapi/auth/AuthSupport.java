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

    /** ADMIN 또는 AI(MCP 서비스계정) 허용. AI 허용 표면은 02_AI초안등록_PRD §6 의 엔드포인트로 한정. */
    public static AuthPrincipal requireAdminOrAi(AuthPrincipal principal) {
        requireLogin(principal);
        if (!"ADMIN".equals(principal.role()) && !"AI".equals(principal.role())) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        return principal;
    }

    public static boolean isAi(AuthPrincipal principal) {
        return principal != null && "AI".equals(principal.role());
    }
}
