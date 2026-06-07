// 테스트 실행 서비스 가드 분기 단위 테스트 — 커넥션 필요한 실행·롤백은 통합테스트에서.
package ac.donga.dxapi.apidef;

import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ErrorCode;
import ac.donga.dxapi.datasource.DataSource;
import ac.donga.dxapi.datasource.DataSourceAdminMapper;
import ac.donga.dxapi.gateway.DataSourceRegistry;
import ac.donga.dxapi.gateway.SqlExecutor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TestRunServiceTest {

    private DataSourceAdminMapper mapper;
    private TestRunService svc;

    @BeforeEach
    void setup() {
        mapper = mock(DataSourceAdminMapper.class);
        svc = new TestRunService(mock(DataSourceRegistry.class), mapper, mock(SqlExecutor.class), 1000, 10);
        when(mapper.findById("DS1")).thenReturn(new DataSource("DS1", "이름", "ORACLE", "jdbc:x", "u", 1, 5, 10, "Y"));
    }

    private TestRunRequest req(String method, String sql) {
        return new TestRunRequest(method, sql, "DS1", Map.of(), null, null);
    }

    @Test
    void unknownMethodRejected() {
        ApiException e = assertThrows(ApiException.class, () -> svc.run(req("PATCH", "SELECT 1 FROM DUAL"), "admin01"));
        assertEquals(ErrorCode.INVALID_INPUT, e.code());
    }

    @Test
    void unknownDataSourceRejected() {
        TestRunRequest r = new TestRunRequest("GET", "SELECT 1 FROM DUAL", "GHOST", Map.of(), null, null);
        ApiException e = assertThrows(ApiException.class, () -> svc.run(r, "admin01"));
        assertEquals(ErrorCode.INVALID_INPUT, e.code());
    }

    @Test
    void sqlPolicyEnforced() {
        // GET 인데 쓰기 SQL → 정책 거부 / DDL 은 항상 거부
        ApiException e1 = assertThrows(ApiException.class,
                () -> svc.run(req("GET", "UPDATE t SET a = 1"), "admin01"));
        assertTrue(String.valueOf(e1.issues()).startsWith("SQL:"));
        ApiException e2 = assertThrows(ApiException.class,
                () -> svc.run(req("POST", "DROP TABLE t"), "admin01"));
        assertEquals(ErrorCode.INVALID_INPUT, e2.code());
    }

    @Test
    void callBlocked() {
        // CALL 은 SqlPolicy(쓰기)는 통과하지만 롤백 불가로 차단 (03 PRD §7, open-q L2)
        ApiException e = assertThrows(ApiException.class,
                () -> svc.run(req("POST", "CALL sp_x(#{a})"), "admin01"));
        assertEquals(ErrorCode.INVALID_INPUT, e.code());
        assertTrue(String.valueOf(e.issues()).contains("CALL"));
    }
}
