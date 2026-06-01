# backend/db — Oracle MetaDB 부트스트랩 (확보 즉시 가동)

Oracle 19c MetaDB 가 준비되면 **이 순서대로** 실행하면 backend 가 곧장 실 DB 로 동작한다. 코드는 이미 완성돼 있고, 남은 건 DB 에 스키마+데이터를 넣고 앱을 연결하는 것뿐이다.

## 파일

| 파일 | 역할 | 실행 권한 |
|---|---|---|
| `../../doc/Dau.DX.API_개발계획/07_DBA_DDL.sql` | 14테이블 DDL + 공통코드 32건 시드 + 스케줄러 잡 2 (전부 포함). **운영 원천** | DBA (SYS/SYSTEM) |
| `dev-schema.sql` | 07 의 **dev 변형** (테이블스페이스/파티션/스케줄러/CREATE USER 제거 → 접속 스키마에 생성). DBA 권한 없는 dev DB 용 | 앱 유저 |
| `seed-meta.sql` | 데이터소스·API·연계시스템·승인 **데모** 데이터 (개발용) | 앱 유저 |
| 사용자(admin01/user01/user02) | `LocalDataSeeder` 가 앱 기동 시 bcrypt 로 주입 | 앱 (`DXAPI_SEED_ENABLED=true`) |

> 사용자 비밀번호는 SQL 에 두지 않는다. bcrypt 해시를 코드가 런타임에 생성(`LocalDataSeeder`)하므로 항상 정확하다.

---

## A. Docker 로 로컬 Oracle 띄우기

> ⚠️ `docker-compose.yml` 은 Docker 미설치 환경에서 작성돼 **미검증**. Docker Desktop 설치 후 아래를 따르되, 안 되면 §B(사내 Oracle)로 가라.

```powershell
# 1. Oracle Free 컨테이너 기동 (최초 1회는 DB 생성에 수 분)
docker compose up -d
docker compose logs -f oracle    # "DATABASE IS READY TO USE" 까지 대기

# 2. DDL (DBA 로 실행 — DXAPI 사용자/테이블 + 공통코드 32건 + 스케줄러 잡 까지 전부)
docker exec -it dxapi-oracle sqlplus system/oracle@//localhost:1521/FREEPDB1 @/db/07_DBA_DDL.sql

# 3. 메타 데모 데이터 (DXAPI 로 실행). 공통코드는 07 DDL §6 이 이미 넣었으므로 여기서 다시 안 한다.
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

DDL·시드는 SQL Developer 또는 sqlplus 로 위 §A 2~3 과 동일 순서로 실행한다(07 DDL=DBA, seed-meta=DXAPI). 공통코드는 07 DDL 에 포함이라 별도 실행 없음.

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

# 3. 게이트웨이 4단 검증 (M3) — 데모 인증키로 호출
#    sample-user-info 는 DS20260509001(DAU-CORE-PROD, 가상 호스트)에 매핑돼 있어
#    검증 4단은 통과하지만 SQL 실행 단계에서 대상 DB 미연결로 실패한다(정상).
#    검증 단계만 보려면 잘못된 키로 INVALID_CERT_KEY 를 먼저 확인.
Invoke-RestMethod -Method GET "http://localhost:8080/api/sample/sample-user-info?id=admin01" `
  -Headers @{ "X-Cert-Key" = "WRONG-KEY" }     # → { ok:false, code:"INVALID_CERT_KEY", traceId }
Invoke-RestMethod -Method GET "http://localhost:8080/api/sample/sample-user-info?id=admin01" `
  -Headers @{ "X-Cert-Key" = "AKAD9001-DXAPIDEMO-1234ABCD-5678EF90" }  # 4단 통과 → SQL 실행(대상DB 미연결 시 INTERNAL_ERROR)
```

로그인이 200 으로 user + accessToken + refreshToken 을 반환하면 M2 백엔드 DB 통합 검증 완료. 이후 BFF·화면(`frontend/`)을 붙인다.

게이트웨이 happy path(SQL 실제 실행)까지 보려면 도달 가능한 대상 DB 가 필요하다. 데이터소스(`DXAPI_DATASOURCE_M`)의 JDBC_URL 을 로컬 테스트 DB 로 바꾸고 해당 SQL 의 뷰/테이블을 만들면 끝까지 동작한다.

---

## D. DBA 권한 없는 dev DB (스키마 = 앱유저, 예: dx)

운영 07 은 `DXAPI` 스키마 + `TS_DXAPI_*` 테이블스페이스 + 파티션 전제 → DBA 권한 없는 dev DB 엔 못 씀. 대신 `dev-schema.sql`(07 의 dev 변형)을 **접속 유저로 직접** 실행하면 그 유저 스키마에 14테이블 생성.

```
# 앱 유저로 dev-schema → seed-meta (sqlplus / SQL Developer / JDBC)
@backend/db/dev-schema.sql
@backend/db/seed-meta.sql
# 이후 §C 의 앱 기동(DXAPI_SEED_ENABLED=true) + 검증
```

> 현재 동아 dev DB(`168.115.36.230:1521/DEVORA19`, 유저 `dx`) = 이 방식으로 적용·통합검증 완료(2026-06-01). `application-local.yml` 기본값이 이 접속을 가리킴. 게이트웨이 happy-path 데모용으로 `V_USER` 뷰 + `DS20260509001` 을 dev DB 로 재지정해 둠.

---

## 참고

- 비밀번호 마지막 `!` 포함. 데모 계정: `admin01/admin01!`(ADMIN), `user01/user01!`(USER), `user02/user02!`(PENDING — 로그인 시 `USER_NOT_ACTIVE` 403 확인용).
- 연계시스템 데모 인증키. `LocalDataSeeder`(`DXAPI_SEED_ENABLED=true`)가 E20260509001 의 HMAC 해시를 설정한다. 게이트웨이 호출용 평문 = `AKAD9001-DXAPIDEMO-1234ABCD-5678EF90` (`X-Cert-Key` 헤더). seed-meta 의 자리표시는 이때 덮어쓰여진다.
- DDL 의 DXAPI 비밀번호는 `07_DBA_DDL.sql` 의 `IDENTIFIED BY` 값. 운영은 Vault(C7) 로 대체.
