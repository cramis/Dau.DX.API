// 운영 메타 엔드포인트. /api/_ops/healthz (LB liveness), /api/_ops/version (배포 식별).
package ac.donga.dxapi.ops;

import ac.donga.dxapi.common.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/_ops")
public class OpsController {

    private final VersionInfo versionInfo;

    public OpsController(VersionInfo versionInfo) {
        this.versionInfo = versionInfo;
    }

    @GetMapping("/healthz")
    public ApiResponse<Map<String, String>> healthz() {
        return ApiResponse.ok(Map.of("status", "UP"));
    }

    @GetMapping("/version")
    public ApiResponse<Map<String, String>> version() {
        Map<String, String> v = new LinkedHashMap<>();
        v.put("build", versionInfo.build());
        v.put("commit", versionInfo.commit());
        v.put("env", versionInfo.env());
        v.put("startedAt", versionInfo.startedAt().toString());
        return ApiResponse.ok(v);
    }
}
