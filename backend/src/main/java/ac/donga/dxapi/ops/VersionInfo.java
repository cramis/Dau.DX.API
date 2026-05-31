// 빌드/커밋/기동시각 정보 보유 빈. /api/_ops/version 응답 소스. 값은 app.* 프로퍼티·env override.
package ac.donga.dxapi.ops;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class VersionInfo {

    private final String build;
    private final String commit;
    private final Instant startedAt = Instant.now();

    public VersionInfo(@Value("${app.version:unknown}") String build,
                       @Value("${app.commit:unknown}") String commit) {
        this.build = build;
        this.commit = commit;
    }

    public String build() {
        return build;
    }

    public String commit() {
        return commit;
    }

    public Instant startedAt() {
        return startedAt;
    }
}
