// 호출 이력 조회 모델(읽기). DXAPI_CALL_HIST_L → 모니터링 history 응답. 05 §11 CallHistory.
package ac.donga.dxapi.monitoring;

import java.time.LocalDateTime;

public record CallHistory(
        long seq,
        LocalDateTime calledAt,
        String extSysId,
        String apiNo,
        String reqPath,
        String method,
        String clientIp,
        String traceId,
        String paramJson,
        int statusCode,
        String errorCode,
        long elapsedMs
) {
}
