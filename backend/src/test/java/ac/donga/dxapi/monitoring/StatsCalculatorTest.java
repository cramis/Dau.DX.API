// 통계 계산 단위 테스트. 순수 로직, DB 불필요.
package ac.donga.dxapi.monitoring;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class StatsCalculatorTest {

    private final StatsCalculator calc = new StatsCalculator();
    private final LocalDateTime now = LocalDateTime.of(2026, 6, 1, 12, 0, 0);

    @Test
    void emptyWindow() {
        StatsResult r = calc.compute(List.of(), 60, now);
        assertEquals(0, r.total());
        assertEquals(100.0, r.successRate());
        assertEquals(0, r.p95());
        assertEquals(60, r.series2xx().length);
    }

    @Test
    void countsAndRates() {
        List<CallSample> s = List.of(
                new CallSample(now.minusMinutes(1), 200, 10),
                new CallSample(now.minusMinutes(1), 200, 20),
                new CallSample(now.minusMinutes(2), 404, 5),
                new CallSample(now.minusMinutes(3), 500, 30)
        );
        StatsResult r = calc.compute(s, 60, now);
        assertEquals(4, r.total());
        assertEquals(2, r.success());
        assertEquals(2, r.errors());
        assertEquals(1, r.errors5xx());
        assertEquals(50.0, r.successRate());
        assertEquals(25.0, r.errorRate5xx());
        assertEquals(30, r.p95());
    }

    @Test
    void excludesOutOfWindow() {
        List<CallSample> s = List.of(
                new CallSample(now.minusMinutes(5), 200, 10),
                new CallSample(now.minusMinutes(90), 200, 10)
        );
        assertEquals(1, calc.compute(s, 60, now).total());
    }

    @Test
    void seriesBucketing() {
        List<CallSample> s = List.of(
                new CallSample(now.minusMinutes(1), 200, 1),
                new CallSample(now.minusMinutes(60), 500, 1)
        );
        StatsResult r = calc.compute(s, 60, now);
        assertEquals(1, r.series2xx()[59]);
        assertEquals(1, r.series5xx()[0]);
        assertEquals(1, r.seriesErr()[0]);
    }
}
