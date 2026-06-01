// API 응답 컬럼 정의(마스킹 규칙). DXAPI_API_RESP_M.
package ac.donga.dxapi.gateway;

public record ApiRespDef(String colNm, String maskRuleDvcd) {
}
