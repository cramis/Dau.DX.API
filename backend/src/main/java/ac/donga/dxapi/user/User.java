// 사용자 도메인. DXAPI_USR_USER_M 1:1 (map-underscore-to-camel-case + 생성자 인자명 자동매핑).
package ac.donga.dxapi.user;

import java.time.LocalDateTime;

public record User(
        String userId,
        String pwHash,
        String userNm,
        String hpNo,
        String email,
        String orgNm,
        String deptNm,
        String telNo,
        String roleDvcd,
        String sttusDvcd,
        LocalDateTime ltlyLoginDt,
        int loginFailureTmcnt
) {
}
