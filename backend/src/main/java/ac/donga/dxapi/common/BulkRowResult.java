// 일괄 import 행별 결과. FE BulkImportModal RowResult 와 동일 필드(식별자는 도메인 무관 no 에 담음).
package ac.donga.dxapi.common;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record BulkRowResult(
        int index,
        String no,          // 식별자(API=no, DS/연계=id). 신규는 적용 후 채번값.
        String action,      // "inserted" | "updated" (실패 시 null)
        boolean ok,
        String error,       // ErrorCode 명(실패 시)
        String detail       // 상세 사유(실패 시)
) {
    public static BulkRowResult ok(int index, String no, String action) {
        return new BulkRowResult(index, no, action, true, null, null);
    }

    public static BulkRowResult fail(int index, String no, String error, String detail) {
        return new BulkRowResult(index, no, null, false, error, detail);
    }
}
