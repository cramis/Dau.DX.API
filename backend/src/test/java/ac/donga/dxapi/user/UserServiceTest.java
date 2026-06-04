// 관리자 사용자 CRUD 분기 단위 테스트. UserMapper 는 Mockito 목. DB 불필요.
package ac.donga.dxapi.user;

import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class UserServiceTest {

    private UserMapper mapper;
    private UserService svc;

    @BeforeEach
    void setup() {
        mapper = mock(UserMapper.class);
        svc = new UserService(mapper);
    }

    private User u(String id, String role, String status) {
        return new User(id, "hash", "이름", "010-0000-0000", id + "@donga.ac.kr",
                "동아대학교", "부서", null, role, status, null, 0);
    }

    @Test
    void updateSelfBlocked() {
        ApiException e = assertThrows(ApiException.class,
                () -> svc.updateByAdmin("admin01", "admin01", new UserAdminUpdateRequest(null, "ACTIVE")));
        assertEquals(ErrorCode.CANNOT_UPDATE_SELF, e.code());
    }

    @Test
    void updateNotFound() {
        when(mapper.findById("ghost")).thenReturn(null);
        ApiException e = assertThrows(ApiException.class,
                () -> svc.updateByAdmin("ghost", "admin01", new UserAdminUpdateRequest(null, "ACTIVE")));
        assertEquals(ErrorCode.NOT_FOUND, e.code());
    }

    @Test
    void updateBadEnum() {
        when(mapper.findById("user02")).thenReturn(u("user02", "USER", "PENDING"));
        ApiException e = assertThrows(ApiException.class,
                () -> svc.updateByAdmin("user02", "admin01", new UserAdminUpdateRequest(null, "WAT")));
        assertEquals(ErrorCode.INVALID_INPUT, e.code());
    }

    @Test
    void updateEmptyPayload() {
        when(mapper.findById("user02")).thenReturn(u("user02", "USER", "PENDING"));
        ApiException e = assertThrows(ApiException.class,
                () -> svc.updateByAdmin("user02", "admin01", new UserAdminUpdateRequest(null, null)));
        assertEquals(ErrorCode.INVALID_INPUT, e.code());
    }

    @Test
    void updateSuccess() {
        when(mapper.findById("user02")).thenReturn(
                u("user02", "USER", "PENDING"), u("user02", "USER", "ACTIVE"));
        UserResponse r = svc.updateByAdmin("user02", "admin01", new UserAdminUpdateRequest(null, "ACTIVE"));
        assertEquals("ACTIVE", r.status());
        verify(mapper).updateAdmin("user02", null, "ACTIVE");
    }

    @Test
    void softDeleteSelfBlocked() {
        ApiException e = assertThrows(ApiException.class, () -> svc.softDelete("admin01", "admin01"));
        assertEquals(ErrorCode.CANNOT_UPDATE_SELF, e.code());
    }
}
