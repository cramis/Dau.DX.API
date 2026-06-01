// 연계시스템 관리 서비스 분기 단위 테스트. 매퍼 목 + 실제 CertKeyService/ObjectMapper. DB 불필요.
package ac.donga.dxapi.extsystem;

import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ErrorCode;
import ac.donga.dxapi.gateway.CertKeyService;
import ac.donga.dxapi.gateway.GatewayProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ExtSystemServiceTest {

    private ExtSystemAdminMapper mapper;
    private ExtSystemService svc;

    @BeforeEach
    void setup() {
        mapper = mock(ExtSystemAdminMapper.class);
        CertKeyService cert = new CertKeyService(new GatewayProperties("test-cert-secret-0123456789"));
        svc = new ExtSystemService(mapper, cert, new ObjectMapper());
    }

    private ExtSystem row(String id) {
        return new ExtSystem(id, "학사", "AKAD1234", "[\"10.0.0.0/24\"]",
                LocalDateTime.now(), LocalDateTime.now().plusDays(1), "홍", "010", "h@d.ac.kr", "비고", "ACTIVE");
    }

    private ExtSystemCreateRequest req(String name) {
        return new ExtSystemCreateRequest(name, List.of("10.0.0.0/24"),
                "2026-01-01T00:00:00", "2026-12-31T23:59:59", List.of(), null, null, null, null, null);
    }

    @Test
    void createGeneratesKeyAndNumbersId() {
        when(mapper.countByName(eq("학사"), isNull())).thenReturn(0);
        when(mapper.selectMaxId(anyString())).thenReturn(null);
        when(mapper.findById(anyString())).thenReturn(row("E20260601001"));
        when(mapper.findMappedApis(anyString())).thenReturn(List.of());

        ExtSystemCreateResponse res = svc.create(req("학사"), "admin01");
        assertTrue(res.freshCertKey().startsWith("AKAD"), res.freshCertKey());
        assertEquals("AKAD1234-****-****-****", res.extSystem().certKey());
        verify(mapper).insert(argThat(s -> s.matches("E\\d{8}001")), eq("학사"),
                anyString(), anyString(), anyString(), any(), any(), any(), any(), any(), any(), eq("ACTIVE"), eq("admin01"));
    }

    @Test
    void createDuplicateName() {
        when(mapper.countByName(eq("학사"), isNull())).thenReturn(1);
        ApiException e = assertThrows(ApiException.class, () -> svc.create(req("학사"), "admin01"));
        assertEquals(ErrorCode.NAME_EXISTS, e.code());
    }

    @Test
    void createBadDateOrder() {
        when(mapper.countByName(anyString(), isNull())).thenReturn(0);
        ExtSystemCreateRequest bad = new ExtSystemCreateRequest("x", List.of(),
                "2026-12-31T00:00:00", "2026-01-01T00:00:00", List.of(), null, null, null, null, null);
        ApiException e = assertThrows(ApiException.class, () -> svc.create(bad, "admin01"));
        assertEquals(ErrorCode.INVALID_INPUT, e.code());
    }

    @Test
    void createMappedApiNotExist() {
        when(mapper.countByName(anyString(), isNull())).thenReturn(0);
        when(mapper.selectMaxId(anyString())).thenReturn(null);
        when(mapper.countApiDef("A999")).thenReturn(0);
        ExtSystemCreateRequest r = new ExtSystemCreateRequest("x", List.of(),
                "2026-01-01T00:00:00", "2026-12-31T23:59:59", List.of("A999"), null, null, null, null, null);
        ApiException e = assertThrows(ApiException.class, () -> svc.create(r, "admin01"));
        assertEquals(ErrorCode.INVALID_INPUT, e.code());
    }

    @Test
    void regenerateKeyReturnsNewPlain() {
        when(mapper.findById("E1")).thenReturn(row("E1"));
        FreshKeyResponse f = svc.regenerateKey("E1", "admin01");
        assertTrue(f.freshCertKey().startsWith("AKAD"));
        verify(mapper).updateCertKey(eq("E1"), anyString(), anyString(), eq("admin01"));
    }
}
