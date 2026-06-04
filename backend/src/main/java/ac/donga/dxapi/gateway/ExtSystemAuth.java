// 게이트웨이 인증용 연계시스템 뷰. DXAPI_USR_EXT_SYS_M 의 검증 컬럼.
package ac.donga.dxapi.gateway;

import java.time.LocalDateTime;

public record ExtSystemAuth(
        String contctSystId,
        String sttusDvcd,
        String alwIpAddrText,
        LocalDateTime useBeginDt,
        LocalDateTime useEndDt,
        Integer rateLmtPerMin
) {
}
