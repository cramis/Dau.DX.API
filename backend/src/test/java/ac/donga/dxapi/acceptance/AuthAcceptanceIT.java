// 인증(FR1) 수용 테스트. 로그인 성공 토큰 발급 + 오답 거부. 스펙: docs/spec/05_api_연결목록 §1.
package ac.donga.dxapi.acceptance;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@EnabledIfSystemProperty(named = "it.devdb", matches = "true")
@SpringBootTest
@AutoConfigureMockMvc
class AuthAcceptanceIT extends AcceptanceITBase {

    // FR1 — 정상 로그인 → Access 토큰 발급.
    @Test
    void loginIssuesToken() throws Exception {
        assertFalse(adminToken().isBlank());
    }

    // FR1 — 비밀번호 오답 → 401.
    @Test
    void loginWrongPasswordRejected() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(map("id", "admin01", "password", "WRONG"))))
                .andExpect(status().isUnauthorized());
    }
}
