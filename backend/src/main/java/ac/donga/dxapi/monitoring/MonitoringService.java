// 모니터링 조회 서비스. stats(KPI+시리즈) / history(필터 목록).
package ac.donga.dxapi.monitoring;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MonitoringService {

    private static final int MIN_WINDOW = 5;
    private static final int MAX_WINDOW = 180;
    private static final int MAX_LIMIT = 1000;

    private final MonitoringMapper monitoringMapper;
    private final StatsCalculator statsCalculator;

    public MonitoringService(MonitoringMapper monitoringMapper, StatsCalculator statsCalculator) {
        this.monitoringMapper = monitoringMapper;
        this.statsCalculator = statsCalculator;
    }

    public StatsResult stats(int windowMin) {
        int win = Math.max(MIN_WINDOW, Math.min(MAX_WINDOW, windowMin));
        LocalDateTime now = LocalDateTime.now();
        List<CallSample> samples = monitoringMapper.findSamplesSince(now.minusMinutes(win));
        return statsCalculator.compute(samples, win, now);
    }

    public HistoryResponse history(String q, Integer statusCode, String apiNo, String extSysId,
                                   LocalDateTime from, LocalDateTime to, int limit) {
        int lim = Math.max(1, Math.min(MAX_LIMIT, limit));
        List<CallHistory> items = monitoringMapper.findHistory(q, statusCode, apiNo, extSysId, from, to, lim);
        return new HistoryResponse(items);
    }
}
