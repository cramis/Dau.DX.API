// 레이트리밋 단위 테스트. 시간 고정 subclass 로 윈도우 경계 검증. DB 불필요.
package ac.donga.dxapi.gateway;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RateLimiterTest {

    // nowMillis 를 제어해 분 경계 테스트.
    static class FakeClock extends RateLimiter {
        long t = 0;

        @Override
        protected long nowMillis() {
            return t;
        }
    }

    @Test
    void unlimitedWhenZeroOrNegative() {
        RateLimiter rl = new FakeClock();
        for (int i = 0; i < 1000; i++) {
            assertTrue(rl.tryAcquire("k", 0));
            assertTrue(rl.tryAcquire("k", -5));
        }
    }

    @Test
    void allowsUpToLimitThenDenies() {
        RateLimiter rl = new FakeClock();
        assertTrue(rl.tryAcquire("e1", 3));
        assertTrue(rl.tryAcquire("e1", 3));
        assertTrue(rl.tryAcquire("e1", 3));
        assertFalse(rl.tryAcquire("e1", 3)); // 4번째 초과
        assertFalse(rl.tryAcquire("e1", 3));
    }

    @Test
    void resetsOnNextMinute() {
        FakeClock rl = new FakeClock();
        assertTrue(rl.tryAcquire("e1", 2));
        assertTrue(rl.tryAcquire("e1", 2));
        assertFalse(rl.tryAcquire("e1", 2));
        rl.t += 60_000; // 다음 분
        assertTrue(rl.tryAcquire("e1", 2));
        assertTrue(rl.tryAcquire("e1", 2));
        assertFalse(rl.tryAcquire("e1", 2));
    }

    @Test
    void perKeyIndependent() {
        RateLimiter rl = new FakeClock();
        assertTrue(rl.tryAcquire("a", 1));
        assertFalse(rl.tryAcquire("a", 1));
        assertTrue(rl.tryAcquire("b", 1)); // 다른 키는 별도 카운트
    }
}
