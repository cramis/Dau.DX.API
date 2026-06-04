// 인증키 재발급 응답. 평문 키 1회 노출. 05 §6 regenerate-key.
package ac.donga.dxapi.extsystem;

public record FreshKeyResponse(String freshCertKey) {
}
