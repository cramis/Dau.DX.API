// 연계시스템 등록 요청. 인증키는 서버가 생성(요청에 없음). 05 §6 POST.
package ac.donga.dxapi.extsystem;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record ExtSystemCreateRequest(
        @NotBlank String name,
        List<String> allowedIps,
        @NotBlank String useBegin,
        @NotBlank String useEnd,
        List<String> mappedApis,
        String picgName,
        String picgTel,
        String picgEmail,
        String remark,
        String status,
        Integer rateLmtPerMin
) {
}
