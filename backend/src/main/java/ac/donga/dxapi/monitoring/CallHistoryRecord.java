// 호출 이력 적재 단위(쓰기 모델). 게이트웨이가 enqueue, 배치writer 가 DXAPI_CALL_HIST_L 로 INSERT.
package ac.donga.dxapi.monitoring;

import java.time.LocalDateTime;

public record CallHistoryRecord(
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
