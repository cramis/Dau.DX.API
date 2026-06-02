// 데이터소스 관리 서비스 분기 단위 테스트. 매퍼·레지스트리 Mockito 목. DB 불필요.
package ac.donga.dxapi.datasource;

import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ErrorCode;
import ac.donga.dxapi.common.SecretCipher;
import ac.donga.dxapi.gateway.DataSourceRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DataSourceServiceTest {

    private DataSourceAdminMapper mapper;
    private DataSourceRegistry registry;
    private DataSourceService svc;

    @BeforeEach
    void setup() {
        mapper = mock(DataSourceAdminMapper.class);
        registry = mock(DataSourceRegistry.class);
        svc = new DataSourceService(mapper, registry, new SecretCipher("test-master-key"), 10);
    }

    private DataSourceCreateRequest req(String name, String dbType) {
        return new DataSourceCreateRequest(name, dbType, "jdbc:oracle:thin:@h:1521/x", "u", "pw",
                null, null, null, null);
    }

    @Test
    void createNumbersIdAndInserts() {
        when(mapper.selectMaxId(anyString())).thenReturn(null);
        when(mapper.countByName(eq("NEW-DS"), isNull())).thenReturn(0);
        when(mapper.findById(anyString())).thenReturn(
                new DataSource("X", "NEW-DS", "ORACLE", "u", "j", 5, 20, 10, "Y"));
        svc.create(req("NEW-DS", "ORACLE"), "admin01");
        ArgumentCaptor<String> idCap = ArgumentCaptor.forClass(String.class);
        // 비밀번호는 평문이 아니라 암호화(enc:v1:)되어 저장돼야 한다.
        verify(mapper).insert(idCap.capture(), eq("NEW-DS"), eq("ORACLE"), anyString(), anyString(),
                argThat(s -> s != null && s.startsWith("enc:v1:")), eq(5), eq(20), eq(10), eq("Y"), eq("admin01"));
        assertTrue(idCap.getValue().matches("DS\\d{8}001"), "id=" + idCap.getValue());
    }

    @Test
    void createBadType() {
        ApiException e = assertThrows(ApiException.class, () -> svc.create(req("x", "MONGO"), "admin01"));
        assertEquals(ErrorCode.INVALID_INPUT, e.code());
    }

    @Test
    void createDuplicateName() {
        when(mapper.countByName(eq("DUP"), isNull())).thenReturn(1);
        ApiException e = assertThrows(ApiException.class, () -> svc.create(req("DUP", "ORACLE"), "admin01"));
        assertEquals(ErrorCode.NAME_EXISTS, e.code());
    }

    @Test
    void deleteInUseBlocked() {
        when(mapper.findById("DS1")).thenReturn(new DataSource("DS1", "n", "ORACLE", "u", "j", 5, 20, 10, "Y"));
        when(mapper.countApisUsing("DS1")).thenReturn(2);
        ApiException e = assertThrows(ApiException.class, () -> svc.delete("DS1"));
        assertEquals(ErrorCode.IN_USE, e.code());
        verify(mapper, never()).delete(anyString());
    }

    @Test
    void deleteSuccessEvictsPool() {
        when(mapper.findById("DS1")).thenReturn(new DataSource("DS1", "n", "ORACLE", "u", "j", 5, 20, 10, "Y"));
        when(mapper.countApisUsing("DS1")).thenReturn(0);
        svc.delete("DS1");
        verify(mapper).delete("DS1");
        verify(registry).evict("DS1");
    }

    @Test
    void updateNotFound() {
        when(mapper.findById("ghost")).thenReturn(null);
        ApiException e = assertThrows(ApiException.class,
                () -> svc.update("ghost", new DataSourceUpdateRequest("n", null, null, null, null, null, null, null, null), "admin01"));
        assertEquals(ErrorCode.NOT_FOUND, e.code());
    }
}
