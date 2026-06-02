// 게이트웨이 축B(통제된 안전 노출) 수용 테스트. 4단 검증 거부 분기 + 정상/마스킹 + 레이트리밋.
// 스펙: docs/spec/05_api_연결목록 §10, docs/reference/기존안/02 FR5. ErrorCode HTTP 매핑 = common/ErrorCode.
package ac.donga.dxapi.acceptance;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

import java.util.List;

import static org.hamcrest.Matchers.endsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@EnabledIfSystemProperty(named = "it.devdb", matches = "true")
@SpringBootTest
@AutoConfigureMockMvc
class GatewayAcceptanceIT extends AcceptanceITBase {

    private static final String GW = "/api/sample/sample-user-info";

    // FR5 정상 — 4단 통과 → SELECT → user_nm 'name' 마스킹(끝 **).
    @Test
    void happyPathExecutesAndMasks() throws Exception {
        mvc.perform(get(GW).param("id", "admin01").header("X-Cert-Key", DEMO_CERT_KEY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true))
                .andExpect(jsonPath("$.data[0].user_nm").value(endsWith("**")));
    }

    // FR5 ① 인증키 누락 → 401 INVALID_CERT_KEY.
    @Test
    void missingCertKeyRejected() throws Exception {
        mvc.perform(get(GW).param("id", "admin01"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CERT_KEY"));
    }

    // FR5 ① 인증키 불일치 → 401 INVALID_CERT_KEY.
    @Test
    void invalidCertKeyRejected() throws Exception {
        mvc.perform(get(GW).param("id", "admin01").header("X-Cert-Key", "BAD-KEY-0000-0000"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CERT_KEY"));
    }

    // FR5 ② IP 화이트리스트 — 비localhost 원격 IP(데모 허용 CIDR 밖) → 403 IP_NOT_ALLOWED.
    @Test
    void ipNotAllowedRejected() throws Exception {
        mvc.perform(get(GW).param("id", "admin01").header("X-Cert-Key", DEMO_CERT_KEY)
                        .with(req -> { req.setRemoteAddr("9.9.9.9"); return req; }))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("IP_NOT_ALLOWED"));
    }

    // FR5 ④ 매핑 API — 데모 미매핑 API 호출 → 403 API_NOT_MAPPED.
    // (seed API 의 매핑 상태는 공유 dev DB 에서 drift 가능 → 임시 ACTIVE·미매핑 API 생성 후 검증, self-clean)
    @Test
    void unmappedApiRejected() throws Exception {
        String token = adminToken();
        String apiNo = null;
        try {
            String path = "it-unmapped-" + System.currentTimeMillis();
            apiNo = createApi(token, "IT미매핑", "GET", path, "SELECT 1 FROM dual", true);
            mvc.perform(get("/api/sample/" + path).header("X-Cert-Key", DEMO_CERT_KEY))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("API_NOT_MAPPED"));
        } finally {
            deleteApi(token, apiNo);
        }
    }

    // FR2 비활성 API — A005(DRAFT, POST) → 403 API_NOT_ACTIVE. (메서드 일치해야 라우팅 → POST 호출)
    @Test
    void inactiveApiRejected() throws Exception {
        mvc.perform(post("/api/sample/sample-notification-send").header("X-Cert-Key", DEMO_CERT_KEY)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("API_NOT_ACTIVE"));
    }

    // FR5 미존재 path → 404 API_NOT_FOUND.
    @Test
    void unknownApiNotFound() throws Exception {
        mvc.perform(get("/api/sample/no-such-api-xyz").header("X-Cert-Key", DEMO_CERT_KEY))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("API_NOT_FOUND"));
    }

    // FR5 필수 파라미터 누락 — A001 의 id 누락(검증 통과 후) → 400 MISSING_PARAM.
    @Test
    void missingRequiredParamRejected() throws Exception {
        mvc.perform(get(GW).header("X-Cert-Key", DEMO_CERT_KEY))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MISSING_PARAM"));
    }

    // --- T2 (self-clean) : 임시 연계시스템으로 상태·기간·한도 분기 검증 ---

    // FR5 ① 비활성 연계시스템 → 403 EXT_SYSTEM_INACTIVE.
    @Test
    void inactiveExtSystemRejected() throws Exception {
        String token = adminToken();
        String extId = null;
        try {
            JsonNode data = createExtSystem(token, map(
                    "name", "IT-inactive-" + System.currentTimeMillis(),
                    "allowedIps", List.of("127.0.0.1/32"),
                    "useBegin", "2026-01-01T00:00:00", "useEnd", "2026-12-31T23:59:59",
                    "mappedApis", List.of(SEED_API_MAPPED), "status", "INACTIVE"));
            extId = data.path("extSystem").path("id").asText();
            String key = data.path("freshCertKey").asText();
            mvc.perform(get(GW).param("id", "admin01").header("X-Cert-Key", key))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("EXT_SYSTEM_INACTIVE"));
        } finally {
            deleteExtSystem(token, extId);
        }
    }

    // FR5 ③ 이용기간 외(과거 기간) → 403 OUT_OF_PERIOD.
    @Test
    void outOfPeriodRejected() throws Exception {
        String token = adminToken();
        String extId = null;
        try {
            JsonNode data = createExtSystem(token, map(
                    "name", "IT-expired-" + System.currentTimeMillis(),
                    "allowedIps", List.of("127.0.0.1/32"),
                    "useBegin", "2020-01-01T00:00:00", "useEnd", "2020-12-31T23:59:59",
                    "mappedApis", List.of(SEED_API_MAPPED), "status", "ACTIVE"));
            extId = data.path("extSystem").path("id").asText();
            String key = data.path("freshCertKey").asText();
            mvc.perform(get(GW).param("id", "admin01").header("X-Cert-Key", key))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("OUT_OF_PERIOD"));
        } finally {
            deleteExtSystem(token, extId);
        }
    }

    // #4b 연계별 레이트리밋 — 분당 한도=2 → 3연속 200·200·429 RATE_LIMITED.
    @Test
    void rateLimitPerSystemEnforced() throws Exception {
        String token = adminToken();
        String extId = null;
        try {
            JsonNode data = createExtSystem(token, map(
                    "name", "IT-rate-" + System.currentTimeMillis(),
                    "allowedIps", List.of("127.0.0.1/32"),
                    "useBegin", "2026-01-01T00:00:00", "useEnd", "2026-12-31T23:59:59",
                    "mappedApis", List.of(SEED_API_MAPPED), "status", "ACTIVE", "rateLmtPerMin", 2));
            extId = data.path("extSystem").path("id").asText();
            String key = data.path("freshCertKey").asText();
            mvc.perform(get(GW).param("id", "admin01").header("X-Cert-Key", key)).andExpect(status().isOk());
            mvc.perform(get(GW).param("id", "admin01").header("X-Cert-Key", key)).andExpect(status().isOk());
            mvc.perform(get(GW).param("id", "admin01").header("X-Cert-Key", key))
                    .andExpect(status().isTooManyRequests())
                    .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
        } finally {
            deleteExtSystem(token, extId);
        }
    }
}
