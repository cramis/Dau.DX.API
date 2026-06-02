// 로그인/로그아웃/토큰갱신 도메인 로직. bcrypt 검증 + JWT 발급 + Refresh 토큰 영속/회전.
package ac.donga.dxapi.auth;

import ac.donga.dxapi.auth.dto.LoginResponse;
import ac.donga.dxapi.auth.dto.TokenResponse;
import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ErrorCode;
import ac.donga.dxapi.user.User;
import ac.donga.dxapi.user.UserMapper;
import ac.donga.dxapi.user.UserResponse;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final String STATUS_ACTIVE = "ACTIVE";
    private static final int MAX_LOGIN_FAILURES = 5;   // 누적 실패 임계. 도달 시 자동 비활성(브루트포스 차단).

    private final UserMapper userMapper;
    private final RefreshTokenMapper refreshTokenMapper;
    private final JwtProvider jwtProvider;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserMapper userMapper, RefreshTokenMapper refreshTokenMapper,
                       JwtProvider jwtProvider, PasswordEncoder passwordEncoder) {
        this.userMapper = userMapper;
        this.refreshTokenMapper = refreshTokenMapper;
        this.jwtProvider = jwtProvider;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public LoginResponse login(String id, String rawPassword, String clientIp, String userAgent) {
        User user = userMapper.findById(id);
        if (user == null) {
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS);
        }
        if (!passwordEncoder.matches(rawPassword, user.pwHash())) {
            userMapper.incrementLoginFailure(id);
            // ACTIVE 사용자가 누적 5회 실패 시 자동 비활성(06 모델 코멘트·NFR2). 재활성은 관리자.
            if (STATUS_ACTIVE.equals(user.sttusDvcd()) && user.loginFailureTmcnt() + 1 >= MAX_LOGIN_FAILURES) {
                userMapper.deactivate(id);
            }
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS);
        }
        if (!STATUS_ACTIVE.equals(user.sttusDvcd())) {
            throw new ApiException(ErrorCode.USER_NOT_ACTIVE);
        }

        String access = jwtProvider.issueAccess(user.userId(), user.roleDvcd());
        JwtProvider.RefreshIssue refresh = jwtProvider.issueRefresh(user.userId(), user.roleDvcd());
        refreshTokenMapper.insert(refresh.jti(), user.userId(), refresh.expiresAt(), clientIp, userAgent);
        userMapper.touchLoginSuccess(id);

        return new LoginResponse(UserResponse.from(user), access, refresh.token());
    }

    @Transactional
    public void logout(String refreshToken) {
        try {
            Claims c = jwtProvider.parse(refreshToken);
            refreshTokenMapper.revoke(c.getId(), "LOGOUT");
        } catch (JwtException e) {
            // 이미 무효한 토큰이면 로그아웃은 멱등 처리.
        }
    }

    @Transactional
    public TokenResponse refresh(String refreshToken) {
        Claims c;
        try {
            c = jwtProvider.parse(refreshToken);
        } catch (JwtException e) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
        if (!JwtProvider.TYP_REFRESH.equals(c.get("typ", String.class))) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
        if (refreshTokenMapper.countValid(c.getId()) == 0) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
        String userId = c.getSubject();
        String role = c.get("role", String.class);

        refreshTokenMapper.revoke(c.getId(), "ROTATED");
        String access = jwtProvider.issueAccess(userId, role);
        JwtProvider.RefreshIssue rotated = jwtProvider.issueRefresh(userId, role);
        refreshTokenMapper.insert(rotated.jti(), userId, rotated.expiresAt(), null, null);

        return new TokenResponse(access, rotated.token());
    }
}
