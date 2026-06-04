// 일괄 import 수용 테스트. dryRun 무적재·apply self-clean·all-or-nothing·DS 비번 필수. (Bulk import)
package ac.donga.dxapi.acceptance;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@EnabledIfSystemProperty(named = "it.devdb", matches = "true")
@SpringBootTest
@AutoConfigureMockMvc
class BulkImportAcceptanceIT extends AcceptanceITBase {

    private JsonNode importApis(String token, List<?> items, boolean dryRun) throws Exception {
        String body = om.writeValueAsString(map("version", 1, "kind", "api", "items", items));
        String res = mvc.perform(post("/api/apis/import").param("dryRun", String.valueOf(dryRun))
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andReturn().getResponse().getContentAsString();
        return om.readTree(res);
    }

    private Map<String, Object> apiItem(String name, String path) {
        return map("name", name, "group", "IT", "method", "GET", "path", path, "status", "DRAFT",
                "dataSrcId", SEED_DS, "authRequired", true, "docVisible", false, "sql", "SELECT 1 FROM dual",
                "params", List.of(), "resps", List.of());
    }

    private boolean pathAvailable(String token, String path) throws Exception {
        String res = mvc.perform(get("/api/apis/check-path").param("path", path)
                        .header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();
        return om.readTree(res).path("data").path("available").asBoolean();
    }

    // dryRun → 검증만, 적재 0.
    @Test
    void apiDryRunValidatesWithoutPersist() throws Exception {
        String token = adminToken();
        long ts = System.currentTimeMillis();
        String p1 = "it-bulkdry-" + ts + "-a";
        String p2 = "it-bulkdry-" + ts + "-b";
        JsonNode r = importApis(token, List.of(apiItem("IT dry1", p1), apiItem("IT dry2", p2)), true);
        assertTrue(r.path("ok").asBoolean());
        assertTrue(r.path("dryRun").asBoolean());
        assertEquals(2, r.path("summary").path("inserted").asInt());
        assertTrue(pathAvailable(token, p1), "dryRun 은 적재 안 함");
    }

    // apply → 실제 insert 2건. self-clean.
    @Test
    void apiApplyInsertsThenCleanup() throws Exception {
        String token = adminToken();
        long ts = System.currentTimeMillis();
        String p1 = "it-bulkapp-" + ts + "-a";
        String p2 = "it-bulkapp-" + ts + "-b";
        List<String> created = new ArrayList<>();
        try {
            JsonNode r = importApis(token, List.of(apiItem("IT app1", p1), apiItem("IT app2", p2)), false);
            assertTrue(r.path("ok").asBoolean(), r.toString());
            assertEquals(2, r.path("summary").path("inserted").asInt());
            for (JsonNode row : r.path("results")) {
                created.add(row.path("no").asText());
            }
            assertEquals(2, created.size());
            assertFalse(pathAvailable(token, p1), "적용 후 path 점유");
        } finally {
            for (String no : created) {
                deleteApi(token, no);
            }
        }
    }

    // all-or-nothing — 1행 실패(미존재 dataSrc) 시 유효행도 적재 0.
    @Test
    void apiAllOrNothingRejectsWhenAnyInvalid() throws Exception {
        String token = adminToken();
        long ts = System.currentTimeMillis();
        String pGood = "it-bulkrej-" + ts + "-ok";
        Map<String, Object> bad = apiItem("IT bad", "it-bulkrej-" + ts + "-bad");
        bad.put("dataSrcId", "DS_NOPE_XYZ");   // 미존재 dataSrc → 행 실패
        JsonNode r = importApis(token, List.of(apiItem("IT good", pGood), bad), false);
        assertFalse(r.path("ok").asBoolean());
        assertTrue(r.path("summary").path("failed").asInt() >= 1);
        assertTrue(pathAvailable(token, pGood), "유효행도 미적재(all-or-nothing)");
    }

    // 데이터소스 신규 insert 는 dbPassword 필수 — 누락 시 행 실패.
    @Test
    void dataSourceInsertRequiresPassword() throws Exception {
        String token = adminToken();
        Map<String, Object> ds = map("name", "IT-bulkds-" + System.currentTimeMillis(),
                "dbType", "ORACLE", "jdbcUrl", "jdbc:oracle:thin:@x:1521/X", "dbUser", "u",
                "poolMin", 1, "poolMax", 5, "queryTimeoutSec", 5, "useYn", "Y");   // dbPassword 없음
        String body = om.writeValueAsString(map("version", 1, "kind", "dataSource", "items", List.of(ds)));
        String res = mvc.perform(post("/api/datasources/import").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andReturn().getResponse().getContentAsString();
        JsonNode r = om.readTree(res);
        assertFalse(r.path("ok").asBoolean());
        assertEquals(1, r.path("summary").path("failed").asInt());
    }
}
