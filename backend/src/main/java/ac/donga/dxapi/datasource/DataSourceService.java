// 데이터소스 관리 서비스. 채번(DS+YYYYMMDD+seq3)·중복명·사용중 차단·풀 evict.
package ac.donga.dxapi.datasource;

import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ErrorCode;
import ac.donga.dxapi.common.ItemsResponse;
import ac.donga.dxapi.gateway.DataSourceRegistry;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Set;

@Service
public class DataSourceService {

    private static final Set<String> DB_TYPES = Set.of("ORACLE", "POSTGRES", "MYSQL");

    private final DataSourceAdminMapper mapper;
    private final DataSourceRegistry registry;

    public DataSourceService(DataSourceAdminMapper mapper, DataSourceRegistry registry) {
        this.mapper = mapper;
        this.registry = registry;
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
        mapper.insert(id, req.name(), req.dbType(), req.jdbcUrl(), req.dbUser(), req.dbPassword(),
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
        mapper.update(id, req.name(), req.dbType(), req.jdbcUrl(), req.dbUser(), req.dbPassword(),
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
