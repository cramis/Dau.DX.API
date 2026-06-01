// 통계 계산용 최소 표본. 윈도우 내 호출의 시각·상태·지연만.
package ac.donga.dxapi.monitoring;

import java.time.LocalDateTime;

public record CallSample(LocalDateTime calledAt, int statusCode, long elapsedMs) {
}
