// 연계시스템 변경 요청. 모두 선택. 인증키는 별도 regenerate-key 로만 변경. 05 §6 PUT.
package ac.donga.dxapi.extsystem;

import java.util.List;

public record ExtSystemUpdateRequest(
        String name,
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
