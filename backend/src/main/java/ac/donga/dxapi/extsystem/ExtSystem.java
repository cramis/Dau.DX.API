// 연계시스템 도메인(읽기). DXAPI_USR_EXT_SYS_M. 인증키 해시는 응답에 안 싣으므로 미포함(disti만).
package ac.donga.dxapi.extsystem;

import java.time.LocalDateTime;

public record ExtSystem(
        String contctSystId,
        String contctSystNm,
        String crtfcKeyDistiText,
        String alwIpAddrText,
        LocalDateTime useBeginDt,
        LocalDateTime useEndDt,
        String picgNm,
        String picgTelNo,
        String picgEmail,
        String rmark,
        String sttusDvcd,
        Integer rateLmtPerMin
) {
}
