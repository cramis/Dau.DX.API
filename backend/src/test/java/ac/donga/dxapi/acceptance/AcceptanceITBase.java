// 요구 기반 수용 테스트 공용 베이스. 로그인·데모키·self-clean 헬퍼. 대상 = 실 dev Oracle(-Dit.devdb=true).
package ac.donga.dxapi.acceptance;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 수용 IT 공용. 시드(admin01·데모 인증키·시드 API/연계) 전제. self-clean 헬퍼로 공유 dev DB 오염 방지. */
abstract class AcceptanceITBase {

    protected static final String DEMO_CERT_KEY = "AKAD9001-DXAPIDEMO-1234ABCD-5678EF90";
    protected static final String SEED_DS = "DS20260509001";       // DAU-CORE-PROD(=dev 재지정)
    protected static final String SEED_API_MAPPED = "A20260509001"; // sample-user-info (E20260509001 매핑)

    @Autowired protected MockMvc mvc;
    @Autowired protected ObjectMapper om;

    /** key,value 가변 인자 → 순서보존 Map. Map.of(10쌍 한계·null 불가) 회피. */
    protected static Map<String, Object> map(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) {
            m.put((String) kv[i], kv[i + 1]);
        }
        return m;
    }

    protected String adminToken() throws Exception {
        return login("admin01", "admin01!");
    }

    protected String login(String id, String pw) throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(map("id", id, "password", pw))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return om.readTree(body).path("data").path("accessToken").asText();
    }

    /** ADMIN POST(JSON) → 응답 JsonNode(상태 단언 없음 — 호출자가 상태/코드 검증). */
    protected JsonNode adminPost(String token, String url, Map<String, Object> body) throws Exception {
        String res = mvc.perform(post(url).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(body)))
                .andReturn().getResponse().getContentAsString();
        return om.readTree(res);
    }

    // --- API 정의 self-clean ---
    protected String createApi(String token, String name, String method, String path, String sql, boolean active) throws Exception {
        Map<String, Object> body = map(
                "name", name, "group", "IT", "method", method, "path", path,
                "status", active ? "ACTIVE" : "DRAFT", "dataSrcId", SEED_DS,
                "authRequired", true, "docVisible", false, "sql", sql,
                "params", List.of(), "resps", List.of());
        return adminPost(token, "/api/apis", body).path("data").path("no").asText();
    }

    protected void deleteApi(String token, String apiNo) {
        if (apiNo == null || apiNo.isBlank()) return;
        try {
            mvc.perform(delete("/api/apis/" + apiNo).header("Authorization", "Bearer " + token));
        } catch (Exception ignored) {
        }
    }

    // --- 연계시스템 self-clean ---
    /** 반환 = 응답 data 노드(extSystem.id, freshCertKey 보유). */
    protected JsonNode createExtSystem(String token, Map<String, Object> body) throws Exception {
        return adminPost(token, "/api/ext-systems", body).path("data");
    }

    protected void deleteExtSystem(String token, String id) {
        if (id == null || id.isBlank()) return;
        try {
            mvc.perform(delete("/api/ext-systems/" + id).header("Authorization", "Bearer " + token));
        } catch (Exception ignored) {
        }
    }

    // --- 데이터소스 self-clean ---
    protected String createDataSource(String token, String name, String password) throws Exception {
        Map<String, Object> body = map(
                "name", name, "dbType", "ORACLE",
                "jdbcUrl", "jdbc:oracle:thin:@dummy-it-host:1521/X", "dbUser", "ituser",
                "dbPassword", password, "poolMin", 1, "poolMax", 5, "queryTimeoutSec", 5, "useYn", "Y");
        return adminPost(token, "/api/datasources", body).path("data").path("id").asText();
    }

    protected void deleteDataSource(String token, String id) {
        if (id == null || id.isBlank()) return;
        try {
            mvc.perform(delete("/api/datasources/" + id).header("Authorization", "Bearer " + token));
        } catch (Exception ignored) {
        }
    }
}
