// 외부 게이트웨이 엔드포인트. GET/POST /api/sample/{apiPath}. 동적 라우팅 + 4단 검증.
package ac.donga.dxapi.gateway;

import ac.donga.dxapi.common.ErrorCode;
import ac.donga.dxapi.common.TraceIdFilter;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/sample")
public class GatewayController {

    private static final Logger log = LoggerFactory.getLogger(GatewayController.class);

    private final GatewayService gatewayService;
    private final ObjectMapper objectMapper;

    public GatewayController(GatewayService gatewayService, ObjectMapper objectMapper) {
        this.gatewayService = gatewayService;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/{apiPath}")
    public ResponseEntity<GatewayResponse> get(@PathVariable String apiPath, HttpServletRequest req) {
        Map<String, Object> params = new HashMap<>();
        req.getParameterMap().forEach((k, v) -> params.put(k, v.length > 0 ? v[0] : null));
        return run(apiPath, "GET", params, req);
    }

    @PostMapping("/{apiPath}")
    public ResponseEntity<GatewayResponse> post(@PathVariable String apiPath,
                                                @RequestBody(required = false) String body,
                                                HttpServletRequest req) {
        return run(apiPath, "POST", parseBody(body), req);
    }

    private ResponseEntity<GatewayResponse> run(String apiPath, String method,
                                                Map<String, Object> params, HttpServletRequest req) {
        String certKey = req.getHeader("X-Cert-Key");
        String clientIp = clientIp(req);
        String traceId = TraceIdFilter.current();

        GatewayOutcome outcome;
        try {
            outcome = gatewayService.handle(apiPath, method, params, certKey, clientIp, traceId);
        } catch (Exception e) {
            // 게이트웨이는 인프라 오류에도 항상 게이트웨이 형태 + traceId 로 응답. 상세는 로그만(외부 비노출).
            log.error("gateway infra fail path={} traceId={}", apiPath, traceId, e);
            return ResponseEntity.status(ErrorCode.INTERNAL_ERROR.status())
                    .body(GatewayResponse.fail(ErrorCode.INTERNAL_ERROR.name(), null, traceId));
        }
        if (outcome.success()) {
            return ResponseEntity.ok(GatewayResponse.ok(outcome.data(), traceId));
        }
        return ResponseEntity.status(outcome.code().status())
                .body(GatewayResponse.fail(outcome.code().name(), outcome.detail(), traceId));
    }

    private Map<String, Object> parseBody(String body) {
        if (body == null || body.isBlank()) {
            return new HashMap<>();
        }
        try {
            return objectMapper.readValue(body, new TypeReference<Map<String, Object>>() {
            });
        } catch (Exception e) {
            return new HashMap<>();
        }
    }

    private String clientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String real = req.getHeader("X-Real-IP");
        if (real != null && !real.isBlank()) {
            return real;
        }
        return req.getRemoteAddr();
    }
}
