// 인증 가드 헬퍼 단위 테스트 — requireAdminOrAi 의 role 분기 (02_AI초안등록_PRD §6).
package ac.donga.dxapi.auth;

import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ErrorCode;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AuthSupportTest {

    @Test
    void requireAdminOrAiAllowsAdminAndAi() {
        assertNotNull(AuthSupport.requireAdminOrAi(new AuthPrincipal("admin01", "ADMIN")));
        assertNotNull(AuthSupport.requireAdminOrAi(new AuthPrincipal("ai-mcp01", "AI")));
    }

    @Test
    void requireAdminOrAiRejectsUser() {
        ApiException e = assertThrows(ApiException.class,
                () -> AuthSupport.requireAdminOrAi(new AuthPrincipal("user01", "USER")));
        assertEquals(ErrorCode.FORBIDDEN, e.code());
    }

    @Test
    void requireAdminOrAiRejectsAnonymous() {
        ApiException e = assertThrows(ApiException.class, () -> AuthSupport.requireAdminOrAi(null));
        assertEquals(ErrorCode.UNAUTHORIZED, e.code());
    }

    @Test
    void requireAdminStillRejectsAi() {
        ApiException e = assertThrows(ApiException.class,
                () -> AuthSupport.requireAdmin(new AuthPrincipal("ai-mcp01", "AI")));
        assertEquals(ErrorCode.FORBIDDEN, e.code());
    }

    @Test
    void isAi() {
        assertTrue(AuthSupport.isAi(new AuthPrincipal("ai-mcp01", "AI")));
        assertFalse(AuthSupport.isAi(new AuthPrincipal("admin01", "ADMIN")));
        assertFalse(AuthSupport.isAi(null));
    }
}
