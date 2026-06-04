// 등록 SQL 동사 화이트리스트(C4) 수용 테스트. 등록 거부 + validate-sql 피드백 + 허용 동사.
// 스펙: docs/guide/06_보안강화_설계 §3, open-questions C4. gateway/SqlPolicy.
package ac.donga.dxapi.acceptance;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@EnabledIfSystemProperty(named = "it.devdb", matches = "true")
@SpringBootTest
@AutoConfigureMockMvc
class SqlPolicyAcceptanceIT extends AcceptanceITBase {

    private String registerExpectBadRequest(String token, String method, String path, String sql) throws Exception {
        return mvc.perform(post("/api/apis").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(map(
                                "name", "IT-policy", "group", "IT", "method", method, "path", path,
                                "status", "DRAFT", "dataSrcId", SEED_DS, "authRequired", true,
                                "docVisible", false, "sql", sql, "params", java.util.List.of(), "resps", java.util.List.of()))))
                .andExpect(status().isBadRequest())
                .andReturn().getResponse().getContentAsString();
    }

    // C4 — DROP(DDL) 등록 거부(검증서 반려 → INSERT 없음).
    @Test
    void registerDropRejected() throws Exception {
        registerExpectBadRequest(adminToken(), "GET", "it-drop-" + System.currentTimeMillis(), "DROP TABLE grade");
    }

    // C4 — GET(읽기)인데 INSERT(쓰기) → 거부.
    @Test
    void registerWriteOnGetRejected() throws Exception {
        registerExpectBadRequest(adminToken(), "GET", "it-ins-" + System.currentTimeMillis(),
                "INSERT INTO grade (id) VALUES (#{id})");
    }

    // C4 — 다중 스테이트먼트 거부.
    @Test
    void registerMultiStatementRejected() throws Exception {
        registerExpectBadRequest(adminToken(), "GET", "it-multi-" + System.currentTimeMillis(),
                "SELECT 1 FROM dual; DELETE FROM grade");
    }

    // C4 — validate-sql 이 DELETE 거부(valid:false, 폼 즉시 피드백).
    @Test
    void validateSqlRejectsDelete() throws Exception {
        mvc.perform(post("/api/apis/validate-sql").header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(map("sql", "DELETE FROM grade WHERE id=#{id}", "method", "POST"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.valid").value(false));
    }

    // C4 — 정상 SELECT 는 valid:true(회귀 — 과도 차단 아님).
    @Test
    void validateSqlAcceptsSelect() throws Exception {
        mvc.perform(post("/api/apis/validate-sql").header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(map("sql", "SELECT 1 FROM dual", "method", "GET", "dataSrcId", SEED_DS))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.valid").value(true));
    }

    // C4 — 非GET 의 CALL(저장프로시저) 허용(기존 패턴). 생성됨 → self-clean.
    @Test
    void registerCallProcAllowed() throws Exception {
        String token = adminToken();
        String apiNo = null;
        try {
            apiNo = createApi(token, "IT-call", "POST", "it-call-" + System.currentTimeMillis(),
                    "CALL sp_send_notification(#{userId}, #{message})", false);
            org.junit.jupiter.api.Assertions.assertTrue(apiNo != null && apiNo.startsWith("A"), "created apiNo=" + apiNo);
        } finally {
            deleteApi(token, apiNo);
        }
    }
}
