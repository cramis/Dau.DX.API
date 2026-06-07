// API 정의 도메인(읽기, 부모). DXAPI_API_DEF_M. params/resps 는 별도 조회.
package ac.donga.dxapi.apidef;

public record ApiDef(
        String apiNo,
        String apiNm,
        String apiGroupCd,
        String httpMthdDvcd,
        String reqPath,
        String sttusDvcd,
        String dataSrcId,
        String authEssntlYn,
        String docDispYn,
        String sqlText,
        Integer queryTimeoutSec,
        String descText,
        String regId
) {
}
