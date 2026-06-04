// API 입력 파라미터 정의(필수 여부 검증 + 호출이력 마스킹용). DXAPI_API_PARAM_M.
package ac.donga.dxapi.gateway;

public record ApiParamDef(String paramNm, String essntlYn, String maskRuleDvcd) {
}
