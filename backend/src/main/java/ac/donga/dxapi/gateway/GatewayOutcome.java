// 게이트웨이 처리 결과. code==null 이면 성공(data), 아니면 실패(code+detail).
package ac.donga.dxapi.gateway;

import ac.donga.dxapi.common.ErrorCode;

public record GatewayOutcome(ErrorCode code, String detail, Object data) {

    public static GatewayOutcome ok(Object data) {
        return new GatewayOutcome(null, null, data);
    }

    public static GatewayOutcome fail(ErrorCode code, String detail) {
        return new GatewayOutcome(code, detail, null);
    }

    public boolean success() {
        return code == null;
    }
}
