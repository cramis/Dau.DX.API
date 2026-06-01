// 승인 응답 DTO. mockup Approval 필드명.
package ac.donga.dxapi.approval;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApprovalResponse(
        long seq,
        String type,
        String targetId,
        String applicantId,
        String reviewerId,
        String status,
        String reason,
        String appliedAt,
        String processedAt
) {
    public static ApprovalResponse from(Approval a) {
        return new ApprovalResponse(a.confmSeq(), a.confmTypeDvcd(), a.targtId(), a.aplcntId(),
                a.confmrId(), a.sttusDvcd(), a.reason(),
                a.applDt() == null ? null : a.applDt().toString(),
                a.procDt() == null ? null : a.procDt().toString());
    }
}
