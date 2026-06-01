// 승인 도메인(읽기). DXAPI_USER_APPR_L. 회원가입/ API 사용 승인 단일 테이블.
package ac.donga.dxapi.approval;

import java.time.LocalDateTime;

public record Approval(
        long confmSeq,
        String confmTypeDvcd,
        String targtId,
        String aplcntId,
        String confmrId,
        String sttusDvcd,
        String reason,
        LocalDateTime applDt,
        LocalDateTime procDt
) {
}
