// dev Oracle 대상 端-端 통합테스트(M5 + 보안 가드). Docker 없는 환경 → Testcontainers 대신 실 dev DB.
// 기본 build 영향 없게 -Dit.devdb=true 일 때만 실행(외부 DB 의존). 시드(admin01·데모 인증키·시드 API) 전제.
package ac.donga.dxapi;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.endsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

// 데모 인증키(시드). E20260509001 의 HMAC 해시와 매칭(기본 cert-hmac-secret 기준).
@EnabledIfSystemProperty(named = "it.devdb", matches = "true")
@SpringBootTest
@AutoConfigureMockMvc
class GatewayIntegrationIT {

    private static final String DEMO_CERT_KEY = "AKAD9001-DXAPIDEMO-1234ABCD-5678EF90";

    @Autowired
    MockMvc mvc;
    @Autowired
    ObjectMapper om;

    private String login(String id, String pw) throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":\"" + id + "\",\"password\":\"" + pw + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return om.readTree(body).path("data").path("accessToken").asText();
    }

    @Test
    void loginSucceedsAndIssuesToken() throws Exception {
        String token = login("admin01", "admin01!");
        org.junit.jupiter.api.Assertions.assertFalse(token.isBlank());
    }

    @Test
    void loginWrongPasswordRejected() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":\"admin01\",\"password\":\"WRONG\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void gatewayHappyPathMasksResponse() throws Exception {
        // 4단 검증 통과 → SELECT 실행 → user_nm 'name' 마스킹(끝 ** ). M5 핵심 端-端.
        mvc.perform(get("/api/sample/sample-user-info").param("id", "admin01")
                        .header("X-Cert-Key", DEMO_CERT_KEY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true))
                .andExpect(jsonPath("$.data[0].user_nm").value(endsWith("**")));
    }

    @Test
    void gatewayInvalidCertKeyRejected() throws Exception {
        mvc.perform(get("/api/sample/sample-user-info").param("id", "admin01")
                        .header("X-Cert-Key", "BAD-KEY-0000-0000"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CERT_KEY"));
    }

    @Test
    void securityRejectsDropSqlOnRegister() throws Exception {
        // 갭#2 회귀 — 파괴 SQL 등록 거부. (검증 단계서 반려 → INSERT 없음)
        String token = login("admin01", "admin01!");
        String payload = "{\"name\":\"IT악성\",\"group\":\"IT\",\"method\":\"GET\",\"path\":\"it-evil-drop\","
                + "\"status\":\"DRAFT\",\"dataSrcId\":\"DS20260509001\",\"authRequired\":true,\"docVisible\":false,"
                + "\"sql\":\"DROP TABLE grade\",\"params\":[],\"resps\":[]}";
        mvc.perform(post("/api/apis").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isBadRequest());
    }

    @Test
    void securityValidateSqlRejectsDelete() throws Exception {
        // 갭#2 회귀 — validate-sql 이 DELETE 거부(valid=false).
        String token = login("admin01", "admin01!");
        mvc.perform(post("/api/apis/validate-sql").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sql\":\"DELETE FROM grade WHERE id=#{id}\",\"method\":\"POST\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.valid").value(false));
    }
}
