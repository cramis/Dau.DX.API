// SQL 검증 결과. valid=유효 여부, plan=요약(verb·bind·검증방식), message=오류 메시지(무효 시). 05 §4 P2.
package ac.donga.dxapi.apidef;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ValidateSqlResult(boolean valid, String plan, String message) {
}
