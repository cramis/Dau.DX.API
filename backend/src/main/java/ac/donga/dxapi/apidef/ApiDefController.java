// API 정의 관리 엔드포인트(ADMIN). GET/POST /api/apis, GET/PUT/DELETE /{id}, GET /check-path. 05 §4.
package ac.donga.dxapi.apidef;

import ac.donga.dxapi.auth.AuthPrincipal;
import ac.donga.dxapi.auth.AuthSupport;
import ac.donga.dxapi.auth.JwtAuthFilter;
import ac.donga.dxapi.common.ApiResponse;
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

import java.util.Map;

@RestController
@RequestMapping("/api/apis")
public class ApiDefController {

    private final ApiDefService service;
    private final SqlValidationService sqlValidation;

    public ApiDefController(ApiDefService service, SqlValidationService sqlValidation) {
        this.service = service;
        this.sqlValidation = sqlValidation;
    }

    @GetMapping
    public ApiResponse<ItemsResponse<ApiDefResponse>> list(
            @RequestParam(required = false) String q,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        return ApiResponse.ok(service.list(q));
    }

    @PostMapping("/validate-sql")
    public ApiResponse<ValidateSqlResult> validateSql(
            @RequestBody ValidateSqlRequest req,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        return ApiResponse.ok(sqlValidation.validate(req.sql(), req.dataSrcId()));
    }

    @GetMapping("/check-path")
    public ApiResponse<Map<String, Boolean>> checkPath(
            @RequestParam String path,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        return ApiResponse.ok(Map.of("available", service.checkPath(path)));
    }

    @PostMapping
    public ApiResponse<ApiDefResponse> create(
            @Valid @RequestBody ApiDefSaveRequest req,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        return ApiResponse.ok(service.create(req, principal.userId()));
    }

    @GetMapping("/{id}")
    public ApiResponse<ApiDefResponse> get(
            @PathVariable String id,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        return ApiResponse.ok(service.get(id));
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
