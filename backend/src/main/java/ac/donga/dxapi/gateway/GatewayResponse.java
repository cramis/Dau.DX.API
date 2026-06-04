// 게이트웨이 응답 형태. { ok, data?, code?, detail?, traceId }. 05 §10.
package ac.donga.dxapi.gateway;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record GatewayResponse(boolean ok, Object data, String code, String detail, String traceId) {

    public static GatewayResponse ok(Object data, String traceId) {
        return new GatewayResponse(true, data, null, null, traceId);
    }

    public static GatewayResponse fail(String code, String detail, String traceId) {
        return new GatewayResponse(false, null, code, detail, traceId);
    }
}
