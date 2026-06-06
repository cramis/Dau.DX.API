// dev Oracle 일회용 마이그레이션 — role 'AI' additive (CK_USR_USER_ROLE 재생성 + EZ_CODE 1행). 멱등. 적용 후 폴더 삭제.
// 2026-06-06 작성 시점 dev Oracle(168.115.36.230) 네트워크 불가로 미적용 — 사내망에서 실행할 것.
// 실행:
//   $env:JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"
//   & "$env:JAVA_HOME\bin\java.exe" -cp <gradle캐시 ojdbc11-23.7.x jar> backend\db\migrate\Migrate.java
// AI 계정(ai-mcp01)은 이후 백엔드를 DXAPI_SEED_ENABLED=true 로 부팅하면 LocalDataSeeder 가 멱등 시드.
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class Migrate {
    public static void main(String[] args) throws Exception {
        String url = "jdbc:oracle:thin:@//168.115.36.230:1521/DEVORA19";
        try (Connection c = DriverManager.getConnection(url, "dx", "xowh1392");
             Statement st = c.createStatement()) {
            c.setAutoCommit(false);

            // 1. CHECK 제약 — 현재 정의 확인 후 'AI' 포함 아니면 재생성 (멱등)
            boolean hasAi = false;
            try (ResultSet rs = st.executeQuery(
                    "SELECT SEARCH_CONDITION FROM USER_CONSTRAINTS WHERE CONSTRAINT_NAME = 'CK_USR_USER_ROLE'")) {
                if (rs.next()) {
                    String cond = rs.getString(1);
                    hasAi = cond != null && cond.contains("'AI'");
                } else {
                    System.out.println("CK_USR_USER_ROLE 미존재 — 신규 추가");
                }
            }
            if (hasAi) {
                System.out.println("CHECK 이미 'AI' 포함 — 생략");
            } else {
                try {
                    st.execute("ALTER TABLE DXAPI_USR_USER_M DROP CONSTRAINT CK_USR_USER_ROLE");
                } catch (Exception e) {
                    System.out.println("DROP 생략: " + e.getMessage());
                }
                st.execute("ALTER TABLE DXAPI_USR_USER_M ADD CONSTRAINT CK_USR_USER_ROLE CHECK (ROLE_DVCD IN ('ADMIN','USER','AI'))");
                System.out.println("CHECK 재생성 완료 (ADMIN/USER/AI)");
            }

            // 2. EZ_CODE ROLE_DVCD 'AI' (멱등)
            try (ResultSet rs = st.executeQuery(
                    "SELECT COUNT(*) FROM DXAPI_EZ_CODE_M WHERE CLA_DVCD='ROLE_DVCD' AND CD='AI'")) {
                rs.next();
                if (rs.getInt(1) == 0) {
                    st.execute("INSERT INTO DXAPI_EZ_CODE_M (CLA_DVCD, CD, CD_NM, SORT_SEQ, DESC_TEXT) " +
                            "VALUES ('ROLE_DVCD','AI','AI 서비스계정',3,'MCP 도구용. API 초안(DRAFT) 생성·메타 조회 전용. 활성화 권한 없음.')");
                    System.out.println("EZ_CODE ROLE_DVCD=AI 추가");
                } else {
                    System.out.println("EZ_CODE 이미 존재 — 생략");
                }
            }

            c.commit();
            System.out.println("MIGRATION OK");
        }
    }
}
