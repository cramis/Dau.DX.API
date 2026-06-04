// 데이터소스 응답 DTO. mockup types/api.ts DataSource 필드명. 비밀번호 제외.
package ac.donga.dxapi.datasource;

public record DataSourceResponse(
        String id,
        String name,
        String dbType,
        String jdbcUrl,
        String dbUser,
        int poolMin,
        int poolMax,
        int queryTimeoutSec,
        String useYn
) {
    public static DataSourceResponse from(DataSource d) {
        return new DataSourceResponse(d.dataSrcId(), d.dataSrcNm(), d.dbTypeDvcd(), d.jdbcUrl(),
                d.dbUserId(), d.miniPoolCnt(), d.maxPoolCnt(), d.queryTimeoutSec(), d.useYn());
    }
}
