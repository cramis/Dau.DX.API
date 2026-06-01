// 승인 서비스 분기·부수효과 단위 테스트. 매퍼 Mockito 목. DB 불필요.
package ac.donga.dxapi.approval;

import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ErrorCode;
import ac.donga.dxapi.extsystem.ExtSystemAdminMapper;
import ac.donga.dxapi.user.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ApprovalServiceTest {

    private ApprovalMapper approvalMapper;
    private UserMapper userMapper;
    private ExtSystemAdminMapper extMapper;
    private ApprovalService svc;

    @BeforeEach
    void setup() {
        approvalMapper = mock(ApprovalMapper.class);
        userMapper = mock(UserMapper.class);
        extMapper = mock(ExtSystemAdminMapper.class);
        svc = new ApprovalService(approvalMapper, userMapper, extMapper);
    }

    private Approval a(String type, String target, String applicant, String status) {
        return new Approval(1L, type, target, applicant, null, status, null, LocalDateTime.now(), null);
    }

    @Test
    void approveUserActivatesAndProcesses() {
        when(approvalMapper.findById(1L)).thenReturn(a("USER_SIGNUP", "user02", "user02", "PENDING"));
        svc.approveUser(1L, "admin01");
        verify(userMapper).updateAdmin("user02", null, "ACTIVE");
        verify(approvalMapper).process(1L, "APPROVED", "admin01", null);
    }

    @Test
    void rejectUserSetsRejected() {
        when(approvalMapper.findById(1L)).thenReturn(a("USER_SIGNUP", "user02", "user02", "PENDING"));
        svc.rejectUser(1L, "admin01", "사유");
        verify(userMapper).updateAdmin("user02", null, "REJECTED");
        verify(approvalMapper).process(1L, "REJECTED", "admin01", "사유");
    }

    @Test
    void approveApiAddsMapping() {
        when(approvalMapper.findById(2L)).thenReturn(a("API_USAGE", "A20260509004", "E20260509001", "PENDING"));
        svc.approveApi(2L, "admin01");
        verify(extMapper).insertMapping("E20260509001", "A20260509004", "admin01");
        verify(approvalMapper).process(2L, "APPROVED", "admin01", null);
    }

    @Test
    void alreadyProcessedBlocked() {
        when(approvalMapper.findById(1L)).thenReturn(a("USER_SIGNUP", "user02", "user02", "APPROVED"));
        ApiException e = assertThrows(ApiException.class, () -> svc.approveUser(1L, "admin01"));
        assertEquals(ErrorCode.ALREADY_PROCESSED, e.code());
        verify(userMapper, never()).updateAdmin(any(), any(), any());
    }

    @Test
    void wrongTypeNotFound() {
        when(approvalMapper.findById(1L)).thenReturn(a("API_USAGE", "A1", "E1", "PENDING"));
        ApiException e = assertThrows(ApiException.class, () -> svc.approveUser(1L, "admin01"));
        assertEquals(ErrorCode.NOT_FOUND, e.code());
    }
}
