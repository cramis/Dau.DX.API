// API 정의 등록/수정 요청(공용). PUT 은 params/resps 전체 교체. 05 §4.
package ac.donga.dxapi.apidef;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record ApiDefSaveRequest(
        @NotBlank String name,
        @NotBlank String group,
        @NotBlank String method,
        @NotBlank String path,
        String status,
        @NotBlank String dataSrcId,
        Boolean authRequired,
        Boolean docVisible,
        @NotBlank String sql,
        String desc,
        List<ApiParamDto> params,
        List<ApiRespDto> resps
) {
}
