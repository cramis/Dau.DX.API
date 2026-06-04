// 모니터링 통계 결과. mockup statsSnapshot 과 동일 필드(향후 BFF 무변환 전달).
package ac.donga.dxapi.monitoring;

public record StatsResult(
        int total,
        int success,
        int errors,
        int errors5xx,
        double errorRate5xx,
        long p95,
        double successRate,
        int[] series2xx,
        int[] series4xx,
        int[] series5xx,
        int[] seriesOk,
        int[] seriesErr,
        int windowMin
) {
}
