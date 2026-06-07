// 데이터소스 스키마 메타 조회(테이블·컬럼·코멘트). AI 의 SQL 작성용 — Oracle 딕셔너리 직질의 + in-process TTL 캐시.
// 노출 범위 = 해당 DS 접속계정의 현재 스키마(USER_*) = 게이트웨이가 이미 SQL 실행 가능한 범위. 02_AI초안등록_PRD §6.
package ac.donga.dxapi.datasource;

import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ErrorCode;
import ac.donga.dxapi.gateway.DataSourceRegistry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

@Service
public class SchemaService {

    private static final int MAX_TABLES = 500;
    // Oracle 식별자(비인용). 바인드로만 사용하지만 입력 형태도 제한.
    private static final Pattern TABLE_NAME = Pattern.compile("[A-Za-z0-9_$#]{1,128}");

    public record SchemaTable(String name, String type, String comments) {
    }

    public record SchemaColumn(String name, String dataType, boolean nullable, String comments) {
    }

    public record SchemaTableDetail(String table, List<SchemaColumn> columns) {
    }

    private record CacheEntry(long at, Object value) {
    }

    private final DataSourceAdminMapper mapper;
    private final DataSourceRegistry registry;
    private final long ttlMillis;
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    public SchemaService(DataSourceAdminMapper mapper, DataSourceRegistry registry,
                         @Value("${app.ai.schema-cache-ttl-seconds:600}") long ttlSeconds) {
        this.mapper = mapper;
        this.registry = registry;
        this.ttlMillis = ttlSeconds * 1000;
    }

    /** 테이블·뷰 목록(이름+코멘트, 상한 500). */
    @SuppressWarnings("unchecked")
    public List<SchemaTable> tables(String dataSrcId) {
        requireOracle(dataSrcId);
        return (List<SchemaTable>) cached(dataSrcId + "|", () -> queryTables(dataSrcId));
    }

    /** 단일 테이블 컬럼 상세(이름·타입·nullable·코멘트). */
    @SuppressWarnings("unchecked")
    public SchemaTableDetail columns(String dataSrcId, String table) {
        requireOracle(dataSrcId);
        if (table == null || !TABLE_NAME.matcher(table).matches()) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "table: " + table);
        }
        String upper = table.toUpperCase();
        return (SchemaTableDetail) cached(dataSrcId + "|" + upper, () -> queryColumns(dataSrcId, upper));
    }

    /** DS 변경/스왑/삭제 시 해당 DS 의 캐시 무효화. */
    public void evict(String dataSrcId) {
        cache.keySet().removeIf(k -> k.startsWith(dataSrcId + "|"));
    }

    private void requireOracle(String dataSrcId) {
        DataSource d = mapper.findById(dataSrcId);
        if (d == null) {
            throw new ApiException(ErrorCode.NOT_FOUND);
        }
        // B2: 사용자 DB 는 Oracle 만 P0. PG/MySQL 은 DatabaseMetaData 분기로 후속.
        if (!"ORACLE".equals(d.dbTypeDvcd())) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "스키마 조회는 ORACLE 만 지원(B2): " + d.dbTypeDvcd());
        }
    }

    private Object cached(String key, SchemaQuery query) {
        CacheEntry e = cache.get(key);
        long now = System.currentTimeMillis();
        if (e != null && now - e.at() < ttlMillis) {
            return e.value();
        }
        Object value = query.run();
        cache.put(key, new CacheEntry(now, value));
        return value;
    }

    private interface SchemaQuery {
        Object run();
    }

    private List<SchemaTable> queryTables(String dataSrcId) {
        String sql = """
                SELECT TABLE_NAME, TABLE_TYPE, COMMENTS
                  FROM USER_TAB_COMMENTS
                 WHERE TABLE_TYPE IN ('TABLE','VIEW')
                 ORDER BY TABLE_NAME
                 FETCH FIRST %d ROWS ONLY
                """.formatted(MAX_TABLES);
        List<SchemaTable> out = new ArrayList<>();
        try (Connection c = registry.get(dataSrcId).getConnection();
             PreparedStatement ps = c.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                out.add(new SchemaTable(rs.getString(1), rs.getString(2), rs.getString(3)));
            }
            return out;
        } catch (Exception e) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "스키마 조회 실패: " + e.getMessage());
        }
    }

    private SchemaTableDetail queryColumns(String dataSrcId, String table) {
        String sql = """
                SELECT c.COLUMN_NAME, c.DATA_TYPE, c.DATA_LENGTH, c.DATA_PRECISION, c.DATA_SCALE, c.NULLABLE, cc.COMMENTS
                  FROM USER_TAB_COLUMNS c
                  LEFT JOIN USER_COL_COMMENTS cc
                    ON cc.TABLE_NAME = c.TABLE_NAME AND cc.COLUMN_NAME = c.COLUMN_NAME
                 WHERE c.TABLE_NAME = ?
                 ORDER BY c.COLUMN_ID
                """;
        List<SchemaColumn> cols = new ArrayList<>();
        try (Connection c = registry.get(dataSrcId).getConnection();
             PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, table);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    cols.add(new SchemaColumn(rs.getString(1),
                            formatType(rs.getString(2), rs.getObject(3), rs.getObject(4), rs.getObject(5)),
                            "Y".equals(rs.getString(6)), rs.getString(7)));
                }
            }
        } catch (Exception e) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "스키마 조회 실패: " + e.getMessage());
        }
        if (cols.isEmpty()) {
            throw new ApiException(ErrorCode.NOT_FOUND, "테이블 없음: " + table);
        }
        return new SchemaTableDetail(table, cols);
    }

    /** VARCHAR2(100) / NUMBER(10,2) / NUMBER(6) / TIMESTAMP 식 표기. */
    static String formatType(String type, Object length, Object precision, Object scale) {
        if (type == null) {
            return null;
        }
        if (precision != null) {
            int sc = scale == null ? 0 : ((Number) scale).intValue();
            return sc > 0 ? type + "(" + precision + "," + sc + ")" : type + "(" + precision + ")";
        }
        if (length != null && (type.contains("CHAR") || type.contains("RAW"))) {
            return type + "(" + length + ")";
        }
        return type;
    }
}
