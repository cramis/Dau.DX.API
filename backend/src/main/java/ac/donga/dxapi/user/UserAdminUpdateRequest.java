// 관리자 사용자 변경 요청. role/status 만(둘 다 선택, 최소 1개). 05 계약 §3 PUT.
package ac.donga.dxapi.user;

public record UserAdminUpdateRequest(String role, String status) {
}
