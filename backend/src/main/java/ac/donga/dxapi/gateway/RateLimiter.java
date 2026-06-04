// 게이트웨이 레이트리밋. 연계시스템(키)별 분당 호출 한도 — in-process 고정 윈도우. 단일 인스턴스 전제(A5, Redis 미사용).
// 폭주 소비자가 대상 DB 풀을 고갈시키는 것을 차단(가용성). 갭#4. 다중 인스턴스는 공유 저장소(후속).
package ac.donga.dxapi.gateway;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimiter {

    private static final class Window {
        long minuteEpoch = -1;
        int count;
    }

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    /** limitPerMin 이하면 허용(true). 0 이하 = 무제한. 분 경계마다 리셋(고정 윈도우). */
    public boolean tryAcquire(String key, int limitPerMin) {
        if (limitPerMin <= 0) {
            return true;
        }
        long minute = nowMillis() / 60_000;
        Window w = windows.computeIfAbsent(key, k -> new Window());
        synchronized (w) {
            if (w.minuteEpoch != minute) {
                w.minuteEpoch = minute;
                w.count = 0;
            }
            w.count++;
            return w.count <= limitPerMin;
        }
    }

    // 테스트에서 시간 고정 위해 분리.
    protected long nowMillis() {
        return System.currentTimeMillis();
    }
}
