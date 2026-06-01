// 비즈니스 예외. ErrorCode 와 선택적 issues 를 실어 GlobalExceptionHandler 가 응답으로 변환.
package ac.donga.dxapi.common;

public class ApiException extends RuntimeException {

    private final ErrorCode code;
    private final transient Object issues;

    public ApiException(ErrorCode code) {
        this(code, null);
    }

    public ApiException(ErrorCode code, Object issues) {
        super(code.name());
        this.code = code;
        this.issues = issues;
    }

    public ErrorCode code() {
        return code;
    }

    public Object issues() {
        return issues;
    }
}
