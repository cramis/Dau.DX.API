// SQL 검증 요청. dataSrcId 지정 시 해당 DS 에 prepare 로 실검증, 미지정 시 정적 검사. method 로 SQL 정책 적용. 05 §4 P2.
package ac.donga.dxapi.apidef;

public record ValidateSqlRequest(String sql, String dataSrcId, String method) {
}
