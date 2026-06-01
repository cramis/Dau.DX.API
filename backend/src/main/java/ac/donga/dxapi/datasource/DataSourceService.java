// 데이터소스 관리 서비스. 채번(DS+YYYYMMDD+seq3)·중복명·사용중 차단·풀 evict.
package ac.donga.dxapi.datasource;

import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ErrorCode;
import ac.donga.dxapi.common.ItemsResponse;
import ac.donga.dxapi.common.SecretCipher;
import ac.donga.dxapi.gateway.DataSourceRegistry;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Set;

@Service
public class DataSourceService {

    private static final Set<String> DB_TYPES = Set.of("ORACLE", "POSTGRES", "MYSQL");

    private final DataSourceAdminMapper mapper;
    private final DataSourceRegistry registry;
    private final SecretCipher cipher;

    public DataSourceService(DataSourceAdminMapper mapper, DataSourceRegistry registry, SecretCipher cipher) {
        this.mapper = mapper;
        this.registry = registry;
        this.cipher = cipher;
    }

    public ItemsResponse<DataSourceResponse> list() {
        return new ItemsResponse<>(mapper.findAll().stream().map(DataSourceResponse::from).toList());
    }

    public DataSourceResponse get(String id) {
        return DataSourceResponse.from(require(id));
    }

    @Transactional
    public DataSourceResponse create(DataSourceCreateRequest req, String actor) {
        validateType(req.dbType());
        String useYn = useYnOrDefault(req.useYn());
        int poolMin = req.poolMin() == null ? 5 : req.poolMin();
        int poolMax = req.poolMax() == null ? 20 : req.poolMax();
        int qto = req.queryTimeoutSec() == null ? 10 : req.queryTimeoutSec();
        validatePool(poolMin, poolMax);
        if (mapper.countByName(req.name(), null) > 0) {
            throw new ApiException(ErrorCode.NAME_EXISTS);
        }
        String id = nextId();
        // DB 비밀번호는 AES-GCM 암호화 저장(C7 전 경량). 게이트웨이 풀 생성 시 복호.
        mapper.insert(id, req.name(), req.dbType(), req.jdbcUrl(), req.dbUser(), cipher.encrypt(req.dbPassword()),
                poolMin, poolMax, qto, useYn, actor);
        return DataSourceResponse.from(mapper.findById(id));
    }

    @Transactional
    public DataSourceResponse update(String id, DataSourceUpdateRequest req, String actor) {
        require(id);
        if (req.dbType() != null) {
            validateType(req.dbType());
        }
        if (req.useYn() != null) {
            useYnOrDefault(req.useYn());
        }
        if (req.poolMin() != null && req.poolMax() != null) {
            validatePool(req.poolMin(), req.poolMax());
        }
        if (req.name() != null && mapper.countByName(req.name(), id) > 0) {
            throw new ApiException(ErrorCode.NAME_EXISTS);
        }
        mapper.update(id, req.name(), req.dbType(), req.jdbcUrl(), req.dbUser(), cipher.encrypt(req.dbPassword()),
                req.poolMin(), req.poolMax(), req.queryTimeoutSec(), req.useYn(), actor);
        registry.evict(id);   // 변경된 설정으로 다음 게이트웨이 호출 시 풀 재구성
        return DataSourceResponse.from(mapper.findById(id));
    }

    @Transactional
    public void delete(String id) {
        require(id);
        if (mapper.countApisUsing(id) > 0) {
            throw new ApiException(ErrorCode.IN_USE);
        }
        mapper.delete(id);
        registry.evict(id);
    }

    // 저장 전 입력값으로 실제 JDBC 연결을 시도(검증 쿼리 1회). 연결 자체의 성공/실패를 결과로 담아 항상 정상 반환.
    // 주의: ADMIN 전용. 임의 JDBC URL 접속 가능 → 컨트롤러 requireAdmin 으로만 노출. 비밀번호는 로깅하지 않는다.
    public TestConnectionResult testConnection(TestConnectionRequest req) {
        if (req.dbType() != null) {
            validateType(req.dbType());
        }
        HikariConfig cfg = new HikariConfig();
        cfg.setJdbcUrl(req.jdbcUrl());
        cfg.setUsername(req.dbUser());
        cfg.setPassword(req.dbPassword());
        cfg.setMaximumPoolSize(1);
        cfg.setConnectionTimeout(5000);
        cfg.setInitializationFailTimeout(5000);
        cfg.setPoolName("ds-test");
        long start = System.nanoTime();
        try (HikariDataSource ds = new HikariDataSource(cfg);
             Connection c = ds.getConnection();
             Statement st = c.createStatement();
             ResultSet rs = st.executeQuery(validationQuery(req.dbType()))) {
            rs.next();
            long ms = (System.nanoTime() - start) / 1_000_000;
            return new TestConnectionResult(true, ms, "연결 성공");
        } catch (Exception e) {
            long ms = (System.nanoTime() - start) / 1_000_000;
            return new TestConnectionResult(false, ms, rootMessage(e));
        }
    }

    private String validationQuery(String dbType) {
        return "ORACLE".equals(dbType) ? "SELECT 1 FROM DUAL" : "SELECT 1";
    }

    private String rootMessage(Throwable e) {
        Throwable t = e;
        while (t.getCause() != null) {
            t = t.getCause();
        }
        return t.getMessage() == null ? t.getClass().getSimpleName() : t.getMessage();
    }

    private DataSource require(String id) {
        DataSource d = mapper.findById(id);
        if (d == null) {
            throw new ApiException(ErrorCode.NOT_FOUND);
        }
        return d;
    }

    private void validateType(String dbType) {
        if (!DB_TYPES.contains(dbType)) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "dbType: " + dbType);
        }
    }

    private String useYnOrDefault(String useYn) {
        if (useYn == null) {
            return "Y";
        }
        if (!"Y".equals(useYn) && !"N".equals(useYn)) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "useYn: " + useYn);
        }
        return useYn;
    }

    private void validatePool(int min, int max) {
        if (min < 0 || max < min) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "pool min/max");
        }
    }

    private String nextId() {
        String datePart = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        String maxId = mapper.selectMaxId("DS" + datePart + "%");
        int seq = maxId == null ? 1 : Integer.parseInt(maxId.substring(maxId.length() - 3)) + 1;
        return "DS" + datePart + String.format("%03d", seq);
    }
}
