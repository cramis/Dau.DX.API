// hot-swap 실행 요청 — 신규 접속 설정. dbPassword 제공 시에만 갱신(미제공=기존 유지). name/useYn 은 변경 안 함.
package ac.donga.dxapi.datasource;

public record SwapRunRequest(
        String jdbcUrl,
        String dbUser,
        String dbPassword,
        String dbType,
        Integer poolMin,
        Integer poolMax,
        Integer queryTimeoutSec
) {
}
