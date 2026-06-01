// 호출 이력 큐 enqueue/drain 단위 테스트. DB 불필요.
package ac.donga.dxapi.monitoring;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CallHistoryQueueTest {

    private CallHistoryRecord rec(String trace) {
        return new CallHistoryRecord(LocalDateTime.now(), null, "A20260509001", "sample-user-info",
                "GET", "1.2.3.4", trace, "{}", 200, null, 5);
    }

    @Test
    void enqueueAndDrain() {
        CallHistoryQueue q = new CallHistoryQueue();
        q.enqueue(rec("t1"));
        q.enqueue(rec("t2"));
        assertEquals(2, q.size());

        List<CallHistoryRecord> sink = new ArrayList<>();
        assertEquals(2, q.drainTo(sink, 10));
        assertEquals(0, q.size());
        assertEquals("t1", sink.get(0).traceId());
    }

    @Test
    void drainRespectsMax() {
        CallHistoryQueue q = new CallHistoryQueue();
        for (int i = 0; i < 5; i++) {
            q.enqueue(rec("t" + i));
        }
        List<CallHistoryRecord> sink = new ArrayList<>();
        assertEquals(3, q.drainTo(sink, 3));
        assertEquals(2, q.size());
    }
}
