// API 정의 응답 DTO. mockup ApiDef 필드명(no/name/group/...). params/resps 포함.
package ac.donga.dxapi.apidef;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiDefResponse(
        String no,
        String name,
        String group,
        String method,
        String path,
        String status,
        String dataSrcId,
        boolean authRequired,
        boolean docVisible,
        String sql,
        String desc,
        List<ApiParamDto> params,
        List<ApiRespDto> resps
) {
}
