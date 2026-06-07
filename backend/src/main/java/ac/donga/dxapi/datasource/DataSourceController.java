// 데이터소스 관리 엔드포인트(ADMIN). GET/POST /api/datasources, GET/PUT/DELETE /{id}. 05 §5.
package ac.donga.dxapi.datasource;

import ac.donga.dxapi.auth.AuthPrincipal;
import ac.donga.dxapi.auth.AuthSupport;
import ac.donga.dxapi.auth.JwtAuthFilter;
import ac.donga.dxapi.common.ApiException;
import ac.donga.dxapi.common.ApiResponse;
import ac.donga.dxapi.common.BulkImportResult;
import ac.donga.dxapi.common.ErrorCode;
import ac.donga.dxapi.common.ItemsResponse;
import jakarta.validation.Valid;
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

@RestController
@RequestMapping("/api/datasources")
public class DataSourceController {

    private final DataSourceService service;
    private final SchemaService schemaService;

    public DataSourceController(DataSourceService service, SchemaService schemaService) {
        this.service = service;
        this.schemaService = schemaService;
    }

    @GetMapping
    public ApiResponse<ItemsResponse<DataSourceResponse>> list(
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdminOrAi(principal);
        ItemsResponse<DataSourceResponse> items = service.list();
        if (AuthSupport.isAi(principal)) {
            // AI 응답은 접속정보(jdbcUrl·dbUser) 제외 (02_AI초안등록_PRD §6, open-q K7).
            items = new ItemsResponse<>(items.items().stream()
                    .map(d -> new DataSourceResponse(d.id(), d.name(), d.dbType(), null, null,
                            d.poolMin(), d.poolMax(), d.queryTimeoutSec(), d.useYn()))
                    .toList());
        }
        return ApiResponse.ok(items);
    }

    // 스키마 메타 조회(ADMIN·AI). table 미지정 = 테이블 목록, 지정 = 컬럼 상세. AI 의 SQL 작성용.
    @GetMapping("/{id}/schema")
    public ApiResponse<?> schema(
            @PathVariable String id,
            @RequestParam(required = false) String table,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdminOrAi(principal);
        if (table == null || table.isBlank()) {
            return ApiResponse.ok(new ItemsResponse<>(schemaService.tables(id)));
        }
        return ApiResponse.ok(schemaService.columns(id, table));
    }

    @PostMapping
    public ApiResponse<DataSourceResponse> create(
            @Valid @RequestBody DataSourceCreateRequest req,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        return ApiResponse.ok(service.create(req, principal.userId()));
    }

    @PostMapping("/test-connection")
    public ApiResponse<TestConnectionResult> testConnection(
            @RequestBody TestConnectionRequest req,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        return ApiResponse.ok(service.testConnection(req));
    }

    @PostMapping("/import")
    public BulkImportResult importDataSources(
            @RequestParam(name = "dryRun", defaultValue = "false") boolean dryRun,
            @RequestBody DataSourceImportEnvelope env,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        if (env == null || env.version() == null || env.version() != 1
                || !"dataSource".equals(env.kind()) || env.items() == null || env.items().isEmpty()) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "envelope 형식 오류(version=1, kind=dataSource, items 필요)");
        }
        return service.bulkImport(env.items(), dryRun, principal.userId());
    }

    // 무중단 변경 영향도 — 이 DS 를 쓰는 API·연계시스템 목록(읽기).
    @GetMapping("/{id}/swap/impact")
    public ApiResponse<SwapImpact> swapImpact(
            @PathVariable String id,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        return ApiResponse.ok(service.swapImpact(id));
    }

    // 무중단 변경 실행 — 신규 접속 설정 교체 + graceful drain.
    @PostMapping("/{id}/swap/run")
    public ApiResponse<SwapResult> swapRun(
            @PathVariable String id,
            @RequestBody SwapRunRequest req,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        return ApiResponse.ok(service.swapExecute(id, req, principal.userId()));
    }

    @GetMapping("/{id}")
    public ApiResponse<DataSourceResponse> get(
            @PathVariable String id,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        return ApiResponse.ok(service.get(id));
    }

    @PutMapping("/{id}")
    public ApiResponse<DataSourceResponse> update(
            @PathVariable String id,
            @RequestBody DataSourceUpdateRequest req,
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
