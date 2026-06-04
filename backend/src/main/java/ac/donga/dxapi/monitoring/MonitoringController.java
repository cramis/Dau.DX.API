// 모니터링 엔드포인트(ADMIN). GET /api/monitoring/stats · /history. 05 §8.
package ac.donga.dxapi.monitoring;

import ac.donga.dxapi.auth.AuthPrincipal;
import ac.donga.dxapi.auth.JwtAuthFilter;
import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ApiResponse;
import ac.donga.dxapi.common.ErrorCode;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/monitoring")
public class MonitoringController {

    private final MonitoringService monitoringService;

    public MonitoringController(MonitoringService monitoringService) {
        this.monitoringService = monitoringService;
    }

    @GetMapping("/stats")
    public ApiResponse<StatsResult> stats(
            @RequestParam(defaultValue = "60") int windowMin,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        requireAdmin(principal);
        return ApiResponse.ok(monitoringService.stats(windowMin));
    }

    @GetMapping("/history")
    public ApiResponse<HistoryResponse> history(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Integer statusCode,
            @RequestParam(required = false) String apiNo,
            @RequestParam(required = false) String extSysId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "200") int limit,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        requireAdmin(principal);
        return ApiResponse.ok(monitoringService.history(
                q, statusCode, apiNo, extSysId, parseDt(from), parseDt(to), limit));
    }

    private void requireAdmin(AuthPrincipal principal) {
        if (principal == null) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
        if (!"ADMIN".equals(principal.role())) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
    }

    private LocalDateTime parseDt(String iso) {
        if (iso == null || iso.isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(iso);
        } catch (Exception e) {
            return null;
        }
    }
}
