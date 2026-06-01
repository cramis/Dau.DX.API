// 게이트웨이 라우팅·실행용 API 정의 뷰. DXAPI_API_DEF_M 의 일부 컬럼.
package ac.donga.dxapi.gateway;

public record GatewayApi(
        String apiNo,
        String sttusDvcd,
        String dataSrcId,
        String sqlText,
        String authEssntlYn
) {
}
