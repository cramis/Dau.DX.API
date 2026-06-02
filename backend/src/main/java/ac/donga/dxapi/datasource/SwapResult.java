// hot-swap 실행 결과. 설정 교체 + graceful drain(지연 close) 적용. drainSeconds 동안 기존 풀 in-flight 보호.
package ac.donga.dxapi.datasource;

public record SwapResult(boolean ok, DataSourceResponse datasource, int drainSeconds, String message) {
}
