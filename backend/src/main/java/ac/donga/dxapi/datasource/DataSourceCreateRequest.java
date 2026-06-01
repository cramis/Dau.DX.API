// 데이터소스 등록 요청. dbPassword 는 저장 시 DB_ENC_PW(현재 평문, C7 Vault 후속). 05 §5 POST.
package ac.donga.dxapi.datasource;

import jakarta.validation.constraints.NotBlank;

public record DataSourceCreateRequest(
        @NotBlank String name,
        @NotBlank String dbType,
        @NotBlank String jdbcUrl,
        @NotBlank String dbUser,
        @NotBlank String dbPassword,
        Integer poolMin,
        Integer poolMax,
        Integer queryTimeoutSec,
        String useYn
) {
}
