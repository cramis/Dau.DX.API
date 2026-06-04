// 사용자 등록 DB 의 동적 HikariCP 풀 레지스트리. dataSrcId 별 캐시. 스왑 시 evict.
package ac.donga.dxapi.gateway;

import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ErrorCode;
import ac.donga.dxapi.common.SecretCipher;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Component
public class DataSourceRegistry {

    private final DataSourceMapper dataSourceMapper;
    private final SecretCipher cipher;
    private final Map<String, HikariDataSource> pools = new ConcurrentHashMap<>();
    // graceful 교체용 단발 지연 close. 데몬 단일 스레드.
    private final ScheduledExecutorService drainExecutor = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "ds-drain");
        t.setDaemon(true);
        return t;
    });

    public DataSourceRegistry(DataSourceMapper dataSourceMapper, SecretCipher cipher) {
        this.dataSourceMapper = dataSourceMapper;
        this.cipher = cipher;
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
        // DB_ENC_PW 복호(AES-GCM). 레거시 평문은 passthrough. C7: Vault Transit 으로 대체 예정.
        cfg.setPassword(cipher.decrypt(d.dbEncPw()));
        cfg.setMinimumIdle(d.miniPoolCnt());
        cfg.setMaximumPoolSize(d.maxPoolCnt());
        cfg.setConnectionTimeout(30000);
        cfg.setPoolName("ds-" + dataSrcId);
        return new HikariDataSource(cfg);
    }

    /** 데이터소스 정의 변경(스왑) 시 기존 풀 폐기. 즉시 close(삭제·즉시 교체용). */
    public void evict(String dataSrcId) {
        HikariDataSource pool = pools.remove(dataSrcId);
        if (pool != null) {
            pool.close();
        }
    }

    /** graceful 교체 — 캐시에서 즉시 제거(다음 호출은 새 풀) 후 drainSeconds 뒤 옛 풀 close.
     *  그 사이 in-flight 쿼리는 옛 풀에서 완료(무중단 근사, 단일 인스턴스 한도). drainSeconds 초과 장기 쿼리는 끊길 수 있음. */
    public void evictGraceful(String dataSrcId, int drainSeconds) {
        HikariDataSource old = pools.remove(dataSrcId);
        if (old == null) {
            return;
        }
        if (drainSeconds <= 0) {
            old.close();
            return;
        }
        drainExecutor.schedule(() -> {
            try {
                old.close();
            } catch (Exception ignored) {
            }
        }, drainSeconds, TimeUnit.SECONDS);
    }

    @PreDestroy
    public void shutdown() {
        drainExecutor.shutdownNow();
        pools.values().forEach(p -> {
            try {
                p.close();
            } catch (Exception ignored) {
            }
        });
    }
}
