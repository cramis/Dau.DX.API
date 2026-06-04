// 데이터소스 연결 테스트 요청. 저장 전 입력값으로 실제 JDBC 연결을 시도한다. 05 §5 P2.
package ac.donga.dxapi.datasource;

public record TestConnectionRequest(
        String jdbcUrl,
        String dbUser,
        String dbPassword,
        String dbType
) {
}
