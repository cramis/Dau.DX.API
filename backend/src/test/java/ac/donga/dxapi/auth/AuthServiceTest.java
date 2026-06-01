// AuthService 로그인 분기 단위 테스트. UserMapper/RefreshTokenMapper 는 Mockito 목. DB 불필요.
package ac.donga.dxapi.auth;

import ac.donga.dxapi.auth.dto.LoginResponse;
import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ErrorCode;
import ac.donga.dxapi.user.User;
import ac.donga.dxapi.user.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthServiceTest {

    private UserMapper userMapper;
    private RefreshTokenMapper refreshTokenMapper;
    private PasswordEncoder encoder;
    private AuthService service;

    @BeforeEach
    void setup() {
        userMapper = mock(UserMapper.class);
        refreshTokenMapper = mock(RefreshTokenMapper.class);
        encoder = new BCryptPasswordEncoder(12);
        JwtProvider jwt = new JwtProvider(
                new JwtProperties("test-secret-0123456789-0123456789-abcdefgh", 900, 86400));
        service = new AuthService(userMapper, refreshTokenMapper, jwt, encoder);
    }

    private User user(String id, String rawPw, String status, String role) {
        return new User(id, encoder.encode(rawPw), "이름", "010-0000-0000", id + "@donga.ac.kr",
                "동아대학교", "부서", null, role, status, null, 0);
    }

    @Test
    void loginSuccess() {
        when(userMapper.findById("admin01")).thenReturn(user("admin01", "admin01!", "ACTIVE", "ADMIN"));
        LoginResponse res = service.login("admin01", "admin01!", "127.0.0.1", "JUnit");
        assertEquals("admin01", res.user().id());
        assertNotNull(res.accessToken());
        assertNotNull(res.refreshToken());
        verify(refreshTokenMapper).insert(anyString(), eq("admin01"), any(), eq("127.0.0.1"), eq("JUnit"));
        verify(userMapper).touchLoginSuccess("admin01");
    }

    @Test
    void wrongPassword() {
        when(userMapper.findById("admin01")).thenReturn(user("admin01", "admin01!", "ACTIVE", "ADMIN"));
        ApiException ex = assertThrows(ApiException.class,
                () -> service.login("admin01", "nope", null, null));
        assertEquals(ErrorCode.INVALID_CREDENTIALS, ex.code());
        verify(userMapper).incrementLoginFailure("admin01");
        verify(refreshTokenMapper, never()).insert(any(), any(), any(), any(), any());
    }

    @Test
    void notActive() {
        when(userMapper.findById("user02")).thenReturn(user("user02", "user02!", "PENDING", "USER"));
        ApiException ex = assertThrows(ApiException.class,
                () -> service.login("user02", "user02!", null, null));
        assertEquals(ErrorCode.USER_NOT_ACTIVE, ex.code());
    }

    @Test
    void unknownUser() {
        when(userMapper.findById("ghost")).thenReturn(null);
        ApiException ex = assertThrows(ApiException.class,
                () -> service.login("ghost", "x", null, null));
        assertEquals(ErrorCode.INVALID_CREDENTIALS, ex.code());
    }
}
