// 축A(셀프서비스 제작) + 관리 CRUD 수용 테스트. 전부 self-clean(finally 삭제) — 공유 dev DB 오염 방지.
// 스펙: docs/spec/05_api_연결목록 §4·5·6, FR2/FR3/FR4. 채번·유니크·암호화 at-rest·키 발급.
package ac.donga.dxapi.acceptance;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@EnabledIfSystemProperty(named = "it.devdb", matches = "true")
@SpringBootTest
@AutoConfigureMockMvc
class AdminCrudAcceptanceIT extends AcceptanceITBase {

    @Autowired
    JdbcTemplate jdbc;

    // FR2 — API 등록(채번)→조회→수정→삭제 왕복.
    @Test
    void apiCrudRoundtrip() throws Exception {
        String token = adminToken();
        String path = "it-crud-" + System.currentTimeMillis();
        String apiNo = null;
        try {
            apiNo = createApi(token, "IT왕복", "GET", path, "SELECT 1 FROM dual", false);
            assertTrue(apiNo != null && apiNo.startsWith("A"), "apiNo=" + apiNo);
            mvc.perform(get("/api/apis/" + apiNo).header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.path").value(path));
            mvc.perform(put("/api/apis/" + apiNo).header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(om.writeValueAsString(map(
                                    "name", "IT왕복-수정", "group", "IT", "method", "GET", "path", path,
                                    "status", "DRAFT", "dataSrcId", SEED_DS, "authRequired", true,
                                    "docVisible", false, "sql", "SELECT 1 FROM dual",
                                    "params", List.of(), "resps", List.of()))))
                    .andExpect(status().isOk());
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                            .delete("/api/apis/" + apiNo).header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk());
            apiNo = null; // 삭제 완료 — finally 건너뜀
        } finally {
            deleteApi(token, apiNo);
        }
    }

    // FR2 — 요청경로 중복 → 409 PATH_EXISTS.
    @Test
    void duplicatePathRejected() throws Exception {
        String token = adminToken();
        String path = "it-dup-" + System.currentTimeMillis();
        String apiNo = null;
        try {
            apiNo = createApi(token, "IT중복1", "GET", path, "SELECT 1 FROM dual", false);
            assertTrue(apiNo != null && apiNo.startsWith("A"));
            mvc.perform(post("/api/apis").header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(om.writeValueAsString(map(
                                    "name", "IT중복2", "group", "IT", "method", "GET", "path", path,
                                    "status", "DRAFT", "dataSrcId", SEED_DS, "authRequired", true,
                                    "docVisible", false, "sql", "SELECT 1 FROM dual",
                                    "params", List.of(), "resps", List.of()))))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.message").value("PATH_EXISTS"));
        } finally {
            deleteApi(token, apiNo);
        }
    }

    // FR3 — DS 비밀번호 AES-GCM 암호화 저장(at-rest). 원본 컬럼이 enc:v1: 암호문.
    @Test
    void dataSourcePasswordEncryptedAtRest() throws Exception {
        String token = adminToken();
        String dsId = null;
        try {
            dsId = createDataSource(token, "IT-DS-" + System.currentTimeMillis(), "plain-secret-123");
            assertTrue(dsId != null && dsId.startsWith("DS"), "dsId=" + dsId);
            String stored = jdbc.queryForObject(
                    "SELECT DB_ENC_PW FROM DXAPI_DATASOURCE_M WHERE DATA_SRC_ID = ?", String.class, dsId);
            assertNotNull(stored);
            assertTrue(stored.startsWith("enc:v1:"), "평문 아님 확인, 실제=" + stored);
            assertFalse(stored.contains("plain-secret-123"), "평문 노출 안 됨");
        } finally {
            deleteDataSource(token, dsId);
        }
    }

    // FR4 — 연계시스템 인증키 서버 발급(평문 1회) + 재발급(키 변경).
    @Test
    void extSystemKeyIssueAndRegenerate() throws Exception {
        String token = adminToken();
        String extId = null;
        try {
            JsonNode data = createExtSystem(token, map(
                    "name", "IT-key-" + System.currentTimeMillis(),
                    "allowedIps", List.of("127.0.0.1/32"),
                    "useBegin", "2026-01-01T00:00:00", "useEnd", "2026-12-31T23:59:59",
                    "mappedApis", List.of(), "status", "ACTIVE"));
            extId = data.path("extSystem").path("id").asText();
            String firstKey = data.path("freshCertKey").asText();
            assertTrue(firstKey != null && !firstKey.isBlank(), "발급 평문키");

            String regen = mvc.perform(post("/api/ext-systems/" + extId + "/regenerate-key")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            String newKey = om.readTree(regen).path("data").path("freshCertKey").asText();
            assertTrue(newKey != null && !newKey.isBlank(), "재발급 평문키");
            assertNotEquals(firstKey, newKey, "재발급 시 키 변경");
        } finally {
            deleteExtSystem(token, extId);
        }
    }
}
