// API 정의 관리 서비스 분기 단위 테스트. 매퍼 Mockito 목. DB 불필요.
package ac.donga.dxapi.apidef;

import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ApiDefServiceTest {

    private ApiAdminMapper mapper;
    private ApiDefService svc;

    @BeforeEach
    void setup() {
        mapper = mock(ApiAdminMapper.class);
        svc = new ApiDefService(mapper);
    }

    private ApiDefSaveRequest req(String path, String method, String dataSrcId) {
        return new ApiDefSaveRequest("이름", "GRP", method, path, "ACTIVE", dataSrcId, true, true,
                "SELECT 1 FROM DUAL", null,
                List.of(new ApiParamDto("id", "string", true, null, null)),
                List.of(new ApiRespDto("c", "VARCHAR", "표시", "name")));
    }

    private ApiDef row(String id) {
        return new ApiDef(id, "이름", "GRP", "GET", "p", "ACTIVE", "DS1", "Y", "Y", "SELECT 1", null, null);
    }

    @Test
    void createNumbersAndInsertsChildren() {
        when(mapper.countDataSrc("DS1")).thenReturn(1);
        when(mapper.existsByPath(eq("new-path"), isNull())).thenReturn(0);
        when(mapper.selectMaxId(anyString())).thenReturn(null);
        when(mapper.findById(anyString())).thenReturn(row("A20260601001"));
        when(mapper.findParams(anyString())).thenReturn(List.of());
        when(mapper.findResps(anyString())).thenReturn(List.of());

        svc.create(req("new-path", "GET", "DS1"), "admin01");
        verify(mapper).insert(argThat(s -> s.matches("A\\d{8}001")), eq("이름"), eq("GRP"), eq("GET"),
                eq("new-path"), eq("ACTIVE"), eq("DS1"), eq("Y"), eq("Y"), anyString(), isNull(), eq("admin01"));
        verify(mapper).insertParam(anyString(), eq(1), eq("id"), eq("string"), eq("Y"), isNull(), isNull());
        verify(mapper).insertResp(anyString(), eq(1), eq("c"), eq("VARCHAR"), eq("표시"), eq("name"));
    }

    @Test
    void createPathExists() {
        when(mapper.countDataSrc("DS1")).thenReturn(1);
        when(mapper.existsByPath(eq("dup"), isNull())).thenReturn(1);
        ApiException e = assertThrows(ApiException.class, () -> svc.create(req("dup", "GET", "DS1"), "admin01"));
        assertEquals(ErrorCode.PATH_EXISTS, e.code());
    }

    @Test
    void createBadDataSrc() {
        when(mapper.countDataSrc("GHOST")).thenReturn(0);
        ApiException e = assertThrows(ApiException.class, () -> svc.create(req("p", "GET", "GHOST"), "admin01"));
        assertEquals(ErrorCode.INVALID_INPUT, e.code());
    }

    @Test
    void createBadMethod() {
        ApiException e = assertThrows(ApiException.class, () -> svc.create(req("p", "PATCH", "DS1"), "admin01"));
        assertEquals(ErrorCode.INVALID_INPUT, e.code());
    }

    @Test
    void deleteMappedBlocked() {
        when(mapper.findById("A1")).thenReturn(row("A1"));
        when(mapper.countMappings("A1")).thenReturn(1);
        ApiException e = assertThrows(ApiException.class, () -> svc.delete("A1"));
        assertEquals(ErrorCode.IN_USE, e.code());
        verify(mapper, never()).delete(anyString());
    }

    @Test
    void checkPathAvailable() {
        when(mapper.existsByPath("free", null)).thenReturn(0);
        assertTrue(svc.checkPath("free"));
    }
}
