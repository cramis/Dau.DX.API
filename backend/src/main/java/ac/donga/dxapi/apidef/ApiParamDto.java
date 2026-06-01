// API 입력 파라미터 DTO(요청·응답 공용). mockup ApiParam.
package ac.donga.dxapi.apidef;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiParamDto(String name, String type, boolean required, String defaultValue, String desc) {
}
