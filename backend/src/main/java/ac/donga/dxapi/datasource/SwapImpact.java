// 데이터소스 hot-swap 영향도. 교체 전 영향 범위(이 DS 쓰는 API·연계시스템) 제시. (FR3 hot-swap)
package ac.donga.dxapi.datasource;

import java.util.List;

public record SwapImpact(
        DataSourceResponse datasource,
        List<SwapImpactApi> apis,
        List<SwapImpactExt> extSystems,
        int apiCount,
        int extCount
) {
}
