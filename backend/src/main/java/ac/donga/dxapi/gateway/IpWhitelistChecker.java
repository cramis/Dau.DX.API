// IP 화이트리스트 검사(IPv4 CIDR). localhost 는 시연 편의로 허용. 05 §10 2단계.
package ac.donga.dxapi.gateway;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class IpWhitelistChecker {

    public boolean isAllowed(String ip, List<String> cidrs) {
        if (isLocalhost(ip)) {
            return true;
        }
        for (String cidr : cidrs) {
            if (ipInCidr(ip, cidr)) {
                return true;
            }
        }
        return false;
    }

    private boolean isLocalhost(String ip) {
        return "127.0.0.1".equals(ip) || "::1".equals(ip)
                || "0:0:0:0:0:0:0:1".equals(ip)   // IPv6 loopback 확장 표기 (Tomcat 로컬 연결)
                || "::ffff:127.0.0.1".equals(ip);
    }

    boolean ipInCidr(String ip, String cidr) {
        long target = parseIpv4(ip);
        if (target < 0) {
            return false;
        }
        String[] parts = cidr.split("/");
        long base = parseIpv4(parts[0]);
        if (base < 0) {
            return false;
        }
        int bits;
        try {
            bits = parts.length > 1 ? Integer.parseInt(parts[1].trim()) : 32;
        } catch (NumberFormatException e) {
            return false;
        }
        if (bits < 0 || bits > 32) {
            return false;
        }
        if (bits == 0) {
            return true;
        }
        long mask = (0xFFFFFFFFL << (32 - bits)) & 0xFFFFFFFFL;
        return (target & mask) == (base & mask);
    }

    private long parseIpv4(String ip) {
        String[] o = ip.split("\\.");
        if (o.length != 4) {
            return -1;
        }
        long v = 0;
        for (String s : o) {
            int n;
            try {
                n = Integer.parseInt(s.trim());
            } catch (NumberFormatException e) {
                return -1;
            }
            if (n < 0 || n > 255) {
                return -1;
            }
            v = (v << 8) | n;
        }
        return v;
    }
}
