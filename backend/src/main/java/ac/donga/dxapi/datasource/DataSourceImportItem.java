// 데이터소스 일괄 import 행. create 필드 + 식별자 id(누락 시 신규). dbPassword: 신규 필수·수정 생략 시 기존 유지.
package ac.donga.dxapi.datasource;

public record DataSourceImportItem(
        String id,
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
