// 데이터소스 연결 테스트 결과. success=연결 성공 여부, latencyMs=소요(ms), detail=메시지. 05 §5 P2.
package ac.donga.dxapi.datasource;

public record TestConnectionResult(
        boolean success,
        long latencyMs,
        String detail
) {
}
