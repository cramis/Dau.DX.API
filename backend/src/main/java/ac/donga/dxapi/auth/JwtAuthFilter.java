// Bearer 액세스 토큰을 파싱해 AuthPrincipal 을 요청 속성에 부착. 검증 실패는 무시(미인증으로 진행).
package ac.donga.dxapi.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(2)
public class JwtAuthFilter extends OncePerRequestFilter {

    public static final String ATTR = "authPrincipal";

    private final JwtProvider jwtProvider;

    public JwtAuthFilter(JwtProvider jwtProvider) {
        this.jwtProvider = jwtProvider;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                Claims c = jwtProvider.parse(header.substring(7));
                if (JwtProvider.TYP_ACCESS.equals(c.get("typ", String.class))) {
                    req.setAttribute(ATTR, new AuthPrincipal(c.getSubject(), c.get("role", String.class)));
                }
            } catch (JwtException ignored) {
                // 무효/만료 토큰 → 미인증으로 통과. 보호 엔드포인트가 401 처리.
            }
        }
        chain.doFilter(req, res);
    }
}
