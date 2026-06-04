// 연계시스템 관리 엔드포인트(ADMIN). GET/POST /api/ext-systems, GET/PUT/DELETE /{id}, POST /{id}/regenerate-key. 05 §6.
package ac.donga.dxapi.extsystem;

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
@RequestMapping("/api/ext-systems")
public class ExtSystemController {

    private final ExtSystemService service;

    public ExtSystemController(ExtSystemService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<ItemsResponse<ExtSystemResponse>> list(
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        return ApiResponse.ok(service.list());
    }

    @PostMapping
    public ApiResponse<ExtSystemCreateResponse> create(
            @Valid @RequestBody ExtSystemCreateRequest req,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        return ApiResponse.ok(service.create(req, principal.userId()));
    }

    @PostMapping("/import")
    public BulkImportResult importExtSystems(
            @RequestParam(name = "dryRun", defaultValue = "false") boolean dryRun,
            @RequestBody ExtSystemImportEnvelope env,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        if (env == null || env.version() == null || env.version() != 1
                || !"extSystem".equals(env.kind()) || env.items() == null || env.items().isEmpty()) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "envelope 형식 오류(version=1, kind=extSystem, items 필요)");
        }
        return service.bulkImport(env.items(), dryRun, principal.userId());
    }

    @GetMapping("/{id}")
    public ApiResponse<ExtSystemResponse> get(
            @PathVariable String id,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        return ApiResponse.ok(service.get(id));
    }

    @PutMapping("/{id}")
    public ApiResponse<ExtSystemResponse> update(
            @PathVariable String id,
            @RequestBody ExtSystemUpdateRequest req,
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

    @PostMapping("/{id}/regenerate-key")
    public ApiResponse<FreshKeyResponse> regenerateKey(
            @PathVariable String id,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        return ApiResponse.ok(service.regenerateKey(id, principal.userId()));
    }
}
