// 사용자 등록 데이터소스 정의(동적 풀 구성용). DXAPI_DATASOURCE_M.
package ac.donga.dxapi.gateway;

public record DataSourceDef(
        String dataSrcId,
        String jdbcUrl,
        String dbUserId,
        String dbEncPw,
        int miniPoolCnt,
        int maxPoolCnt,
        int queryTimeoutSec
) {
}
