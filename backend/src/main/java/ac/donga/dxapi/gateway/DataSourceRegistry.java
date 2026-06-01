// 사용자 등록 DB 의 동적 HikariCP 풀 레지스트리. dataSrcId 별 캐시. 스왑 시 evict.
package ac.donga.dxapi.gateway;

import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ErrorCode;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class DataSourceRegistry {

    private final DataSourceMapper dataSourceMapper;
    private final Map<String, HikariDataSource> pools = new ConcurrentHashMap<>();

    public DataSourceRegistry(DataSourceMapper dataSourceMapper) {
        this.dataSourceMapper = dataSourceMapper;
    }

    public DataSource get(String dataSrcId) {
        return pools.computeIfAbsent(dataSrcId, this::build);
    }

    private HikariDataSource build(String dataSrcId) {
        DataSourceDef d = dataSourceMapper.findById(dataSrcId);
        if (d == null) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "데이터소스 없음: " + dataSrcId);
        }
        HikariConfig cfg = new HikariConfig();
        cfg.setJdbcUrl(d.jdbcUrl());
        cfg.setUsername(d.dbUserId());
        // C7 후속: DB_ENC_PW 는 Vault Transit 복호화 대상. 현재는 저장값 그대로 사용.
        cfg.setPassword(d.dbEncPw());
        cfg.setMinimumIdle(d.miniPoolCnt());
        cfg.setMaximumPoolSize(d.maxPoolCnt());
        cfg.setConnectionTimeout(30000);
        cfg.setPoolName("ds-" + dataSrcId);
        return new HikariDataSource(cfg);
    }

    /** 데이터소스 정의 변경(스왑) 시 기존 풀 폐기. */
    public void evict(String dataSrcId) {
        HikariDataSource pool = pools.remove(dataSrcId);
        if (pool != null) {
            pool.close();
        }
    }
}
