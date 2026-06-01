// IP 화이트리스트(CIDR) 단위 테스트. 순수 로직, DB 불필요.
package ac.donga.dxapi.gateway;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class IpWhitelistCheckerTest {

    private final IpWhitelistChecker checker = new IpWhitelistChecker();

    @Test
    void inCidrRange() {
        assertTrue(checker.ipInCidr("10.0.0.5", "10.0.0.0/24"));
        assertTrue(checker.ipInCidr("192.168.1.255", "192.168.1.0/24"));
    }

    @Test
    void outOfCidrRange() {
        assertFalse(checker.ipInCidr("10.0.1.5", "10.0.0.0/24"));
        assertFalse(checker.ipInCidr("8.8.8.8", "10.0.0.0/8"));
    }

    @Test
    void singleHost32() {
        assertTrue(checker.ipInCidr("1.2.3.4", "1.2.3.4/32"));
        assertFalse(checker.ipInCidr("1.2.3.5", "1.2.3.4/32"));
    }

    @Test
    void localhostAlwaysAllowed() {
        assertTrue(checker.isAllowed("127.0.0.1", List.of()));
        assertTrue(checker.isAllowed("::1", List.of()));
        assertTrue(checker.isAllowed("0:0:0:0:0:0:0:1", List.of()));
    }

    @Test
    void allowedViaList() {
        assertTrue(checker.isAllowed("192.168.0.10", List.of("10.0.0.0/8", "192.168.0.0/24")));
        assertFalse(checker.isAllowed("203.0.113.1", List.of("10.0.0.0/8", "192.168.0.0/24")));
    }

    @Test
    void rejectsMalformed() {
        assertFalse(checker.ipInCidr("999.1.1.1", "10.0.0.0/24"));
        assertFalse(checker.ipInCidr("10.0.0.5", "garbage"));
    }
}
