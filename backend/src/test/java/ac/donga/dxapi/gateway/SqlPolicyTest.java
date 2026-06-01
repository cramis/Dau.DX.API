// 등록 SQL 안전 정책 단위 테스트. 순수 로직, DB 불필요. C4.
package ac.donga.dxapi.gateway;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SqlPolicyTest {

    @Test
    void readAllowsSelectAndWith() {
        assertTrue(SqlPolicy.check("SELECT a FROM t WHERE id = #{id}", false).allowed());
        assertTrue(SqlPolicy.check("WITH c AS (SELECT 1 FROM dual) SELECT * FROM c", false).allowed());
    }

    @Test
    void readRejectsWrite() {
        assertFalse(SqlPolicy.check("INSERT INTO t(a) VALUES (#{a})", false).allowed());
        assertFalse(SqlPolicy.check("UPDATE t SET a=#{a}", false).allowed());
    }

    @Test
    void writeAllowsDmlAndCall() {
        assertTrue(SqlPolicy.check("INSERT INTO grade(user_id) VALUES (#{id})", true).allowed());
        assertTrue(SqlPolicy.check("UPDATE t SET a=#{a} WHERE id=#{id}", true).allowed());
        assertTrue(SqlPolicy.check("MERGE INTO t USING dual ON (1=1) WHEN MATCHED THEN UPDATE SET a=#{a}", true).allowed());
        assertTrue(SqlPolicy.check("CALL sp_send_notification(#{userId}, #{message})", true).allowed());
    }

    @Test
    void deleteAlwaysDenied() {
        assertFalse(SqlPolicy.check("DELETE FROM t WHERE id=#{id}", true).allowed());
        assertFalse(SqlPolicy.check("DELETE FROM t WHERE id=#{id}", false).allowed());
    }

    @Test
    void ddlDenied() {
        assertFalse(SqlPolicy.check("DROP TABLE t", true).allowed());
        assertFalse(SqlPolicy.check("TRUNCATE TABLE t", true).allowed());
        assertFalse(SqlPolicy.check("ALTER TABLE t ADD c NUMBER", true).allowed());
        assertFalse(SqlPolicy.check("GRANT SELECT ON t TO u", true).allowed());
    }

    @Test
    void multiStatementDenied() {
        assertFalse(SqlPolicy.check("SELECT 1 FROM dual; DROP TABLE t", false).allowed());
        assertFalse(SqlPolicy.check("SELECT 1 FROM dual; DELETE FROM t", true).allowed());
    }

    @Test
    void trailingSemicolonAllowed() {
        assertTrue(SqlPolicy.check("SELECT 1 FROM dual;", false).allowed());
    }

    @Test
    void commentTrickDenied() {
        // 주석으로 위장한 다중문/DDL 도 주석 제거 후 평가.
        assertFalse(SqlPolicy.check("SELECT 1 FROM dual /* x */ ; DROP TABLE t", false).allowed());
    }

    @Test
    void stringLiteralWithKeywordAllowed() {
        // 문자열 안의 'DROP' 은 키워드 아님 → 허용.
        assertTrue(SqlPolicy.check("SELECT 'DROP TABLE' AS note FROM dual", false).allowed());
    }

    @Test
    void dangerousPackageDenied() {
        assertFalse(SqlPolicy.check("CALL DBMS_SCHEDULER.create_job(#{j})", true).allowed());
        assertFalse(SqlPolicy.check("SELECT UTL_HTTP.request(#{u}) FROM dual", false).allowed());
    }

    @Test
    void emptyDenied() {
        assertFalse(SqlPolicy.check("", false).allowed());
        assertFalse(SqlPolicy.check(null, false).allowed());
        assertFalse(SqlPolicy.check("   ", true).allowed());
    }
}
