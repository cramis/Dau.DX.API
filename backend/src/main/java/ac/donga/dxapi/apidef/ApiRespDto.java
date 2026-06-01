// API 응답 컬럼 DTO(요청·응답 공용). mockup ApiResp.
package ac.donga.dxapi.apidef;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiRespDto(String col, String type, String displayName, String maskRule) {
}
