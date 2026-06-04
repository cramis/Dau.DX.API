// 연계시스템 응답 DTO. mockup ExtSystem 필드명. certKey 는 마스킹 표기(disti-****-****-****).
package ac.donga.dxapi.extsystem;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ExtSystemResponse(
        String id,
        String name,
        String certKey,
        List<String> allowedIps,
        String useBegin,
        String useEnd,
        List<String> mappedApis,
        String picgName,
        String picgTel,
        String picgEmail,
        String remark,
        String status,
        Integer rateLmtPerMin
) {
}
