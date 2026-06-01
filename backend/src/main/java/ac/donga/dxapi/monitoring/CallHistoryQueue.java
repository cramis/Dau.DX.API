// 호출 이력 in-process 큐(A5 — Redis 미사용). 게이트웨이 enqueue → 배치writer drain.
package ac.donga.dxapi.monitoring;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

@Component
public class CallHistoryQueue {

    private static final Logger log = LoggerFactory.getLogger(CallHistoryQueue.class);
    private static final int CAPACITY = 10_000;

    private final BlockingQueue<CallHistoryRecord> queue = new LinkedBlockingQueue<>(CAPACITY);

    public void enqueue(CallHistoryRecord record) {
        if (!queue.offer(record)) {
            // 큐 포화 — 적재 유실. 무음 폐기 금지(로그로 노출).
            log.warn("call_hist 큐 포화(cap={}) — 이력 유실 traceId={}", CAPACITY, record.traceId());
        }
    }

    public int drainTo(Collection<CallHistoryRecord> sink, int max) {
        return queue.drainTo(sink, max);
    }

    public int size() {
        return queue.size();
    }
}
