// 승인 엔드포인트(ADMIN). user/api 별 목록 + 승인/반려. 05 §7.
package ac.donga.dxapi.approval;

import ac.donga.dxapi.auth.AuthPrincipal;
import ac.donga.dxapi.auth.AuthSupport;
import ac.donga.dxapi.auth.JwtAuthFilter;
import ac.donga.dxapi.common.ApiResponse;
import ac.donga.dxapi.common.ItemsResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/approvals")
public class ApprovalController {

    private final ApprovalService service;

    public ApprovalController(ApprovalService service) {
        this.service = service;
    }

    @GetMapping("/user")
    public ApiResponse<ItemsResponse<ApprovalResponse>> listUser(
            @RequestParam(required = false) String status,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        return ApiResponse.ok(service.listUser(status));
    }

    @GetMapping("/api")
    public ApiResponse<ItemsResponse<ApprovalResponse>> listApi(
            @RequestParam(required = false) String status,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        return ApiResponse.ok(service.listApi(status));
    }

    @PostMapping("/user/{seq}/approve")
    public ApiResponse<ApprovalResponse> approveUser(
            @PathVariable long seq,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        return ApiResponse.ok(service.approveUser(seq, principal.userId()));
    }

    @PostMapping("/user/{seq}/reject")
    public ApiResponse<ApprovalResponse> rejectUser(
            @PathVariable long seq,
            @RequestBody(required = false) RejectRequest req,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        return ApiResponse.ok(service.rejectUser(seq, principal.userId(), req == null ? null : req.reason()));
    }

    @PostMapping("/api/{seq}/approve")
    public ApiResponse<ApprovalResponse> approveApi(
            @PathVariable long seq,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        return ApiResponse.ok(service.approveApi(seq, principal.userId()));
    }

    @PostMapping("/api/{seq}/reject")
    public ApiResponse<ApprovalResponse> rejectApi(
            @PathVariable long seq,
            @RequestBody(required = false) RejectRequest req,
            @RequestAttribute(name = JwtAuthFilter.ATTR, required = false) AuthPrincipal principal) {
        AuthSupport.requireAdmin(principal);
        return ApiResponse.ok(service.rejectApi(seq, principal.userId(), req == null ? null : req.reason()));
    }
}
