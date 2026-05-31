// 전역 예외 → 공통 ApiResponse 변환. ApiException / 입력검증오류 / 그 외를 HTTP 상태에 매핑.
package ac.donga.dxapi.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiResponse<Void>> handleApi(ApiException e) {
        return ResponseEntity.status(e.code().status())
                .body(ApiResponse.fail(e.code(), e.issues()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException e) {
        Map<String, String> issues = new HashMap<>();
        e.getBindingResult().getFieldErrors()
                .forEach(fe -> issues.put(fe.getField(), fe.getDefaultMessage()));
        return ResponseEntity.status(ErrorCode.INVALID_INPUT.status())
                .body(ApiResponse.fail(ErrorCode.INVALID_INPUT, issues));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleEtc(Exception e) {
        log.error("unhandled exception", e);
        return ResponseEntity.status(ErrorCode.INTERNAL_ERROR.status())
                .body(ApiResponse.fail(ErrorCode.INTERNAL_ERROR));
    }
}
