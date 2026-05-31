# backend/db — Oracle MetaDB 부트스트랩 (확보 즉시 가동)

Oracle 19c MetaDB 가 준비되면 **이 순서대로** 실행하면 backend 가 곧장 실 DB 로 동작한다. 코드는 이미 완성돼 있고, 남은 건 DB 에 스키마+데이터를 넣고 앱을 연결하는 것뿐이다.

## 파일

| 파일 | 역할 | 실행 권한 |
|---|---|---|
| `../../doc/Dau.DX.API_개발계획/07_DBA_DDL.sql` | 테이블스페이스·DXAPI 사용자·14테이블 DDL | DBA (SYS/SYSTEM) |
| `seed-codes.sql` | 공통 코드(DXAPI_EZ_CODE_M) | DXAPI |
| `seed-meta.sql` | 데이터소스·API·연계시스템·승인 데모 데이터 | DXAPI |
| 사용자(admin01/user01/user02) | `LocalDataSeeder` 가 앱 기동 시 bcrypt 로 주입 | 앱 (`DXAPI_SEED_ENABLED=true`) |

> 사용자 비밀번호는 SQL 에 두지 않는다. bcrypt 해시를 코드가 런타임에 생성(`LocalDataSeeder`)하므로 항상 정확하다.

---

## A. Docker 로 로컬 Oracle 띄우기

> ⚠️ `docker-compose.yml` 은 Docker 미설치 환경에서 작성돼 **미검증**. Docker Desktop 설치 후 아래를 따르되, 안 되면 §B(사내 Oracle)로 가라.

```powershell
# 1. Oracle Free 컨테이너 기동 (최초 1회는 DB 생성에 수 분)
docker compose up -d
docker compose logs -f oracle    # "DATABASE IS READY TO USE" 까지 대기

# 2. DDL (DBA 로 실행 — DXAPI 사용자/테이블 생성)
docker exec -it dxapi-oracle sqlplus system/oracle@//localhost:1521/FREEPDB1 @/db/07_DBA_DDL.sql

# 3. 코드/메타 시드 (DXAPI 로 실행)
docker exec -it dxapi-oracle sqlplus DXAPI/<DDL에서_설정한_PW>@//localhost:1521/FREEPDB1 @/db/seed-codes.sql
docker exec -it dxapi-oracle sqlplus DXAPI/<DDL에서_설정한_PW>@//localhost:1521/FREEPDB1 @/db/seed-meta.sql
```

기본 접속 정보. `jdbc:oracle:thin:@localhost:1521/FREEPDB1`, 사용자 `DXAPI`. → `application-local.yml` 기본값과 일치.

---

## B. 사내 Oracle 사용

접속 정보를 환경변수로 주입한다(코드 수정 불필요 — `application-local.yml` 이 env override 지원).

```powershell
$env:DXAPI_DB_URL      = "jdbc:oracle:thin:@<host>:1521/<service>"
$env:DXAPI_DB_USER     = "DXAPI"
$env:DXAPI_DB_PASSWORD = "<password>"
```

DDL·시드는 SQL Developer 또는 sqlplus 로 위 §A 2~3 과 동일 순서로 실행한다(DDL=DBA, seed=DXAPI).

---

## C. 앱 연결 + 사용자 시드 + 검증

```powershell
$env:JAVA_HOME        = "C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"
$env:DXAPI_SEED_ENABLED = "true"     # 빈 USER 테이블에 데모 사용자 3명 주입
cd backend; .\gradlew.bat bootRun
```

검증.

```powershell
# 1. DB 연결 UP
Invoke-RestMethod http://localhost:8080/actuator/health    # db: UP 확인

# 2. 로그인 (admin01 / admin01!) → 200 + user + 토큰
Invoke-RestMethod -Method POST http://localhost:8080/api/auth/login `
  -ContentType application/json -Body '{"id":"admin01","password":"admin01!"}'
```

로그인이 200 으로 user + accessToken + refreshToken 을 반환하면 M2 백엔드 DB 통합 검증 완료. 이후 BFF·화면(`frontend/`)을 붙인다.

---

## 참고

- 비밀번호 마지막 `!` 포함. 데모 계정: `admin01/admin01!`(ADMIN), `user01/user01!`(USER), `user02/user02!`(PENDING — 로그인 시 `USER_NOT_ACTIVE` 403 확인용).
- 연계시스템 인증키 해시는 자리표시(`SEED_PLACEHOLDER_REGEN_IN_M3`)다. M3 게이트웨이에서 `regenerate-key` 로 실제 HMAC 해시를 발급한다.
- DDL 의 DXAPI 비밀번호는 `07_DBA_DDL.sql` 의 `IDENTIFIED BY` 값. 운영은 Vault(C7) 로 대체.
