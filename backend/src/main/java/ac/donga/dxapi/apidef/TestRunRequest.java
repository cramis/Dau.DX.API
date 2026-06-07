// 테스트 실행 요청(ad-hoc 정의 — 저장 전/후·DRAFT 무관). 03_API테스트실행_PRD §6.
package ac.donga.dxapi.apidef;

import jakarta.validation.constraints.NotBlank;

import java.util.List;
import java.util.Map;

public record TestRunRequest(
        @NotBlank String method,
        @NotBlank String sql,
        @NotBlank String dataSrcId,
        Map<String, Object> params,
        List<ApiRespDto> resps,   // 선택 — 주면 운영과 동일 마스킹 적용 (type/displayName 은 무시)
        Integer maxRows           // 선택 — 기본 100, 상한 cap
) {
}
