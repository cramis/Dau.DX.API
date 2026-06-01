// 호출 이력 목록 응답. { items: CallHistory[] }. 05 §8.
package ac.donga.dxapi.monitoring;

import java.util.List;

public record HistoryResponse(List<CallHistory> items) {
}
