// API 일괄 import 행. ApiDefSaveRequest 필드 + 식별자 no(누락 시 신규 insert·채번).
package ac.donga.dxapi.apidef;

import java.util.List;

public record ApiImportItem(
        String no,
        String name,
        String group,
        String method,
        String path,
        String status,
        String dataSrcId,
        Boolean authRequired,
        Boolean docVisible,
        String sql,
        String desc,
        List<ApiParamDto> params,
        List<ApiRespDto> resps
) {
}
