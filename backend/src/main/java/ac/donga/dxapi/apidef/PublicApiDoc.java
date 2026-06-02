// 공개 API 문서 DTO. 비로그인 노출용이라 SQL·내부 필드 제외(구조적 배제). FR7.
package ac.donga.dxapi.apidef;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record PublicApiDoc(
        String no,
        String name,
        String group,
        String method,
        String path,
        boolean authRequired,
        String desc,
        List<ApiParamDto> params,
        List<ApiRespDto> resps
) {
}
