// API 정의 관리 엔드포인트(ADMIN). GET/POST /api/apis, GET/PUT/DELETE /{id}, GET /check-path. 05 §4.
package ac.donga.dxapi.apidef;

import ac.donga.dxapi.auth.AuthPrincipal;
import ac.donga.dxapi.auth.AuthSupport;
import ac.donga.dxapi.auth.JwtAuthFilter;
import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ApiResponse;
import ac.donga.dxapi.common.BulkImportResult;
import ac.donga.dxapi.common.ErrorCode;
import ac.donga.dxapi.common.ItemsResponse;
import ac.donga.dxapi.gateway.RateLimiter;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/apis")
public class ApiDefController {

    private final ApiDefService service;
    private final SqlValidationService sqlValidation;
    private final TestRunService testRun;
    private final RateLimiter rateLimiter;
    private final int aiCreatePerMin;
    private final int testRunPerMin;

    public ApiDefController(ApiDefService service, SqlValidationService sqlValidation, TestRunService testRun,
                            RateLimiter rateLimiter,
                            @Value("${app.ai.create-per-min:10}") int aiCreatePerMin,
                            @Value("${app.test-run.per-min:30}") int testRunPerMin) {
        this.service = service;
        this.sqlValidation = sqlValidation;
        this.testRun = testRun;
        this.rateLimiter = rateLimiter;
        this.aiCreatePerMin = aiCreatePerMin;
        this.testRunPerMin = testRunPerMin;
    }

    // AI(MCP) 허용 표면 = list/get(자기 건만)·validate-sql·check-path·create(DRAFT 강제). 02_AI초안등록_PRD §6.
    @GetMapping
    public ApiResponse<ItemsResponse<ApiDefResponse>> list(
            @RequestParam(required = false) String q,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdminOrAi(principal);
        return ApiResponse.ok(service.list(q, AuthSupport.isAi(principal) ? principal.userId() : null));
    }

    @PostMapping("/validate-sql")
    public ApiResponse<ValidateSqlResult> validateSql(
            @RequestBody ValidateSqlRequest req,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdminOrAi(principal);
        return ApiResponse.ok(sqlValidation.validate(req.sql(), req.dataSrcId(), req.method()));
    }

    // 테스트 실행(ad-hoc, ADMIN 전용 — AI 불허 L5). DML 은 실행 후 롤백. 이력 미적재. 03_API테스트실행_PRD §6.
    @PostMapping("/test-run")
    public ApiResponse<TestRunResult> testRun(
            @Valid @RequestBody TestRunRequest req,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        if (!rateLimiter.tryAcquire("test-run:" + principal.userId(), testRunPerMin)) {
            throw new ApiException(ErrorCode.RATE_LIMITED, "테스트 실행 분당 한도 초과(" + testRunPerMin + ")");
        }
        return ApiResponse.ok(testRun.run(req, principal.userId()));
    }

    @GetMapping("/check-path")
    public ApiResponse<Map<String, Boolean>> checkPath(
            @RequestParam String path,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdminOrAi(principal);
        return ApiResponse.ok(Map.of("available", service.checkPath(path)));
    }

    @PostMapping
    public ApiResponse<ApiDefResponse> create(
            @Valid @RequestBody ApiDefSaveRequest req,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdminOrAi(principal);
        boolean ai = AuthSupport.isAi(principal);
        if (ai && !rateLimiter.tryAcquire("ai-create:" + principal.userId(), aiCreatePerMin)) {
            throw new ApiException(ErrorCode.RATE_LIMITED, "AI 생성 분당 한도 초과(" + aiCreatePerMin + ")");
        }
        return ApiResponse.ok(service.create(req, principal.userId(), ai));
    }

    // 일괄 가져오기(upsert). top-level {ok,dryRun,summary,results} 직접 반환(FE 모달 계약).
    @PostMapping("/import")
    public BulkImportResult importApis(
            @RequestParam(name = "dryRun", defaultValue = "false") boolean dryRun,
            @RequestBody ApiImportEnvelope env,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        if (env == null || env.version() == null || env.version() != 1
                || !"api".equals(env.kind()) || env.items() == null || env.items().isEmpty()) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "envelope 형식 오류(version=1, kind=api, items 필요)");
        }
        return service.bulkImport(env.items(), dryRun, principal.userId());
    }

    @GetMapping("/{id}")
    public ApiResponse<ApiDefResponse> get(
            @PathVariable String id,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdminOrAi(principal);
        return ApiResponse.ok(service.get(id, AuthSupport.isAi(principal) ? principal.userId() : null));
    }

    @PutMapping("/{id}")
    public ApiResponse<ApiDefResponse> update(
            @PathVariable String id,
            @Valid @RequestBody ApiDefSaveRequest req,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        return ApiResponse.ok(service.update(id, req, principal.userId()));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(
            @PathVariable String id,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        service.delete(id);
        return ApiResponse.<Void>ok(null);
    }
}
