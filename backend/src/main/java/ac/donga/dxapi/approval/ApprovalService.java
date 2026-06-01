// 승인 서비스. 회원가입(→사용자 ACTIVE/REJECTED)·API 사용(→연계시스템 매핑 추가) 승인/반려.
package ac.donga.dxapi.approval;

import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ErrorCode;
import ac.donga.dxapi.common.ItemsResponse;
import ac.donga.dxapi.extsystem.ExtSystemAdminMapper;
import ac.donga.dxapi.user.UserMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ApprovalService {

    private static final String USER_SIGNUP = "USER_SIGNUP";
    private static final String API_USAGE = "API_USAGE";

    private final ApprovalMapper approvalMapper;
    private final UserMapper userMapper;
    private final ExtSystemAdminMapper extSystemAdminMapper;

    public ApprovalService(ApprovalMapper approvalMapper, UserMapper userMapper,
                           ExtSystemAdminMapper extSystemAdminMapper) {
        this.approvalMapper = approvalMapper;
        this.userMapper = userMapper;
        this.extSystemAdminMapper = extSystemAdminMapper;
    }

    public ItemsResponse<ApprovalResponse> listUser(String status) {
        return list(USER_SIGNUP, status);
    }

    public ItemsResponse<ApprovalResponse> listApi(String status) {
        return list(API_USAGE, status);
    }

    @Transactional
    public ApprovalResponse approveUser(long seq, String reviewer) {
        Approval a = requirePending(seq, USER_SIGNUP);
        userMapper.updateAdmin(a.targtId(), null, "ACTIVE");
        approvalMapper.process(seq, "APPROVED", reviewer, null);
        return ApprovalResponse.from(requireById(seq));
    }

    @Transactional
    public ApprovalResponse rejectUser(long seq, String reviewer, String reason) {
        Approval a = requirePending(seq, USER_SIGNUP);
        userMapper.updateAdmin(a.targtId(), null, "REJECTED");
        approvalMapper.process(seq, "REJECTED", reviewer, reason);
        return ApprovalResponse.from(requireById(seq));
    }

    @Transactional
    public ApprovalResponse approveApi(long seq, String reviewer) {
        Approval a = requirePending(seq, API_USAGE);
        // API_USAGE: 신청자=연계시스템(APLCNT_ID), 대상=API(TARGT_ID) → 매핑 추가.
        extSystemAdminMapper.insertMapping(a.aplcntId(), a.targtId(), reviewer);
        approvalMapper.process(seq, "APPROVED", reviewer, null);
        return ApprovalResponse.from(requireById(seq));
    }

    @Transactional
    public ApprovalResponse rejectApi(long seq, String reviewer, String reason) {
        requirePending(seq, API_USAGE);
        approvalMapper.process(seq, "REJECTED", reviewer, reason);
        return ApprovalResponse.from(requireById(seq));
    }

    private ItemsResponse<ApprovalResponse> list(String type, String status) {
        List<ApprovalResponse> items = approvalMapper.findByType(type, blank(status)).stream()
                .map(ApprovalResponse::from).toList();
        return new ItemsResponse<>(items);
    }

    private Approval requirePending(long seq, String type) {
        Approval a = approvalMapper.findById(seq);
        if (a == null || !type.equals(a.confmTypeDvcd())) {
            throw new ApiException(ErrorCode.NOT_FOUND);
        }
        if (!"PENDING".equals(a.sttusDvcd())) {
            throw new ApiException(ErrorCode.ALREADY_PROCESSED);
        }
        return a;
    }

    private Approval requireById(long seq) {
        Approval a = approvalMapper.findById(seq);
        if (a == null) {
            throw new ApiException(ErrorCode.NOT_FOUND);
        }
        return a;
    }

    private String blank(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}
