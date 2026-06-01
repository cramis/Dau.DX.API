// 데이터소스 도메인(읽기). DXAPI_DATASOURCE_M. DB_ENC_PW 는 응답에 절대 싣지 않으므로 미포함.
package ac.donga.dxapi.datasource;

public record DataSource(
        String dataSrcId,
        String dataSrcNm,
        String dbTypeDvcd,
        String jdbcUrl,
        String dbUserId,
        int miniPoolCnt,
        int maxPoolCnt,
        int queryTimeoutSec,
        String useYn
) {
}
