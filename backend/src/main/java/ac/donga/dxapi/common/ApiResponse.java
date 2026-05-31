// 공통 API 응답 래퍼. 성공 {ok:true,data}, 실패 {ok:false,message,issues}. 05 계약 §0 형태.
package ac.donga.dxapi.common;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(boolean ok, T data, String message, Object issues) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null, null);
    }

    public static ApiResponse<Void> fail(ErrorCode code) {
        return new ApiResponse<>(false, null, code.name(), null);
    }

    public static ApiResponse<Void> fail(ErrorCode code, Object issues) {
        return new ApiResponse<>(false, null, code.name(), issues);
    }
}
