// 호출 이력 배치 INSERT. 1초 주기 또는 100건 단위로 DXAPI_CALL_HIST_L 적재(04 PRD 수집 경로).
// Oracle 시퀀스(SEQ_CALL_HIST.NEXTVAL)를 SQL 에 직접 두기 위해 MetaDB JdbcTemplate.batchUpdate 사용.
package ac.donga.dxapi.monitoring;

import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;

@Component
public class CallHistoryBatchWriter {

    private static final Logger log = LoggerFactory.getLogger(CallHistoryBatchWriter.class);
    private static final int BATCH = 100;

    private static final String INSERT = """
            INSERT INTO DXAPI_CALL_HIST_L
              (HIST_SEQ, CALNG_DT, CONTCT_SYST_ID, API_NO, REQ_PATH, HTTP_MTHD_DVCD,
               CLIENT_IP_ADDR, TRC_ID, PARAM_JSON_TEXT, RSPNS_STTUS_CD, ERR_CD, INTE_MS)
            VALUES
              (SEQ_CALL_HIST.NEXTVAL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;

    private final CallHistoryQueue queue;
    private final JdbcTemplate jdbcTemplate;

    public CallHistoryBatchWriter(CallHistoryQueue queue, JdbcTemplate jdbcTemplate) {
        this.queue = queue;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Scheduled(fixedDelay = 1000)
    public void flush() {
        List<CallHistoryRecord> batch = new ArrayList<>(BATCH);
        while (queue.drainTo(batch, BATCH) > 0) {
            try {
                insert(batch);
            } catch (Exception e) {
                log.error("call_hist 배치 INSERT 실패 ({}건) — 유실", batch.size(), e);
            }
            batch.clear();
        }
    }

    @PreDestroy
    public void onShutdown() {
        flush();
    }

    private void insert(List<CallHistoryRecord> batch) {
        jdbcTemplate.batchUpdate(INSERT, new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement ps, int i) throws SQLException {
                CallHistoryRecord r = batch.get(i);
                ps.setTimestamp(1, Timestamp.valueOf(r.calledAt()));
                setNullable(ps, 2, r.extSysId());
                setNullable(ps, 3, r.apiNo());
                ps.setString(4, r.reqPath());
                ps.setString(5, r.method());
                ps.setString(6, r.clientIp());
                ps.setString(7, r.traceId());
                setNullable(ps, 8, r.paramJson());
                ps.setInt(9, r.statusCode());
                setNullable(ps, 10, r.errorCode());
                ps.setLong(11, r.elapsedMs());
            }

            @Override
            public int getBatchSize() {
                return batch.size();
            }
        });
    }

    private void setNullable(PreparedStatement ps, int idx, String value) throws SQLException {
        if (value == null) {
            ps.setNull(idx, Types.VARCHAR);
        } else {
            ps.setString(idx, value);
        }
    }
}
