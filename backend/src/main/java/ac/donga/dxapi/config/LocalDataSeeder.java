// 로컬 데모 사용자 시드(bcrypt). Oracle 확보 시 app.seed.enabled=true 로 켜면 빈 USER 테이블에 3명 주입.
// DB 미기동/비어있지 않음/비활성이면 조용히 no-op (부팅 절대 실패시키지 않음).
package ac.donga.dxapi.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Profile("local")
public class LocalDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(LocalDataSeeder.class);

    private record SeedUser(String id, String pw, String name, String hp, String email,
                            String org, String dept, String role, String status) {
    }

    // mockup/lib/mockData.ts 의 users 시드와 동일.
    private static final List<SeedUser> USERS = List.of(
            new SeedUser("admin01", "admin01!", "관리자", "010-1111-2222", "admin01@donga.ac.kr",
                    "동아대학교", "정보전산원", "ADMIN", "ACTIVE"),
            new SeedUser("user01", "user01!", "홍길동", "010-3333-4444", "user01@donga.ac.kr",
                    "동아대학교", "학사지원처", "USER", "ACTIVE"),
            new SeedUser("user02", "user02!", "김신청", "010-5555-6666", "pending@donga.ac.kr",
                    "동아대학교", "교무처", "USER", "PENDING")
    );

    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    private final boolean enabled;

    public LocalDataSeeder(JdbcTemplate jdbc, PasswordEncoder encoder,
                           @Value("${app.seed.enabled:false}") boolean enabled) {
        this.jdbc = jdbc;
        this.encoder = encoder;
        this.enabled = enabled;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            return;
        }
        try {
            Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM DXAPI_USR_USER_M", Integer.class);
            if (count != null && count > 0) {
                log.info("LocalDataSeeder: 사용자 {}명 이미 존재 — 시드 생략", count);
                return;
            }
            for (SeedUser u : USERS) {
                jdbc.update("""
                        INSERT INTO DXAPI_USR_USER_M
                          (USER_ID, PW_HASH, USER_NM, HP_NO, EMAIL, ORG_NM, DEPT_NM, ROLE_DVCD, STTUS_DVCD, REGID)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'seed')
                        """,
                        u.id(), encoder.encode(u.pw()), u.name(), u.hp(), u.email(),
                        u.org(), u.dept(), u.role(), u.status());
            }
            log.info("LocalDataSeeder: 데모 사용자 {}명 시드 완료", USERS.size());
        } catch (Exception e) {
            log.warn("LocalDataSeeder: 시드 생략 (DB 미연결 또는 스키마 부재) — {}", e.getMessage());
        }
    }
}
