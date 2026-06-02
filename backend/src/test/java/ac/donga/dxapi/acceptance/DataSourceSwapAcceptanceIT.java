// 데이터소스 무중단 변경(hot-swap) 수용 테스트. 영향도 조회 + graceful 교체(설정 반영). (FR3)
package ac.donga.dxapi.acceptance;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@EnabledIfSystemProperty(named = "it.devdb", matches = "true")
@SpringBootTest
@AutoConfigureMockMvc
class DataSourceSwapAcceptanceIT extends AcceptanceITBase {

    // 영향도 — 시드 DS001 을 쓰는 API(5건)·연계(E001) 실 목록.
    @Test
    void swapImpactListsSeedUsage() throws Exception {
        String token = adminToken();
        String res = mvc.perform(get("/api/datasources/" + SEED_DS + "/swap/impact")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode data = om.readTree(res).path("data");
        assertTrue(data.path("apiCount").asInt() >= 5, "시드 DS001 = API 5건+, 실제=" + data.path("apiCount").asInt());
        assertTrue(res.contains("sample-user-info"), "영향 API 표시");
        assertTrue(res.contains("E20260509001"), "영향 연계시스템 표시");
    }

    // graceful 교체 — 임시 DS 의 접속 설정을 신규로 교체(drain 적용). self-clean.
    @Test
    void swapRunUpdatesConfig() throws Exception {
        String token = adminToken();
        String dsId = null;
        try {
            dsId = createDataSource(token, "IT-swap-" + System.currentTimeMillis(), "pw-old");
            String newUrl = "jdbc:oracle:thin:@new-host-it:1521/NEW";
            String body = om.writeValueAsString(map(
                    "jdbcUrl", newUrl, "dbUser", "newuser", "dbType", "ORACLE",
                    "poolMin", 2, "poolMax", 10, "queryTimeoutSec", 7));
            String res = mvc.perform(post("/api/datasources/" + dsId + "/swap/run")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            JsonNode data = om.readTree(res).path("data");
            assertTrue(data.path("ok").asBoolean());
            assertTrue(data.path("drainSeconds").asInt() >= 0);
            assertEquals(newUrl, data.path("datasource").path("jdbcUrl").asText(), "신 설정 반영");
        } finally {
            deleteDataSource(token, dsId);
        }
    }
}
