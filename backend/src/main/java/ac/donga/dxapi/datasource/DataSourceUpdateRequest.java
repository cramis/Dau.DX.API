// 데이터소스 변경 요청. 모두 선택. dbPassword 제공 시에만 갱신. 05 §5 PUT.
package ac.donga.dxapi.datasource;

public record DataSourceUpdateRequest(
        String name,
        String dbType,
        String jdbcUrl,
        String dbUser,
        String dbPassword,
        Integer poolMin,
        Integer poolMax,
        Integer queryTimeoutSec,
        String useYn
) {
}
