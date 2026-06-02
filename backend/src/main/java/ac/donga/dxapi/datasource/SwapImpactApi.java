// hot-swap 영향도 — 이 데이터소스를 쓰는 API 1건(읽기 전용). 컬럼 alias 로 매핑(no/name/path/status).
package ac.donga.dxapi.datasource;

public record SwapImpactApi(String no, String name, String path, String status) {
}
