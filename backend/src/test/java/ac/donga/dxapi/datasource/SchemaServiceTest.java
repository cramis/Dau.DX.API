// 스키마 메타 조회 서비스 단위 테스트 — 가드 분기·타입 표기. 커넥션 필요한 질의는 통합테스트에서.
package ac.donga.dxapi.datasource;

import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ErrorCode;
import ac.donga.dxapi.gateway.DataSourceRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SchemaServiceTest {

    private DataSourceAdminMapper mapper;
    private SchemaService svc;

    @BeforeEach
    void setup() {
        mapper = mock(DataSourceAdminMapper.class);
        svc = new SchemaService(mapper, mock(DataSourceRegistry.class), 600);
    }

    private DataSource ds(String dbType) {
        return new DataSource("DS1", "이름", dbType, "jdbc:x", "u", 1, 5, 10, "Y");
    }

    @Test
    void unknownDataSourceNotFound() {
        when(mapper.findById("GHOST")).thenReturn(null);
        ApiException e = assertThrows(ApiException.class, () -> svc.tables("GHOST"));
        assertEquals(ErrorCode.NOT_FOUND, e.code());
    }

    @Test
    void nonOracleRejected() {
        when(mapper.findById("DS1")).thenReturn(ds("POSTGRES"));
        ApiException e = assertThrows(ApiException.class, () -> svc.tables("DS1"));
        assertEquals(ErrorCode.INVALID_INPUT, e.code());
    }

    @Test
    void badTableNameRejected() {
        when(mapper.findById("DS1")).thenReturn(ds("ORACLE"));
        ApiException e = assertThrows(ApiException.class, () -> svc.columns("DS1", "USERS; DROP TABLE X"));
        assertEquals(ErrorCode.INVALID_INPUT, e.code());
    }

    @Test
    void formatTypeVariants() {
        assertEquals("VARCHAR2(100)", SchemaService.formatType("VARCHAR2", 100, null, null));
        assertEquals("NUMBER(10,2)", SchemaService.formatType("NUMBER", 22, 10, 2));
        assertEquals("NUMBER(6)", SchemaService.formatType("NUMBER", 22, 6, 0));
        assertEquals("TIMESTAMP(6)", SchemaService.formatType("TIMESTAMP(6)", 11, null, null));
        assertEquals("CLOB", SchemaService.formatType("CLOB", 4000, null, null));
    }
}
