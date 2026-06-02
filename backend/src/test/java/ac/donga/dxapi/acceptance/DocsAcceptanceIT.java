// API 문서(FR7) 수용 테스트. 공개(무토큰) OpenAPI 스펙 + 뷰어 목록. docVisible 만·SQL 비노출·securityScheme.
package ac.donga.dxapi.acceptance;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@EnabledIfSystemProperty(named = "it.devdb", matches = "true")
@SpringBootTest
@AutoConfigureMockMvc
class DocsAcceptanceIT extends AcceptanceITBase {

    // FR7 — /openapi.json 공개(무토큰), OpenAPI3, docVisible 만 노출(A005 DRAFT·N 제외).
    @Test
    void openapiPublicAndFiltersDocVisible() throws Exception {
        mvc.perform(get("/openapi.json"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.openapi").value("3.0.3"))
                .andExpect(jsonPath("$.paths['/api/sample/sample-user-info']").exists())
                .andExpect(jsonPath("$.paths['/api/sample/sample-notification-send']").doesNotExist());
    }

    // FR7 — securityScheme = X-Cert-Key(apiKey/header).
    @Test
    void openapiDeclaresCertKeySecurityScheme() throws Exception {
        mvc.perform(get("/openapi.json"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.components.securitySchemes.certKey.type").value("apiKey"))
                .andExpect(jsonPath("$.components.securitySchemes.certKey.in").value("header"))
                .andExpect(jsonPath("$.components.securitySchemes.certKey.name").value("X-Cert-Key"));
    }

    // FR7 보안 — 공개 스펙에 등록 SQL 비노출.
    @Test
    void openapiDoesNotLeakSql() throws Exception {
        String body = mvc.perform(get("/openapi.json")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertFalse(body.toUpperCase().contains("SELECT"), "SQL 노출됨");
        assertFalse(body.contains("v_user"), "SQL 본문 노출됨");
    }

    // FR7 — FE 뷰어 목록 공개·docVisible 만·SQL 필드 없음.
    @Test
    void docsApisPublicWithoutSql() throws Exception {
        String body = mvc.perform(get("/api/docs/apis"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true))
                .andReturn().getResponse().getContentAsString();
        assertTrue(body.contains("sample-user-info"), "docVisible API 표시");
        assertFalse(body.contains("sample-notification-send"), "비노출(A005) 제외");
        assertFalse(body.toUpperCase().contains("SELECT"), "SQL 비노출");
        assertFalse(body.contains("\"sql\""), "sql 필드 없음");
    }
}
