// 호출 표본 → KPI + 분당 시리즈 계산. 순수 로직(DB 무관). mockup statsSnapshot 포팅.
package ac.donga.dxapi.monitoring;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class StatsCalculator {

    public StatsResult compute(List<CallSample> samples, int windowMin, LocalDateTime now) {
        LocalDateTime since = now.minusMinutes(windowMin);

        int total = 0;
        int success = 0;
        int errors = 0;
        int errors5xx = 0;
        List<Long> lats = new ArrayList<>();
        int[] s2xx = new int[windowMin];
        int[] s4xx = new int[windowMin];
        int[] s5xx = new int[windowMin];

        for (CallSample e : samples) {
            if (e.calledAt().isBefore(since)) {
                continue;
            }
            total++;
            lats.add(e.elapsedMs());
            int code = e.statusCode();
            int bucket = (int) Duration.between(since, e.calledAt()).toMinutes();
            boolean inBucket = bucket >= 0 && bucket < windowMin;
            if (code >= 500) {
                errors5xx++;
                errors++;
                if (inBucket) {
                    s5xx[bucket]++;
                }
            } else if (code >= 400) {
                errors++;
                if (inBucket) {
                    s4xx[bucket]++;
                }
            } else if (code >= 200 && code < 300) {
                success++;
                if (inBucket) {
                    s2xx[bucket]++;
                }
            }
        }

        long p95 = percentile95(lats);
        double successRate = total == 0 ? 100.0 : round1(success * 100.0 / total);
        double errorRate5xx = total == 0 ? 0.0 : round1(errors5xx * 100.0 / total);

        int[] seriesErr = new int[windowMin];
        for (int i = 0; i < windowMin; i++) {
            seriesErr[i] = s4xx[i] + s5xx[i];
        }

        return new StatsResult(total, success, errors, errors5xx, errorRate5xx, p95, successRate,
                s2xx, s4xx, s5xx, s2xx, seriesErr, windowMin);
    }

    private long percentile95(List<Long> lats) {
        if (lats.isEmpty()) {
            return 0;
        }
        Collections.sort(lats);
        int idx = Math.min(lats.size() - 1, (int) Math.floor(lats.size() * 0.95));
        return lats.get(idx);
    }

    private double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
