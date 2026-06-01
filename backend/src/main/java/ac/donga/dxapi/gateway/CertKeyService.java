// 인증키 해시. 평문 cert-key 를 HMAC-SHA256(서버비밀) hex 로 변환. C1 결정. 평문은 저장 안 함.
package ac.donga.dxapi.gateway;

import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.HexFormat;

@Service
public class CertKeyService {

    private static final char[] HEX = "0123456789ABCDEF".toCharArray();

    private final byte[] secret;
    private final SecureRandom random = new SecureRandom();

    public CertKeyService(GatewayProperties props) {
        this.secret = props.certHmacSecret().getBytes(StandardCharsets.UTF_8);
    }

    /** 평문 인증키 생성. AKAD<ID끝4자>-XXXXXXXX-YYYYYYYY-ZZZZZZZZ. 발급 시 1회만 노출. */
    public String generate(String extId) {
        String tail = extId.length() >= 4 ? extId.substring(extId.length() - 4) : "0000";
        return "AKAD" + tail + "-" + hex(8) + "-" + hex(8) + "-" + hex(8);
    }

    private String hex(int n) {
        StringBuilder sb = new StringBuilder(n);
        for (int i = 0; i < n; i++) {
            sb.append(HEX[random.nextInt(16)]);
        }
        return sb.toString();
    }

    public String hash(String plainCertKey) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            byte[] out = mac.doFinal(plainCertKey.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(out);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HMAC 계산 실패", e);
        }
    }

    /** 화면 표시·검색용 식별내용(평문 앞 8자). */
    public String disti(String plainCertKey) {
        return plainCertKey.length() <= 8 ? plainCertKey : plainCertKey.substring(0, 8);
    }
}
