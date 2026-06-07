// 테스트 실행 결과. SELECT=rows / DML=affected(+rolledBack). 03_API테스트실행_PRD §6.
package ac.donga.dxapi.apidef;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record TestRunResult(
        List<Map<String, Object>> rows,   // SELECT 결과(마스킹 적용)
        Integer affected,                 // DML 영향 행수
        int rowCount,
        boolean limited,                  // maxRows 로 잘렸는지
        long elapsedMs,
        boolean rolledBack                // DML 은 항상 true (DB 원상복구됨)
) {
}
