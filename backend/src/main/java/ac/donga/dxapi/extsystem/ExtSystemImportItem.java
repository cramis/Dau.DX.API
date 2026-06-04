// 연계시스템 일괄 import 행. create 필드 + 식별자 id(누락 시 신규). 신규 insert 는 인증키 서버 자동발급(명시 키 미지원 — 후속).
package ac.donga.dxapi.extsystem;

import java.util.List;

public record ExtSystemImportItem(
        String id,
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
