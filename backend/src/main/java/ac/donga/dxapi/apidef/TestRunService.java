// API 테스트 실행(ad-hoc) — SELECT 는 한도 적용 조회, DML 은 실행 후 무조건 롤백. CALL 차단. 이력 미적재.
// 03_API테스트실행_PRD §7. 한계: 시퀀스 NEXTVAL 소모·트리거 내 commit 은 롤백 불가.
package ac.donga.dxapi.apidef;

import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ErrorCode;
import ac.donga.dxapi.datasource.DataSourceAdminMapper;
import ac.donga.dxapi.gateway.DataSourceRegistry;
import ac.donga.dxapi.gateway.SqlExecutor;
import ac.donga.dxapi.gateway.SqlPolicy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.stereotype.Service;

import java.sql.Connection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class TestRunService {

    private static final Logger log = LoggerFactory.getLogger(TestRunService.class);

    private static final Set<String> METHODS = Set.of("GET", "POST", "PUT", "DELETE");
    private static final int DEFAULT_MAX_ROWS = 100;

    private final DataSourceRegistry registry;
    private final DataSourceAdminMapper dataSourceMapper;
    private final SqlExecutor sqlExecutor;
    private final int maxRowsCap;
    private final int fallbackTimeoutSec;

    public TestRunService(DataSourceRegistry registry, DataSourceAdminMapper dataSourceMapper, SqlExecutor sqlExecutor,
                          @Value("${app.test-run.max-rows-cap:1000}") int maxRowsCap,
                          @Value("${app.test-run.timeout-sec:10}") int fallbackTimeoutSec) {
        this.registry = registry;
        this.dataSourceMapper = dataSourceMapper;
        this.sqlExecutor = sqlExecutor;
        this.maxRowsCap = maxRowsCap;
        this.fallbackTimeoutSec = fallbackTimeoutSec;
    }

    public TestRunResult run(TestRunRequest req, String actor) {
        if (!METHODS.contains(req.method())) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "method: " + req.method());
        }
        var ds = dataSourceMapper.findById(req.dataSrcId());
        if (ds == null) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "미존재 dataSrcId: " + req.dataSrcId());
        }
        // SQL 정책 — 등록과 동일 기준(GET=읽기 전용, 非GET=쓰기 허용. DDL·DELETE·다중문 상시 거부).
        SqlPolicy.Result policy = SqlPolicy.check(req.sql(), !"GET".equals(req.method()));
        if (!policy.allowed()) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "SQL: " + policy.reason());
        }
        String named = SqlExecutor.toNamed(req.sql());
        String verb = named.trim().split("\\s+", 2)[0].toUpperCase();
        boolean isSelect = "SELECT".equals(verb) || "WITH".equals(verb);
        if (!isSelect && !Set.of("INSERT", "UPDATE", "MERGE").contains(verb)) {
            // CALL 등 — 프로시저 내부 commit 은 롤백 불가(R1). 1차 차단 = open-q L2.
            throw new ApiException(ErrorCode.INVALID_INPUT, "테스트 실행 미지원 동사: " + verb + " (CALL 은 롤백 불가로 차단)");
        }

        int maxRows = req.maxRows() == null ? DEFAULT_MAX_ROWS : Math.max(1, Math.min(req.maxRows(), maxRowsCap));
        int timeout = ds.queryTimeoutSec() > 0 ? ds.queryTimeoutSec() : fallbackTimeoutSec;
        Map<String, Object> params = SqlExecutor.withBindDefaults(
                req.sql(), req.params() == null ? Map.of() : req.params());

        long start = System.nanoTime();
        try (Connection con = registry.get(req.dataSrcId()).getConnection()) {
            boolean prevAutoCommit = con.getAutoCommit();
            con.setAutoCommit(false);
            try {
                // 단일 커넥션 고정 — 실행과 롤백이 같은 트랜잭션에 묶이도록. suppressClose=true 로 템플릿의 close 무시.
                JdbcTemplate jt = new JdbcTemplate(new SingleConnectionDataSource(con, true));
                jt.setMaxRows(maxRows);
                jt.setQueryTimeout(timeout);
                NamedParameterJdbcTemplate tpl = new NamedParameterJdbcTemplate(jt);

                TestRunResult result;
                if (isSelect) {
                    List<Map<String, Object>> rows = tpl.queryForList(named, params);
                    rows = sqlExecutor.mask(rows, ruleByCol(req.resps()));
                    result = new TestRunResult(rows, null, rows.size(), rows.size() >= maxRows, elapsed(start), false);
                } else {
                    int affected = tpl.update(named, params);
                    result = new TestRunResult(null, affected, affected, false, elapsed(start), true);
                }
                log.info("test-run: actor={} ds={} verb={} rows={} elapsedMs={}",
                        actor, req.dataSrcId(), verb, result.rowCount(), result.elapsedMs());
                return result;
            } finally {
                con.rollback();   // SELECT 포함 무조건 롤백 — 락 해제 + DML 원상복구
                con.setAutoCommit(prevAutoCommit);
            }
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            // 관리자 표면 — ORA- 루트 메시지를 그대로 노출(게이트웨이의 상세 숨김과 의도적으로 다름).
            throw new ApiException(ErrorCode.INVALID_INPUT, rootMessage(e));
        }
    }

    private Map<String, String> ruleByCol(List<ApiRespDto> resps) {
        Map<String, String> ruleByCol = new LinkedHashMap<>();
        if (resps != null) {
            for (ApiRespDto r : resps) {
                if (r.col() != null && r.maskRule() != null) {
                    ruleByCol.put(r.col().toLowerCase(), r.maskRule());
                }
            }
        }
        return ruleByCol;
    }

    private long elapsed(long startNanos) {
        return (System.nanoTime() - startNanos) / 1_000_000;
    }

    private String rootMessage(Throwable e) {
        Throwable t = e;
        while (t.getCause() != null) {
            t = t.getCause();
        }
        return t.getMessage() == null ? t.getClass().getSimpleName() : t.getMessage().trim();
    }
}
