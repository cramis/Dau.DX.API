// 로그인 요청. { id, password }. 05 계약 §1.
package ac.donga.dxapi.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank String id,
        @NotBlank String password
) {
}
