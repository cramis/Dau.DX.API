// 연계시스템 등록 응답. 생성된 시스템 + 평문 인증키(1회 노출). 05 §6.
package ac.donga.dxapi.extsystem;

public record ExtSystemCreateResponse(ExtSystemResponse extSystem, String freshCertKey) {
}
