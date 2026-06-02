// 일괄 import 응답. FE 가 top-level {ok, dryRun, summary, results} 를 읽음(ApiResponse 미래핑).
package ac.donga.dxapi.common;

import java.util.List;

public record BulkImportResult(boolean ok, boolean dryRun, Summary summary, List<BulkRowResult> results) {

    public record Summary(int inserted, int updated, int failed, int total) {
    }

    /** 행 결과 → 요약 집계 + ok(실패 0). */
    public static BulkImportResult of(boolean dryRun, List<BulkRowResult> rows) {
        int inserted = 0;
        int updated = 0;
        int failed = 0;
        for (BulkRowResult r : rows) {
            if (!r.ok()) {
                failed++;
            } else if ("inserted".equals(r.action())) {
                inserted++;
            } else if ("updated".equals(r.action())) {
                updated++;
            }
        }
        return new BulkImportResult(failed == 0, dryRun, new Summary(inserted, updated, failed, rows.size()), rows);
    }
}
