// 게이트웨이/관리 API 공통 에러 코드. 05_api_연결목록 §0 정의와 1:1. HTTP 상태 매핑 포함.
package ac.donga.dxapi.common;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    INVALID_INPUT(HttpStatus.BAD_REQUEST),
    MISSING_PARAM(HttpStatus.BAD_REQUEST),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED),
    FORBIDDEN(HttpStatus.FORBIDDEN),
    USER_NOT_ACTIVE(HttpStatus.FORBIDDEN),
    NOT_FOUND(HttpStatus.NOT_FOUND),
    ID_EXISTS(HttpStatus.CONFLICT),
    PATH_EXISTS(HttpStatus.CONFLICT),
    NAME_EXISTS(HttpStatus.CONFLICT),
    CANNOT_UPDATE_SELF(HttpStatus.CONFLICT),
    IN_USE(HttpStatus.CONFLICT),
    INVALID_CERT_KEY(HttpStatus.UNAUTHORIZED),
    EXT_SYSTEM_INACTIVE(HttpStatus.FORBIDDEN),
    IP_NOT_ALLOWED(HttpStatus.FORBIDDEN),
    OUT_OF_PERIOD(HttpStatus.FORBIDDEN),
    API_NOT_MAPPED(HttpStatus.FORBIDDEN),
    API_NOT_FOUND(HttpStatus.NOT_FOUND),
    API_NOT_ACTIVE(HttpStatus.FORBIDDEN),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR);

    private final HttpStatus status;

    ErrorCode(HttpStatus status) {
        this.status = status;
    }

    public HttpStatus status() {
        return status;
    }
}
