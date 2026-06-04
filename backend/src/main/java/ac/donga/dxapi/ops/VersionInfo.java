// 빌드/커밋/기동시각 정보 보유 빈. /api/_ops/version 응답 소스. 값은 app.* 프로퍼티·env override.
package ac.donga.dxapi.ops;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class VersionInfo {

    private final String build;
    private final String commit;
    private final String env;
    private final Instant startedAt = Instant.now();

    public VersionInfo(@Value("${app.version:unknown}") String build,
                       @Value("${app.commit:unknown}") String commit,
                       Environment environment) {
        this.build = build;
        this.commit = commit;
        // 활성 프로필이 곧 배포 환경(local/dev/prod). 미지정 시 default 프로필(application.yml=local).
        String[] active = environment.getActiveProfiles();
        String[] profiles = active.length > 0 ? active : environment.getDefaultProfiles();
        this.env = profiles.length > 0 ? profiles[0] : "unknown";
    }

    public String build() {
        return build;
    }

    public String commit() {
        return commit;
    }

    public String env() {
        return env;
    }

    public Instant startedAt() {
        return startedAt;
    }
}
