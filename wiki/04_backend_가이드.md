> Dau.DX.API 백엔드(Spring Boot) 상세 개발·유지보수 가이드. 구조·규약·모듈·확장 방법을 한곳에 모은 living document.

# 04. 백엔드 상세 가이드

**대상**: `backend/` (Spring Boot 3.5.14 / Java 21 / MyBatis / Oracle 19c)
**상태**: M1~M4 구현 (인증·본인정보·게이트웨이·모니터링/호출이력) + dev Oracle 19c 端-端 통합검증 완료. 갱신일 2026-06-01.

---

## ⚠️ 이 문서 갱신 규칙 (필독)

이 문서는 **백엔드를 바꿀 때마다 같이 갱신한다**. 다음 작업 세션(사람/agent)이 헤매지 않게 하는 것이 목적이다.

- 새 패키지/모듈/엔드포인트 추가 → §3 패키지 구조 + §12 엔드포인트 일람 갱신.
- 새 규약·결정 → §4 공통 규약 또는 해당 모듈 절 갱신.
- **DB 스키마 변경(테이블/컬럼/인덱스/시퀀스) → `doc/Dau.DX.API_개발계획/07_DBA_DDL.sql` + `06_DB_모델링.md` 동기화** (운영 반영 원천). 매퍼 SQL 만 바꾸고 DDL 을 안 고치면 운영 적용 시 깨진다.
- 공통코드(`DXAPI_EZ_CODE_M`) 시드는 **07 DDL §6 에만** 둔다. `backend/db` 에 중복 두지 않는다(PK 충돌).
- TODO 해소 → §11 에서 제거. 새 확장 지점 발견 → §11 추가.
- 마일스톤 종료 시 상단 "상태" 줄 갱신.
- 상세 결정 로그는 [`03_context-notes.md`](03_context-notes.md), 진행 체크는 [`02_checklist.md`](02_checklist.md). 본 문서는 **현재 구조의 스냅샷 + 사용법**이다(이력 아님).

---

## 1. 한 페이지 요약

- **스택**. Spring Boot 3.5.14, Java 21, MyBatis 3.0.5, HikariCP, ojdbc11, jjwt 0.12.6, spring-security-crypto(bcrypt).
- **계층**. Controller → Service → Mapper(MyBatis) → Oracle. 횡단: 필터(traceId, JWT), 전역 예외 처리.
- **2개의 DB 세계**. (a) **MetaDB** = Oracle 19c, 고정 연결(`spring.datasource`), MyBatis 매퍼. (b) **사용자 등록 DB** = 게이트웨이가 동적 연결(`DataSourceRegistry`, 멀티 타입).
- **응답 2종**. 관리/인증 API = `ApiResponse`(`{ok,data}`). 게이트웨이 = `GatewayResponse`(`{ok,data?,code?,traceId}`).
- **빌드**. `JAVA_HOME` 지정 후 `gradlew build` / `bootRun`. (java 가 PATH 에 없음 — [[backend-build-toolchain]])

---

## 2. 아키텍처 — 요청 흐름

```
[브라우저/외부]
   │
   ▼  (모든 요청)
TraceIdFilter (@Order 1)   ── traceId 발급 → MDC + X-Trace-Id 헤더
   │
   ▼
JwtAuthFilter (@Order 2)   ── Bearer 액세스 토큰 → AuthPrincipal 요청속성(있으면)
   │
   ├──────────────┬───────────────────┬─────────────────────┐
   ▼              ▼                   ▼                     ▼
AuthController  UserController     GatewayController      OpsController
   │              │                   │                     │
AuthService    UserService        GatewayService         (VersionInfo)
   │              │                   │
   │              │                   ├─ CertKeyService / IpWhitelistChecker
   │              │                   ├─ ApiDefMapper / ExtSystemMapper
   │              │                   └─ SqlExecutor → DataSourceRegistry → 사용자 DB
   ▼              ▼                   ▼
UserMapper /   UserMapper         (MetaDB 매퍼들)
RefreshTokenMapper
   │              │                   │
   └──────────────┴───────────────────┘
                  ▼
            Oracle 19c MetaDB (MyBatis)

예외 → GlobalExceptionHandler (@RestControllerAdvice) → ApiResponse 형태
       (게이트웨이는 컨트롤러 자체 try/catch 로 GatewayResponse 형태 유지)

호출 이력 → GatewayService 가 모든 결과를 CallHistoryQueue 에 enqueue
          → CallHistoryBatchWriter(@Scheduled 1초/100건) → DXAPI_CALL_HIST_L
MonitoringController(ADMIN) → MonitoringService → 통계/이력 조회
```

---

## 3. 패키지 구조

루트 패키지 `ac.donga.dxapi`. 파일별 한 줄 역할.

```
DxapiApplication.java         부팅 진입점(@SpringBootApplication)

common/                       횡단 공통
  ApiResponse.java            관리/인증 응답 래퍼 {ok,data,message,issues} (record)
  ItemsResponse.java          목록 응답 래퍼 {items:[...]} (record)
  ErrorCode.java              에러코드 enum 20종 + HttpStatus 매핑 (05 §0)
  ApiException.java           ErrorCode 실은 비즈니스 예외
  GlobalExceptionHandler.java 전역 예외 → ApiResponse 변환
  TraceIdFilter.java          요청별 traceId(MDC + X-Trace-Id). current() 정적 접근

ops/                          운영 메타
  OpsController.java          GET /api/_ops/healthz · /version
  VersionInfo.java            build/commit/startedAt 보유 빈

config/
  CryptoConfig.java           PasswordEncoder(bcrypt12) + @EnableConfigurationProperties(Jwt/Gateway)
  LocalDataSeeder.java        local 프로파일 데모 시드(사용자 bcrypt + 연계 데모 인증키). 게이트 app.seed.enabled

auth/                         인증·세션
  JwtProperties.java          app.jwt.* 바인딩 (secret, accessTtl, refreshTtl)
  JwtProvider.java            access/refresh JWT 발급·검증(HS256, jti). RefreshIssue record
  JwtAuthFilter.java          Bearer 파싱 → AuthPrincipal 요청속성(ATTR="authPrincipal")
  AuthPrincipal.java          인증 주체(userId, role)
  AuthSupport.java            requireLogin/requireAdmin 가드(컨트롤러 공통)
  AuthService.java            login/logout/refresh (bcrypt + 토큰회전)
  AuthController.java         POST /api/auth/login · /logout · /refresh
  RefreshTokenMapper.java     DXAPI_REFRESH_TOKEN_L insert/countValid/revoke
  dto/ LoginRequest, LoginResponse, TokenResponse, RefreshTokenRequest

user/                         사용자
  User.java                   DXAPI_USR_USER_M 도메인 (record)
  UserResponse.java           응답 DTO(mockup 필드명, PW 제외). from(User)
  UserAdminUpdateRequest.java 관리자 변경 요청(role/status)
  UserMapper.java             findById/touchLoginSuccess/incrementLoginFailure + search/updateAdmin/softDelete
  UserService.java            getMe + 관리자 list/get/updateByAdmin/softDelete(self-guard)
  UserController.java         GET /api/users/me + 관리자 CRUD(목록/단건/PUT/DELETE)

datasource/                   데이터소스 관리 CRUD (게이트웨이 read 모델과 별개)
  DataSource / DataSourceResponse / DataSourceCreate·UpdateRequest  도메인·DTO
  DataSourceAdminMapper.java  findAll/findById/selectMaxId/countByName/countApisUsing/insert/update/delete + XML
  DataSourceService.java      채번(DS+YYYYMMDD+seq3)·중복명·사용중 차단·풀 evict(DataSourceRegistry)
  DataSourceController.java   GET/POST /api/datasources, GET/PUT/DELETE /{id}

gateway/                      외부 게이트웨이 (핵심)
  GatewayController.java      GET/POST /api/sample/{apiPath} (동적 라우팅)
  GatewayService.java         라우팅 → 4단 검증 → 필수파라미터 → SQL 실행
  GatewayOutcome.java         내부 처리 결과(code==null=성공)
  GatewayResponse.java        외부 응답 {ok,data?,code?,detail?,traceId}
  CertKeyService.java         인증키 HMAC-SHA256 hex + disti(앞8)
  IpWhitelistChecker.java     IPv4 CIDR + localhost
  MaskingApplier.java         응답 마스킹 7종
  SqlExecutor.java            #{p}→:p 바인딩, 대상 DS 실행, 결과 마스킹
  DataSourceRegistry.java     dataSrcId별 HikariDataSource 동적 풀
  ApiDefMapper.java           findByPathAndMethod/findParams/findResps
  ExtSystemMapper.java        findByCertHash/countMappedApi
  DataSourceMapper.java       findById (USE_YN='Y')
  GatewayApi/ApiParamDef/ApiRespDef/ExtSystemAuth/DataSourceDef  조회 뷰 record

monitoring/                   호출 이력 적재 + 모니터링
  CallHistoryQueue.java       in-process BlockingQueue(cap 10k). 게이트웨이 enqueue
  CallHistoryBatchWriter.java @Scheduled(1초) drain → JdbcTemplate.batchUpdate(100건)
  CallHistoryRecord.java      적재 단위(쓰기 모델)
  MonitoringMapper.java       findSamplesSince(통계표본)/findHistory(필터 목록) + XML
  MonitoringService.java      stats(window clamp)/history(limit clamp)
  MonitoringController.java   GET /api/monitoring/stats · /history (ADMIN)
  StatsCalculator.java        표본→KPI+분당시리즈 (순수 로직)
  StatsResult/CallHistory/CallSample/HistoryResponse  뷰·결과 record

config/SchedulingConfig.java  @EnableScheduling (배치writer 구동)

resources/
  application.yml             base 설정(서버/actuator/mybatis/app.*)
  application-local.yml       local 프로파일 Oracle datasource(Hikari fail-timeout=-1)
  mapper/*.xml                MyBatis SQL (User/RefreshToken/ApiDef/ExtSystem/DataSource/Monitoring)
```

---

## 4. 공통 규약

### 4.1 응답 형태
- **관리/인증 API**. `ApiResponse<T>` — 성공 `{ok:true,data}`, 실패 `{ok:false,message:"ERROR_CODE",issues?}`. `message` 는 항상 `ErrorCode.name()`.
- **게이트웨이**. `GatewayResponse` — `{ok,data?,code?,detail?,traceId}`. 외부 노출이므로 `INTERNAL_ERROR` 의 detail 은 비운다(traceId+로그로 추적).
- 둘 다 `@JsonInclude(NON_NULL)` — null 필드 생략.

### 4.2 에러 처리
- 비즈니스 실패 → `throw new ApiException(ErrorCode.X)` 또는 게이트웨이는 `GatewayOutcome.fail(...)`.
- `ErrorCode` 가 HTTP 상태를 안다(`status()`). 새 에러코드는 ErrorCode enum 에만 추가.
- 입력검증(@Valid 실패) → `GlobalExceptionHandler` 가 INVALID_INPUT + 필드 issues.
- 예상 못한 예외 → INTERNAL_ERROR 500(로그 기록).

### 4.3 traceId
- 모든 요청에 `TraceIdFilter` 가 발급(없으면 생성). 응답헤더 `X-Trace-Id`. 코드 내 `TraceIdFilter.current()`.

### 4.4 DB ↔ 객체 매핑
- 컬럼 스네이크 → 필드 카멜. `mybatis.configuration.map-underscore-to-camel-case=true`.
- 도메인은 **record**. `arg-name-based-constructor-auto-mapping=true` + Spring Boot 의 `-parameters` 로 생성자 인자명 자동매핑. (⚠️ Oracle 통합테스트로 실검증 필요 — §11)
- 매퍼 파라미터는 `@Param` 명시. SQL 은 XML(`resources/mapper`), 매퍼 인터페이스는 `@Mapper`.
- 테이블/컬럼 명명은 [`06_DB_모델링.md`](../doc/Dau.DX.API_개발계획/06_DB_모델링.md) 의 `DXAPI_*` 규칙.

### 4.5 파일 헤더
- 새 파일 첫 줄(패키지 위)에 한 줄 한국어 역할 주석(CLAUDE.md §6).

---

## 5. 모듈별 상세

### 5.1 common
횡단 인프라. 새 컨트롤러는 항상 `ApiResponse`/`ErrorCode` 를 쓴다. 직접 ResponseEntity 를 만들지 말 것(게이트웨이만 예외).

### 5.2 auth — 인증/세션
JWT 모델(C1/C3/C5). bcrypt cost 12. access 15분 / refresh 24시간.

로그인 흐름.
```
POST /api/auth/login {id,password}
 → AuthService.login
   UserMapper.findById → 없으면 INVALID_CREDENTIALS
   bcrypt.matches 실패 → incrementLoginFailure + INVALID_CREDENTIALS
   status != ACTIVE → USER_NOT_ACTIVE
   JwtProvider: access + refresh(jti) 발급
   RefreshTokenMapper.insert(jti, userId, expireAt)  -- DXAPI_REFRESH_TOKEN_L (Redis 대체)
   UserMapper.touchLoginSuccess (최근로그인 + 실패카운트 0)
 → {ok:true,data:{user, accessToken, refreshToken}}   (BFF 가 토큰을 httpOnly 쿠키로 저장)
```
- **logout**. refresh 토큰 jti revoke(멱등).
- **refresh**. refresh 검증 + countValid → 기존 jti revoke('ROTATED') → 새 쌍 발급 + insert(토큰 회전).
- 보호 엔드포인트는 `@RequestAttribute("authPrincipal")` 로 주체 수신, null 이면 UNAUTHORIZED. (JwtAuthFilter 는 거부하지 않고 주체만 심는다.)

### 5.3 user
`GET /api/users/me` — 주체의 userId 로 조회, `UserResponse`(PW 제외). 응답 필드명은 mockup `types/api.ts` 와 일치(BFF 무변환).

### 5.4 gateway — 외부 게이트웨이 (핵심)
`GET/POST /api/sample/{apiPath}`. PRD §8.2 / 05 §10.

처리 순서(`GatewayService.handle`).
```
1. ApiDefMapper.findByPathAndMethod(path, method)  없으면 API_NOT_FOUND(404)
2. status != ACTIVE                                 → API_NOT_ACTIVE(403)
3. AUTH_ESSNTL_YN='Y' 면 4단 검증(verify):
   a. X-Cert-Key 없음/blank          → INVALID_CERT_KEY(401)
   b. findByCertHash(HMAC(key)) 없음 → INVALID_CERT_KEY(401)
   c. ext status != ACTIVE           → EXT_SYSTEM_INACTIVE(403)
   d. IP 화이트리스트 불일치          → IP_NOT_ALLOWED(403)
   e. now ∉ [useBegin,useEnd]        → OUT_OF_PERIOD(403)
   f. countMappedApi == 0            → API_NOT_MAPPED(403)
4. 필수 파라미터 누락               → MISSING_PARAM(400)
5. SqlExecutor.execute(대상 DS)     → {ok:true,data,traceId}
   실패 → INTERNAL_ERROR(500, detail 비노출)
```
- **인증키**. 평문 미저장. `CRTFC_KEY_HASH = HMAC-SHA256(plain, app.gateway.cert-hmac-secret)`. 조회는 `WHERE CRTFC_KEY_HASH = HMAC(plain)`.
- **SQL 실행**. `SqlExecutor` 가 `#{p}`→`:p` 치환 후 `NamedParameterJdbcTemplate`(literal 결합 차단). SELECT→`queryForList`+마스킹, 그 외→`update`({affected}). Oracle 대문자 컬럼은 소문자로 정규화.
- **동적 DS**. `DataSourceRegistry.get(dataSrcId)` 가 `DXAPI_DATASOURCE_M` 읽어 HikariDataSource lazy 생성·캐시. 데이터소스 변경 시 `evict(id)`.
- **마스킹**. `MaskingApplier` 가 `DXAPI_API_RESP_M.MASK_RULE_DVCD` 별 적용.

### 5.5 ops
liveness(`/healthz`)·배포식별(`/version`). DB 무관. DB 헬스는 `/actuator/health` 의 db 지표.

### 5.6 monitoring — 호출 이력 + 모니터링
게이트웨이 호출을 비동기 적재하고 통계/이력을 조회한다. A5(Redis 미사용)·04 PRD 정합.

**적재(쓰기)**.
```
GatewayService.handle → 모든 결과(성공/실패)를 CallHistoryRecord 로 CallHistoryQueue.enqueue
CallHistoryBatchWriter @Scheduled(fixedDelay=1초): queue.drainTo(100) 반복 → JdbcTemplate.batchUpdate
  INSERT INTO DXAPI_CALL_HIST_L (HIST_SEQ=SEQ_CALL_HIST.NEXTVAL, ...)
  @PreDestroy 로 종료 시 flush. 큐 포화 시 drop + warn(무음 폐기 금지).
```
- 쓰기는 MyBatis 가 아니라 **JdbcTemplate.batchUpdate** — Oracle 시퀀스를 SQL 에 직접 두는 배치 INSERT 가 깔끔하기 때문.
- `traceId` 는 컨트롤러에서 `GatewayService.handle(...)` 인자로 전달.

**조회(읽기, ADMIN)**.
- `GET /api/monitoring/stats?windowMin=60` (5~180 clamp) → `MonitoringMapper.findSamplesSince` → `StatsCalculator.compute` → KPI(total/success/errors/errors5xx/p95/successRate) + 분당 시리즈(2xx/4xx/5xx, seriesOk/Err).
- `GET /api/monitoring/history?q=&statusCode=&apiNo=&extSysId=&from=&to=&limit=` → `findHistory`(동적 `<where>` + `FETCH FIRST limit ROWS ONLY`) → `{items: CallHistory[]}`.
- `StatsCalculator` 는 순수 로직이라 DB 없이 단위테스트(시리즈 버킷·p95·비율).

---

## 6. 데이터 계층

- **DDL 원천(중요)**. 스키마(테이블/컬럼/인덱스/시퀀스/스케줄러)의 진실은 `doc/Dau.DX.API_개발계획/07_DBA_DDL.sql` (운영·dev 공통 설치 스크립트). 설계 근거는 `06_DB_모델링.md`. **매퍼/도메인을 바꿔 스키마가 달라지면 07 + 06 을 반드시 동기화한다** (안 그러면 운영 반영 시 깨짐). `backend/db/` 는 데모 시드·런북·docker 만(스키마 원천 아님).
- **MetaDB(고정)**. `spring.datasource`(application-local.yml). MyBatis 매퍼 = User/RefreshToken/ApiDef/ExtSystem/DataSource/Monitoring. SQL 은 `resources/mapper/*.xml`.
- **사용자 DB(동적)**. `DataSourceRegistry` 가 런타임에 풀 생성. MyBatis 아님 — `NamedParameterJdbcTemplate` 직접.
- **대량 쓰기**. 호출 이력은 `JdbcTemplate.batchUpdate`(시퀀스 직접). MyBatis 매퍼 자동매핑 시 컬럼 alias 를 record 필드명에 맞춤(`AS CALLED_AT` 등).
- **채번**. (미구현) API/연계/DS ID = `prefix+YYYYMMDD+seq3`. 06 §3.2 권장은 `MAX(seq)+1 WHERE id LIKE '...'` 코드 처리. 관리 CRUD 구현(후속 마일스톤) 시 추가.
- 매퍼 추가 시. ① 인터페이스(`@Mapper`, `@Param`) ② `resources/mapper/<Name>.xml`(namespace=FQN) ③ resultType=도메인 record.

---

## 7. 보안

| 항목 | 구현 | 비고 |
|---|---|---|
| 비밀번호 | bcrypt cost 12 (`CryptoConfig`) | C3 |
| 세션 | JWT HS256, access 15분/refresh 24시간, refresh 는 DB revoke | C5. Redis 미사용(A5) |
| 인증키 | HMAC-SHA256(서버비밀), 평문 미저장 | C1 |
| SQL 인젝션 | `#{p}`→named param only, literal 결합 금지 | |
| 마스킹 | 응답 컬럼별 규칙 | 정확 정규식 C6 후속 |
| 외부 노출 | 게이트웨이 INTERNAL_ERROR 상세 숨김(traceId만) | |
| 시크릿 | 현재 env/기본값. Vault 미도입 | C7 후속 |

---

## 8. 설정 · 프로파일 · 환경변수

기본 프로파일 `local`. 운영은 env override.

| 키(yml) | 환경변수 | 기본값 | 용도 |
|---|---|---|---|
| `spring.datasource.url` | `DXAPI_DB_URL` | `jdbc:oracle:thin:@localhost:1521/FREEPDB1` | MetaDB |
| `spring.datasource.username` | `DXAPI_DB_USER` | `DXAPI` | |
| `spring.datasource.password` | `DXAPI_DB_PASSWORD` | `dxapi` | |
| `app.jwt.secret` | `DXAPI_JWT_SECRET` | (로컬 기본, ≥32B) | JWT 서명 |
| `app.jwt.access-ttl-seconds` | — | 900 | |
| `app.jwt.refresh-ttl-seconds` | — | 86400 | |
| `app.gateway.cert-hmac-secret` | `DXAPI_CERT_HMAC_SECRET` | (로컬 기본) | 인증키 HMAC |
| `app.seed.enabled` | `DXAPI_SEED_ENABLED` | false | 데모 시드 on |
| `app.version` / `app.commit` | `DXAPI_VERSION` / `DXAPI_GIT_COMMIT` | SNAPSHOT/unknown | /version |

`application-local.yml` 의 Hikari `initialization-fail-timeout=-1` → Oracle 없이도 부팅(DB 헬스만 DOWN).

---

## 9. 빌드 · 실행 · 테스트

```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"   # 매 세션 (java PATH 없음)
cd backend
.\gradlew.bat build      # 컴파일 + 단위테스트
.\gradlew.bat bootRun    # 기동 (:8080)
```
- **단위테스트(현재 41종, DB 불필요)**. JwtProvider 4, PasswordEncoder 2, AuthService 4, UserService 6, DataSourceService 6, IpWhitelistChecker 6, CertKeyService 4, MaskingApplier 6, StatsCalculator 4, CallHistoryQueue 2, + contextLoads. (서비스 분기는 Mockito 목)
- **통합검증**. dev Oracle 19c(`168.115.36.230/DEVORA19`)에서 端-端 수동 검증 완료(2026-06-01): 로그인·/me·게이트웨이 4단(오답401/정답200)·동적 DS SQL·마스킹·call_hist 적재·모니터링. 자동화(Testcontainers)는 미작성.
- **DB 가동·시드·게이트웨이 데모**. [`../backend/db/README.md`](../../backend/db/README.md). DBA 권한 없는 dev DB 는 `dev-schema.sql`(07 의 dev 변형) 사용.

---

## 10. 확장 레시피 (개발 방향 안 헤매기)

### 10.1 관리 API 엔드포인트 추가 (예: 데이터소스 CRUD)
1. 도메인 record(`datasource/DataSource.java`) — DB 컬럼 매핑.
2. `XxxMapper`(@Mapper) + `resources/mapper/XxxMapper.xml`.
3. `XxxService` — 비즈니스 로직, 실패는 `throw new ApiException(ErrorCode.X)`.
4. `XxxController` — `@RestController`, 반환 `ApiResponse<T>`. 보호는 `@RequestAttribute("authPrincipal") AuthPrincipal p` 수신 후 `AuthSupport.requireAdmin(p)` / `requireLogin(p)`. 목록 응답은 `ItemsResponse<T>`.
5. 계약은 [`05_api_연결목록.md`](../doc/Dau.DX.API_개발계획/05_api_연결목록.md) 의 path/요청/응답 그대로.
6. 단위테스트(서비스 Mockito) + 빌드. §3/§12/본 문서 갱신.

### 10.2 게이트웨이 동작 추가/변경
- 검증 단계 추가 → `GatewayService.verify` 에 단계 + `ErrorCode` 추가.
- 새 마스킹 규칙 → `MaskingApplier.apply` switch + `MaskingApplierTest`.
- CALL/프로시저 지원 → `SqlExecutor` 에 분기(현재 SELECT/DML만).

### 10.3 공통 응답/에러 추가
- 새 에러코드 → `ErrorCode` enum + HttpStatus. 그 외 변경 없음.

### 10.4 새 설정값
- `app.*` 면 해당 `@ConfigurationProperties` record 에 필드 + yml + (필요시) `@EnableConfigurationProperties` 등록(CryptoConfig).

---

## 11. 알려진 TODO / 확장 지점

| 위치 | 내용 | 트리거 |
|---|---|---|
| `GatewayService.toJson` | call_hist PARAM_JSON PIPA 마스킹 미적용(원본 저장) | C6 |
| 호출이력 배치 | INSERT 실패 시 재시도 없이 유실(로그만) | 신뢰성 강화 시 |
| auth | access 만료 자동 refresh(미들웨어) 미구현 | M2 후속 |
| ExtSystem | `CRTFC_KEY_HASH` 인덱스 없음(disti만) | 트래픽 시 |
| 관리 CRUD | apis / ext-system / approval 미구현 (users·datasource 완료) | 진행 중 |
| 시크릿 | Vault 미도입(env/기본값) | C7 |
| SqlExecutor | CALL/프로시저 미지원 | 필요 시 |
| 채번 | ID 자동 채번 미구현 | 관리 CRUD 시 |

---

## 12. 엔드포인트 일람 (현재 구현)

| Method | Path | 인증 | 응답 | 모듈 |
|---|---|---|---|---|
| POST | `/api/auth/login` | 없음 | ApiResponse(LoginResponse) | auth |
| POST | `/api/auth/logout` | refresh 토큰 | ApiResponse(void) | auth |
| POST | `/api/auth/refresh` | refresh 토큰 | ApiResponse(TokenResponse) | auth |
| GET | `/api/users/me` | Bearer access | ApiResponse(UserResponse) | user |
| GET | `/api/users` `?q=&status=` | ADMIN | ApiResponse(ItemsResponse) | user |
| GET | `/api/users/{id}` | ADMIN | ApiResponse(UserResponse) | user |
| PUT | `/api/users/{id}` | ADMIN | ApiResponse(UserResponse) | user |
| DELETE | `/api/users/{id}` | ADMIN | ApiResponse(void) — soft delete | user |
| GET | `/api/datasources` | ADMIN | ApiResponse(ItemsResponse) | datasource |
| POST | `/api/datasources` | ADMIN | ApiResponse(DataSourceResponse) | datasource |
| GET | `/api/datasources/{id}` | ADMIN | ApiResponse(DataSourceResponse) | datasource |
| PUT | `/api/datasources/{id}` | ADMIN | ApiResponse(DataSourceResponse) | datasource |
| DELETE | `/api/datasources/{id}` | ADMIN | ApiResponse(void) — 사용중 차단 | datasource |
| GET/POST | `/api/sample/{apiPath}` | X-Cert-Key(게이트웨이) | GatewayResponse | gateway |
| GET | `/api/monitoring/stats` | ADMIN | ApiResponse(StatsResult) | monitoring |
| GET | `/api/monitoring/history` | ADMIN | ApiResponse(HistoryResponse) | monitoring |
| GET | `/api/_ops/healthz` | 없음 | ApiResponse | ops |
| GET | `/api/_ops/version` | 없음 | ApiResponse | ops |
| GET | `/actuator/health` `/info` | 없음 | actuator | (내장) |

> 후속 마일스톤에서 관리 CRUD(`/api/users`, `/api/datasources`, `/api/apis`, `/api/ext-systems`, `/api/approvals`)가 추가되면 본 표를 갱신한다.
