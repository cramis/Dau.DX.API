> dev-01 본 개발 중 내린 결정과 근거 로그. 작업하며 계속 append 한다. 다음 세션이 재유도 없이 이어가기 위한 문서.

# 03. Context Notes — dev-01

> 새 결정·트레이드오프가 생길 때마다 맨 아래에 날짜와 함께 추가. 지우지 말 것(이력).

---

## 2026-05-31 — 본 개발 착수 결정 4종

PRD 작성 전 사용자 확인으로 잠근 결정.

### 1. 백엔드 스택 = Spring Boot + Java 21 + MyBatis + HikariCP
- **왜**. [`06_DB_모델링.md`](../spec/06_DB_모델링.md) 가 이미 HikariCP·ojdbc·Virtual Threads 를 전제로 작성됨(JVM 가정). SQL-to-REST 워크로드라 동적 SQL·결과셋 매핑이 핵심 → ORM(JPA)보다 MyBatis 가 자연스럽다. 사내 Java 자산 가정.
- **닫은 open-q**. A1, A2, A3.
- **대안 기각**. NestJS(TS 공유 이점 있으나 node-oracledb·멀티DB 풀 성숙도 부담), FastAPI(06 의 JVM 전제와 불일치).

### 2. 프런트엔드 = mockup Next.js 승격 + BFF
- **왜**. mockup 의 12화면·컴포넌트를 100% 재사용. 브라우저에 JWT 노출 안 하려고 Next route handler 를 BFF(프록시)로 두고 세션 쿠키(httpOnly)는 BFF 가 관리. `/api/mock/**` 는 제거.
- **대안 기각**. 순수 SPA + 직접 호출 — 더 단순하나 인증키/세션 노출 표면이 커짐.

### 3. dev-01 1차 범위 = P0 수직 슬라이스
- **왜**. [`05 §12`](../spec/05_api_연결목록.md) P0 정의. 端-端 1개(로그인 → 게이트웨이 호출 → 모니터링 확인)를 먼저 관통시켜 아키텍처를 실증하고, 나머지는 동일 패턴으로 확장. 전체 일괄은 리뷰·롤백 단위가 너무 커짐.
- **제외**. CRUD 대부분, import/export, 승인, 인시던트 → 후속 PR.

### 4. 문서 = wiki/ 폴더 신설
- **왜**. 기존 계획 문서(`doc/`)와 물리 분리. 본 개발 전용 위키 트리(README + PRD + checklist + context-notes). CLAUDE.md §7(Plan+Checklist+Context Notes) 충족.

---

## 추가 잠금 (PRD §2 에서 함께 닫음)

- **C1 cert-key = HMAC-SHA256** (장기 키, 평문 미저장, 앞 8자 식별저장). 06 의 `CRTFC_KEY_HASH`/`CRTFC_KEY_DISTI_TEXT` 컬럼 구조에 정합.
- **C3 비밀번호 = bcrypt cost 12**. 06 코멘트 명시.
- **C5 JWT = Access 15분 / Refresh 24시간**, Refresh 는 `DXAPI_REFRESH_TOKEN_L` revoke. A5(Redis 미사용) 정합.

> 위 7개(A1/A2/A3/B1/C1/C3/C5)는 [`open-questions.md`](../product/open-questions.md) 에서 아직 `[열림]`. M5 에서 `[닫힘 → wiki/01]` 로 갱신 예정(체크리스트 M5).

---

## 미해결 / 다음 세션 주의

- **A4 ojdbc Virtual Threads pinning**. 1차는 플랫폼 스레드. VT 채택은 PoC 후. 처리량 리스크.
- **C7 시크릿**. 1차 로컬 설정값(`DB_ENC_PW`, HMAC 키). Vault 는 후속.
- **B2 사용자 DB 범위**. 1차 Oracle 만 실동작, PG/MySQL 은 Registry 인터페이스만 열어둠.
- **채번**. 시퀀스 대신 `MAX(seq)+1 WHERE id LIKE 'A<YYYYMMDD>%'` 코드 처리(06 §3.2 권장). 동시성 시 트랜잭션 격리 확인 필요.

---

## 2026-06-01 — M1 완료 (DDL 제외)

### 한 일
- `backend/` Spring Boot 3.5.14 + Java 21 스캐폴드(Spring Initializr starter.zip, Gradle Kotlin DSL, wrapper 포함).
- 의존성. web / validation / actuator / mybatis-spring-boot-starter 3.0.5 / ojdbc11 (HikariCP 는 mybatis-starter 경유).
- 공통. `ApiResponse`(record) / `ErrorCode`(05 §0 18종 + HttpStatus 매핑) / `ApiException` / `GlobalExceptionHandler` / `TraceIdFilter`(X-Trace-Id).
- ops. `OpsController`(/api/_ops/healthz, /version) + `VersionInfo`.
- 설정. `application.yml`(8080, actuator health/info, app.version·commit) + `application-local.yml`(Oracle, Hikari fail-timeout=-1).

### 환경
- **JDK 21 이 미설치였음** → winget `EclipseAdoptium.Temurin.21.JDK` 로 설치(2026-06-01).
- **`java` 가 PATH 에 없음**. 빌드 시 `JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot` 를 매번 세션에 지정해야 함. → [[backend-build-toolchain]] 참고.
- Docker·sqlplus 미설치. Oracle 인스턴스 아직 없음.

### 검증 결과
- `gradlew build` → BUILD SUCCESSFUL (compile + contextLoads 테스트 통과 = Oracle 없이 컨텍스트 로드).
- jar bootRun → `/api/_ops/healthz` `{ok:true,data:{status:UP}}`, `/version` build/commit/startedAt, 응답 헤더 `X-Trace-Id` 발급.
- `/actuator/health` → 503 (db DOWN). **예상대로** — Oracle 미기동. DB 지표 배선은 정상.

### 트러블슈팅 로그 (CLAUDE.md §10)
- 1차 빌드 실패. `ApiResponse` 를 record 로 만들었더니 컴포넌트명 `ok` 와 no-arg static `ok()` 가 accessor 와 충돌(`invalid accessor method in record`). → no-arg `ok()` 팩토리 제거(M1 미사용). `ok(data)`·`fail()` 은 arity 달라 무관. 향후 무인자 성공 응답 필요 시 `success()` 등 다른 이름 사용.

### 다음
- **M1 잔여**. Oracle 19c 인스턴스 확보 → `07_DBA_DDL.sql` 실행 + mockup 시드 INSERT → `/actuator/health` db UP 확인. Oracle 설치 방법(docker free / 사내 인스턴스) 사용자 결정 필요.
- 이후 **M2**(로그인/세션 + /me + BFF).

---

## 2026-06-01 — M2 백엔드 (옵션 C: Oracle 없이 코드+단위테스트)

### 결정
- 사용자가 **옵션 C** 선택. Oracle 없이 M2 백엔드 코드+단위테스트까지 진행, DB 통합검증만 보류. + "Oracle 확보 시 즉시 가동" 세팅 필수.

### 한 일 (백엔드)
- `auth/`. JwtProvider(HS256, access 15분/refresh 24시간, jti), JwtProperties(app.jwt.*), JwtAuthFilter(@Order 2, Bearer→AuthPrincipal 요청속성), AuthPrincipal, AuthService(login/logout/refresh, bcrypt+토큰회전), AuthController(login/logout/refresh), RefreshTokenMapper(+XML, SEQ_REFRESH/jti), dto 4종.
- `user/`. User(record, DXAPI_USR_USER_M 매핑), UserResponse(mockup 필드명, PW 제외), UserMapper(+XML), UserService, UserController(GET /api/users/me).
- `config/`. CryptoConfig(BCrypt cost 12 + @EnableConfigurationProperties), LocalDataSeeder(local, 사용자 3명 bcrypt, DXAPI_SEED_ENABLED 게이트, DB 미연결 no-op).
- 의존성. spring-security-crypto, jjwt 0.12.6(api/impl/jackson). ojdbc11 은 runtimeOnly 로 정리.
- yml. mybatis(map-underscore + arg-name-based-constructor-auto-mapping) 를 base 로 이동. app.jwt / app.seed 추가.

### 검증 (Oracle 없이 가능한 범위)
- `gradlew build` BUILD SUCCESSFUL. 단위테스트 10종(JWT 4 / bcrypt 2 / AuthService 4) + contextLoads 통과.
- 런타임 스모크. `/api/users/me`(무토큰)→401 UNAUTHORIZED, `/api/auth/login`(빈본문)→400 INVALID_INPUT+필드issues, `/api/auth/login`(자격)→500 INTERNAL_ERROR(db down, **예상대로**). → 라우팅·검증·예외·인증필터 정상.

### Oracle 확보 즉시 가동 세팅
- `backend/db/seed-codes.sql`(06 §7 공통코드), `seed-meta.sql`(DS5/API5+param/resp/연계1/매핑2/승인2, mockData 정합).
- 사용자는 SQL 아닌 `LocalDataSeeder` 가 bcrypt 런타임 주입(해시 SQL 박제 회피).
- `docker-compose.yml`(Oracle Free 23ai, **미검증 — Docker 없음**) + `backend/db/README.md` 런북(A docker / B 사내 Oracle / C 앱연결+검증).
- **가동 절차 요약**. DDL(DBA) → seed-codes(DXAPI) → seed-meta(DXAPI) → `DXAPI_SEED_ENABLED=true` 로 bootRun → `/actuator/health` db UP + login 200 확인.

### 트러블슈팅 (CLAUDE.md §10)
- `ApiResponse.<Void>ok(null)`. record 컴포넌트 `ok` 와 무인자 `ok()` 충돌(M1) 잔재 — logout 성공 응답은 제네릭 `ok(null)` 로 처리.

### 미해결 / 주의
- **MyBatis record 자동매핑**. `arg-name-based-constructor-auto-mapping=true` + `-parameters`(Spring Boot 3.2+ 기본) 가정. Oracle 통합테스트로 `User` 매핑 실제 검증 필요(현재 무DB라 미확인).
- 연계시스템 인증키 해시 자리표시 → M3 게이트웨이 regenerate-key 로 실제 HMAC 발급.

### 다음
- **M2 잔여(frontend)**. `mockup/`→`frontend/` 승격, `/api/mock/**` 제거 후 BFF 프록시(httpOnly 세션쿠키), login/me 화면 실연동. Oracle 무관하게 진행 가능(단 로그인 端-端 동작은 Oracle 필요).
- Oracle 확보되면 README §A/B/C 로 즉시 통합검증.

---

## 2026-06-01 — M2 frontend (mockup 승격 + BFF)

### 한 일
- `mockup/` → `frontend/` robocopy 승격(node_modules/.next/.git 제외). bun 1.3.5 / node 24.
- BFF. `lib/backend.ts`(BACKEND_URL=:8080, 쿠키명 dxapi_at/dxapi_rt). `app/api/auth/login`·`logout` route(Spring 프록시, 토큰을 httpOnly 쿠키로 보관, 화면엔 user 만).
- `lib/mockAuth.ts` 재작성. `getCurrentUser()`=access 쿠키로 백엔드 `/api/users/me` 중계(서버컴포넌트 공용). `setSession/clearSession`, `clearMockJwt` 별칭(reset 라우트 호환).
- `proxy.ts`(Next16 미들웨어) 가드 쿠키 `mock-jwt`→`dxapi_at`.
- 페이지 fetch URL 2곳(`login/page.tsx`, `LogoutButton.tsx`) → `/api/auth/*`. mock auth login/logout 라우트 삭제.

### 설계 결정
- **Option X (auth 이관, data 일부 mock)**. `getCurrentUser`를 실 백엔드로 일괄 전환 → 모든 서버컴포넌트가 BFF 경유. 미이관 도메인(datasource/apis/monitoring)은 `/api/mock/**` 그대로 두고 각 마일스톤에서 순차 교체. 결과적으로 frontend 데모는 backend+Oracle 가동을 전제(순수 UI 미리보기는 mockup/ 유지).
- 파일명 `lib/mockAuth.ts` 유지 — 기존 `@/lib/mockAuth` import 23곳 안 깨지게.

### 검증
- `bun run build` 성공(53 라우트, /api/auth/login·logout 컴파일 확인, mock auth 제거 확인).
- 端-端 스모크(backend jar + next start). `/login`→200, `/me`(무쿠키)→307 redirect(proxy 가드), `/api/auth/login`→500 INTERNAL_ERROR(BFF→backend→db down, **예상대로**).

### 미해결 / 주의
- **access 15분 만료 시 자동 refresh 미구현**. 서버컴포넌트 렌더 중엔 쿠키 set 불가라 refresh 회전을 못 함 → 현재는 만료 시 /login 재이동. 후속으로 Next proxy(미들웨어)에서 refresh 회전 추가 검토. `/api/auth/refresh`(백엔드) + `/refresh`(BFF) 는 이미 있음.
- 미이관 mock 라우트들이 `getCurrentUser()`(실 백엔드)로 가드됨 → backend down 시 해당 화면 401/redirect. 데모하려면 backend 가동 필요.

### 다음
- Oracle 확보 → `backend/db/README.md` §A/B/C 로 DDL+시드+`DXAPI_SEED_ENABLED=true` → 로그인 200 端-端 검증 → M2 완료 마킹.
- 또는 **M3**(게이트웨이 4단 검증 + SQL 실행 + call_hist) 진행.

---

## ▶ 내일 재개 가이드 (2026-06-01 EOD 기준)

상태. 4커밋(`131d314`→`4954923`), 작업트리 clean, 모두 검증 green. 막힌 것 = Oracle 1개뿐.

### 0. 진입 (항상)
1. `wiki/README.md` → `02_checklist.md`(현재 어디까지) → 본 노트(왜 그렇게 했는지) 순으로 확인.
2. 빌드 전 매 세션 `JAVA_HOME` 지정 (java 가 PATH 에 없음).
   ```powershell
   $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"
   ```

### 경로 A — Oracle 확보 시 (M1/M2 마무리 우선)
`backend/db/README.md` 의 절차. 요약.
```powershell
# 1) Oracle 띄우고 (docker compose up -d  또는 사내 Oracle 접속정보 env 주입)
# 2) DDL(DBA) → seed-codes(DXAPI) → seed-meta(DXAPI)  (README §A 2~3)
# 3) 앱 기동 + 사용자 시드
$env:DXAPI_SEED_ENABLED = "true"
cd backend; .\gradlew.bat bootRun
# 4) 검증
Invoke-RestMethod http://localhost:8080/actuator/health        # db: UP
Invoke-RestMethod -Method POST http://localhost:8080/api/auth/login `
  -ContentType application/json -Body '{"id":"admin01","password":"admin01!"}'   # 200 + user + 토큰
```
성공하면. 체크리스트 M1 DDL 항목 + M2 `[~]` 항목들을 `[x]` 로, open-questions A1/A2/A3/B1/C1/C3/C5 를 `[닫힘 → wiki/01]` 로 갱신. MyBatis `User` record 자동매핑 실동작도 이때 확인.

### 경로 B — Oracle 아직 없으면 (M3 게이트웨이 진행)
`wiki/01_본개발_PRD.md` §5.1 + §8.2 기준. 게이트웨이 1차.
- `gateway/` 패키지. `GatewayController`(GET/POST `/api/sample/{apiPath}`), 4단 검증(`CertKeyVerifier` HMAC-SHA256 / `IpWhitelistChecker` CIDR / 기간 / 매핑), `SqlExecutor`(동적 DS, #{param} 바인딩), `MaskingApplier`.
- 매퍼. `ExtSystemMapper`(인증키 조회), `ApiDefMapper`(path→정의 조회), `DataSourceRegistry`(dataSrcId별 HikariDataSource).
- Oracle 없이 검증 가능. `CertKeyVerifier`/`IpWhitelistChecker`/마스킹 단위테스트(순수 로직). 실제 SQL 실행·call_hist 적재는 Oracle 대기로 둠.
- 인증키 해시. seed-meta 의 자리표시를 실 HMAC 으로 — `regenerate-key` 흐름 또는 시드 시 HMAC 계산으로 교체.

### 추천
Oracle 준비 가능하면 **A 먼저**(端-端 1개 완성 = 아키텍처 실증). 아니면 **B**로 진도. 둘 다 위 §0 진입 공통.

---

## 2026-06-01 — M3 게이트웨이 (경로 B, Oracle 없이 코드+단위테스트)

### 한 일 (`gateway/` 패키지)
- 라우팅. `GatewayController` GET/POST `/api/sample/{apiPath}` → `GatewayService.handle`.
- 4단 검증(`GatewayService.verify`). 인증키(HMAC 조회) → status ACTIVE → IP(CIDR) → 이용기간 → 매핑 API. AUTH_ESSNTL_YN=N 이면 검증 스킵.
- `CertKeyService`. 평문 cert-key → HMAC-SHA256(app.gateway.cert-hmac-secret) hex. 저장 해시와 비교(평문 미저장). disti=앞8자.
- `IpWhitelistChecker`. IPv4 CIDR 비트마스크 + localhost 허용(mockup 로직 포팅).
- `SqlExecutor`. `#{p}`→`:p` NamedParameterJdbcTemplate(literal 결합 차단). SELECT→queryForList+마스킹, 그외→update. Oracle 대문자 컬럼 소문자 정규화.
- `MaskingApplier`. none/name/phone/email/rrn/card/addr (정확 정규식 C6 후속).
- `DataSourceRegistry`. dataSrcId별 HikariDataSource 동적 생성·캐시·evict(스왑 대비).
- 매퍼 3종. ApiDefMapper(path+method, params, resps), ExtSystemMapper(findByCertHash, countMappedApi), DataSourceMapper(findById) + XML.
- `LocalDataSeeder` 확장. 시드 시 E20260509001 의 CRTFC_KEY_HASH 를 데모키 HMAC 으로 설정. 평문 `AKAD9001-DXAPIDEMO-1234ABCD-5678EF90`.

### 검증
- `gradlew build` SUCCESSFUL. 단위테스트 +13(IpWhitelistChecker 6 / CertKeyService 4 / MaskingApplier 6, 누계 23) + contextLoads.
- 무DB 스모크. 게이트웨이 라우트 매핑 확인(404 아님). DB-down 시 게이트웨이 형태 `{ok:false,code:INTERNAL_ERROR,traceId}` 반환.

### 설계/보안 결정
- BE 는 **cert-key 필수**(mockup 은 익명 허용). 누락/불일치 → INVALID_CERT_KEY.
- 인증키 조회는 `WHERE CRTFC_KEY_HASH = HMAC(plain)` 단일 쿼리(평문 비교·저장 안 함).
- **외부 노출 보안**. 게이트웨이는 외부 호출 대상 → INTERNAL_ERROR 의 내부 상세(SQL/스택)를 응답에서 제거, traceId+서버로그로만 추적. 비즈니스 에러(IP/param) detail 은 유지.
- 컨트롤러에서 service 호출 전체를 try/catch → 인프라 오류에도 항상 게이트웨이 형태+traceId.

### 미해결 / 주의
- **실제 검증·실행은 Oracle 대기**. 4단 거부 분기·SQL 실행은 MetaDB 필요. 게이트웨이 happy path 는 추가로 도달 가능한 **대상 DB** 필요(시드 DS 는 가상 호스트).
- **call_hist 적재 = M4**. 현재 GatewayService 에 `// TODO M4` 훅만. PRD §5.1 은 P0 슬라이스에 적재 포함이나 체크리스트대로 M4 로 분리.
- 인증키 조회 hash 컬럼에 인덱스 없음(현재 disti 인덱스만). 트래픽 시 `IX` 추가 검토.

### 다음
- **M4**. CallHistoryQueue(in-process BlockingQueue) + 배치 INSERT(1초/100건) + 모니터링 stats/history. GatewayService 의 TODO 지점에 enqueue 연결.
- 또는 Oracle 확보 시 게이트웨이 4단 거부·실행 통합검증(README §C 3).

---

## 2026-06-01 — M4 호출이력 적재 + 모니터링 (Oracle 없이 코드+단위테스트)

### 한 일 (`monitoring/` 패키지)
- 적재(쓰기). `CallHistoryQueue`(LinkedBlockingQueue cap 10k, 포화 시 drop+warn), `CallHistoryBatchWriter`(@Scheduled fixedDelay=1초, drainTo(100) 반복, `JdbcTemplate.batchUpdate`, @PreDestroy flush), `CallHistoryRecord`(쓰기 모델).
- 게이트웨이 배선. `GatewayService` 재구성 — `handle(...,traceId)` 가 `process()`(Processed: outcome+apiNo+extId) 호출 후 **모든 결과(성공/실패)** 를 enqueue. `verify` 는 VerifyResult(outcome+extId) 반환. 컨트롤러가 traceId 전달.
- 조회(읽기, ADMIN). `MonitoringMapper`(findSamplesSince/findHistory + XML 동적 `<where>` + `FETCH FIRST limit ROWS ONLY`), `MonitoringService`(window 5~180 / limit clamp), `MonitoringController`(stats/history, requireAdmin), `StatsCalculator`(순수 로직 — KPI+분당 시리즈, mockup statsSnapshot 포팅), `StatsResult/CallHistory/CallSample/HistoryResponse`.
- `config/SchedulingConfig`(@EnableScheduling).

### 설계 결정
- **쓰기는 JdbcTemplate.batchUpdate**(MyBatis 아님). Oracle `SEQ_CALL_HIST.NEXTVAL` 을 SQL 에 직접 두는 배치 INSERT 가 MyBatis foreach+시퀀스보다 깔끔. 읽기는 MyBatis.
- **모든 게이트웨이 결과를 한 지점(handle 끝)에서 적재**. 각 실패 분기에서 흩어 기록하지 않도록 process()가 outcome+context 반환.
- **MyBatis record 자동매핑 + alias**. 통계/이력 SELECT 는 컬럼을 record 필드명에 맞춰 `AS CALLED_AT`(→calledAt) 식 underscore alias.
- **StatsCalculator 분리** → DB 없이 시리즈 버킷/p95/비율 단위테스트 가능.
- 무음 폐기 금지(CLAUDE 품질). 큐 포화·INSERT 실패는 warn/error 로그.

### 검증
- `gradlew build` SUCCESSFUL. 단위테스트 +6(StatsCalculator 4 / CallHistoryQueue 2, 누계 29) + contextLoads(스케줄링 빈 포함 정상).
- 무DB 스모크. healthz 200(스케줄링 부팅 영향 없음), `/api/monitoring/stats`·`/history` 무토큰 → **401 UNAUTHORIZED**(ADMIN 게이트). 실제 데이터 응답·적재는 Oracle 대기.
- 참고. Oracle 없을 때 게이트웨이 호출은 api 조회(DB)부터 실패 → enqueue 안 됨(정상). 적재는 MetaDB 가동 후에만 발생.

### 미해결 / 주의
- **PARAM_JSON PIPA 마스킹 미적용**(원본 저장). C6 후속.
- 배치 INSERT 실패 시 재시도 없이 유실(로그만). 신뢰성 강화 시 재큐/DLQ 검토.
- 모니터링 화면(`(admin)/monitoring`) BFF 이관은 frontend 후속(현재 mock).
- 백엔드 가이드(`04_backend_가이드.md`) §3/5.6/6/9/11/12 갱신 완료.

### 다음
- **M5**(1차 통합): Oracle 확보 → DDL+시드 → 로그인·게이트웨이·call_hist·모니터링 端-端 통합검증 + open-questions 닫기.
- 또는 관리 CRUD(users/datasources/apis/ext-systems/approvals) 백엔드 — 05 계약 P1.
- 또는 frontend 모니터링/관리 화면 BFF 이관.

---

## 2026-06-01 — seed-codes 중복 제거 + DDL 동기화 규칙

### 문제
- `07_DBA_DDL.sql` §6 이 공통코드(EZ_CODE) 32건을 이미 INSERT 하는데, M2 때 만든 `backend/db/seed-codes.sql` 가 같은 32건 중복. 런북대로 DDL→seed-codes 순서 실행 시 EZ_CODE PK `ORA-00001` 충돌.

### 한 일
- `backend/db/seed-codes.sql` 삭제(git rm). 공통코드는 07 DDL 단일 원천.
- `backend/db/README.md` 정리. §파일 표·§A 단계·§B 에서 seed-codes 제거. 가동 절차 = 07 DDL(스키마+코드+잡) → seed-meta(데모) → 앱 사용자 시드.
- `wiki/04_backend_가이드.md` §0·§6 에 **DDL 동기화 규칙** 추가.

### 규칙 (사용자 요청, 앞으로 항상)
- **백엔드 스키마 변경 시 `07_DBA_DDL.sql` + `06_DB_모델링.md` 를 함께 갱신**. 매퍼/도메인만 바꾸고 DDL 안 고치면 운영 반영 시 깨짐.
- 공통코드 시드는 07 §6 단일 위치. backend/db 중복 금지.
- 07 은 dev·운영 공통 설치 스크립트(헤더 "대상 환경: 사내 Oracle 19c"). 운영 적용 시 placeholder 4개만 치환: 데이터파일 경로/사이징, DXAPI 비번(Vault), Partitioning 라이선스, NLS_LANG.
- 메모리 `keep-ddl-with-backend` 기록.

### 운영 대비 잔여(권장, 미도입)
- 스키마 버전 관리(Flyway/Liquibase) 미도입. 현재 07 은 일회성 설치. 관리 CRUD 들어와 스키마 진화하면 마이그레이션 도구 도입 검토.

---

## 2026-06-01 — dev Oracle 연결 + M5 端-端 통합검증 완료 🎉

### dev DB
- 동아 dev Oracle 19c. `168.115.36.230:1521/DEVORA19`(서비스명 형식), 유저 `dx`/`xowh1392`. 사용자가 구성.
- `application-local.yml` 기본값을 이 접속으로 변경(사용자 편집). dev라 비번 repo 노출 수용.
- 처음 11g XE 였으나(파티션/IS JSON/FETCH FIRST 미지원 → 부적합) 19c 로 재구성.

### 스키마 적용 (DBA 권한 없는 dx 스키마)
- 운영 07 은 DXAPI 스키마 + TS_DXAPI_* 테이블스페이스 + 파티션 전제 → dx 로는 못 씀.
- `backend/db/dev-schema.sql` 신규 = 07 의 dev 변형(테이블스페이스/파티션/스케줄러/CREATE USER 제거, call_hist 비파티션). **dx 스키마에 14테이블 생성**.
- 적용 방법. 임시 JDBC 러너(앱 코드 아님, gradle 캐시 ojdbc11 로 컴파일)로 dev-schema(73건) + seed-meta(33건) 실행, 0 실패. 러너는 검증 후 삭제.
- 게이트웨이 happy-path 데모용. `V_USER` 뷰(DXAPI_USR_USER_M 위) + `DS20260509001` JDBC_URL 을 dev DB 로 재지정.

### 통합검증 결과 (실 dev Oracle)
- health.db UP / 로그인 admin01 200+토큰 / /me admin01 / 게이트웨이 wrong-key 401 / **demo-key 200 `{user_nm:"관**"}` 마스킹** / call_hist total=2 적재 / monitoring stats·history 조회. 전부 green.
- → **M2~M4 端-端 실증 완료**. MyBatis record 자동매핑(arg-name)도 실 DB 에서 동작 확인(가이드 §11 TODO 제거).

### 트러블슈팅 (CLAUDE.md §10)
- **ORA-00942**. dx 스키마에 테이블 없어서(07 미적용) → dev-schema.sql 로 해결.
- **IP_NOT_ALLOWED (실버그)**. demo-key 호출이 `client ip 0:0:0:0:0:0:0:1`(IPv6 loopback 확장형)으로 거부. `IpWhitelistChecker.isLocalhost` 가 `::1` 만 보고 확장형 누락 → `0:0:0:0:0:0:0:1` 추가 + 테스트. 수정 후 200.

### 주의
- `dev-schema.sql` 은 07 파생물 → 07 바뀌면 함께 갱신(헤더 명시). [[keep-ddl-with-backend]].
- V_USER 뷰·DS 재지정은 dev 데모용 임시 상태(운영 무관).

### 다음
- open-questions A1/A2/A3/B1/C1/C3/C5 `[닫힘]` 정리(M5 잔여).
- 관리 CRUD 백엔드(05 P1) / frontend 화면 BFF 이관(이제 backend 가동되니 데모 가능) / Testcontainers 자동 통합테스트.

---

## 2026-06-01 — 관리 CRUD 5도메인 완료 (05 P1)

도메인별 커밋 증분. 각각 dev Oracle 端-端 검증. 패턴 = 도메인 record + DTO + XxxAdminMapper(+XML) + Service(검증·채번·부수효과) + Controller(AuthSupport.requireAdmin) + Mockito 단위테스트.

- **users**(§3). 목록(q/status)·단건·PUT(role/status, self-guard)·DELETE(soft=INACTIVE).
- **datasources**(§5). 채번 DS+date+seq, 중복명, 삭제 시 참조 API IN_USE 차단, 변경/삭제 시 `DataSourceRegistry.evict`(게이트웨이 풀 hot-swap). DB_ENC_PW 평문(C7).
- **ext-systems**(§6). 채번 E+date+seq, 인증키 서버 생성(`CertKeyService.generate`)·HMAC 저장·평문 1회 노출, regenerate-key, mappedApis full-replace, allowedIps JSON(CLOB). **새 키로 게이트웨이 호출 200 검증**.
- **apis**(§4). 채번 A+date+seq, REQ_PATH 유니크(check-path), dataSrc 검증, 자식 params/resps full-replace, 매핑 시 삭제 차단.
- **approvals**(§7). user/api 목록 + 승인/반려. 승인 부수효과 = 회원가입→사용자 ACTIVE, API사용→연계시스템 매핑 추가. PENDING 가드(ALREADY_PROCESSED).

### 공통 추가물
- `common/ItemsResponse`(목록 래퍼), `auth/AuthSupport`(requireLogin/requireAdmin), `ErrorCode` +CANNOT_UPDATE_SELF/IN_USE/ALREADY_PROCESSED.
- `GlobalExceptionHandler`: 본문 JSON 파싱 실패 → 400(기존 500 갭).
- **`mybatis.configuration.jdbc-type-for-null=NULL`** — Oracle nullable insert 파라미터 ORA-17004 방지(ext-system create 에서 발견). 모든 insert 매퍼가 의존.

### 검증
- `gradlew build` SUCCESSFUL. 단위테스트 **57종**. 각 도메인 dev Oracle 端-端(목록/생성+채번/수정/삭제/차단/부수효과) green.

### 미구현(P2) / 차이
- import/export, test-connection, validate-sql 미구현(05 §12 P2).
- approve 응답을 `{approval}` 만 반환(05 의 `{approval,user/extSystem}` 대비 축약). 부수효과는 수행됨, 재조회 가능. BFF 흡수.

### 다음
- frontend 관리/모니터링 화면 BFF 이관 / P2 기능 / Testcontainers 자동 통합테스트 / dev-01 PR.

---

## 2026-06-02 — 잔무 정리(open-q C4) + 갭#4b 연계별 레이트리밋

### 잔무 (핸드오프 위생)
- **open-q C4 닫힘**. 설계로그상 닫혔으나 `open-questions.md` 표가 `[열림]` 잔존 → `[닫힘 — 2026-06-01]`(HTTP method 기반 동사 정책) + 닫힌항목 §추가 + 잔여목록서 C4 제거. 체크리스트 M5 line79 틱(A1~C5+C4).

### 갭#4b 연계별 레이트리밋 override (스키마)
- **목적**. #4a 전역 분당한도에 더해 연계시스템마다 개별 한도. 폭주 소비자만 좁게 조임.
- **의미 결정**. `RATE_LMT_PER_MIN` NULL=전역 기본 상속, 0=무제한(`RateLimiter` `<=0` 규약 일치), >0=개별. 음수 admin 거부.
- **구현**. ExtSystemAuth/ExtSystem(+필드) → 게이트웨이 ExtSystemMapper.xml findByCertHash SELECT +컬럼 → GatewayService VerifyResult 가 override 운반, `process()` effective = 컬럼값 우선·NULL→전역. RateLimiter 무변경. admin CRUD(Request 2종/Response/Service `validateRate`/AdminMapper+XML insert·update). FE types/api.ts·lib/schemas/extSystem.ts·ExtSystemForm 입력 필드(BFF 라우트는 reqBody 통째 포워딩 무변경).
- **스키마 동기화**([[keep-ddl-with-backend]]). 07_DBA_DDL·dev-schema·06_DB_모델링 에 `RATE_LMT_PER_MIN NUMBER(6)` + `CK_EXT_SYS_RATE`. dev Oracle 은 일회용 JDBC 러너로 멱등 ALTER(존재확인 후 add) 후 폴더 삭제.
- **검증**. `gradlew build` SUCCESSFUL(ExtSystemServiceTest 인자갱신+음수거부 신규). `bun run build` 성공. **端-端(실 dev Oracle)**: 데모키 한도=2 PUT→GET 확인→게이트웨이 3연속 **200·200·429(RATE_LIMITED)**. 검증 후 데모키 0(무제한) 복원.
- 상세 = [`06_보안강화_설계.md §4·§6`](../guide/06_보안강화_설계.md).

### 주의
- update 의 `<if rateLmtPerMin != null>` → 일단 설정 후 API 로 NULL(전역 상속) 복귀 불가. 무제한은 0. 전역 복귀 필요 시 직접 SQL `SET ... = NULL`.
- 데모 시스템 E20260509001 은 현재 `RATE_LMT_PER_MIN=0`(무제한, dev 검증 잔재). 운영 무관.

### 다음
- 보안 잔여 = C7 Vault(마스터키 env 평문 승격) / P2 import(백엔드 bulk) / Testcontainers / dev-01 PR. #5 셀프서비스=스킵(내부운영).

---

## 2026-06-03 — UI 라벨 정리 + 환경/버전 칩 실연동 + 사용자 가이드(wiki)

### 작업
- **"Mockup" 라벨 제거**(3ae4a41). 데이터는 실 DB인데 헤더·로그인·탭제목의 "Mockup" 표기가 mock 오해 유발 → `components/AppHeader.tsx`·`app/(auth)/layout.tsx`·`app/layout.tsx` title 3곳 제거.
- **상단 환경/버전 칩 실연동**(31a27c4). 하드코딩 가짜 "prod · ap-northeast-2"/"v2026.05.0" → 실값. `ops/VersionInfo.env`(활성 Spring 프로필, 미지정 시 default=local) 추가 → `/api/_ops/version` 노출, `AppShell` props 화(env/version), `app/(admin)/layout.tsx` 서버 fetch 주입. `docs/guide/04_backend_가이드.md §5.5` 갱신.
- **사용자 가이드 wiki**(4e38f33). `docs/user-guide/` 12파일 — 관리자 콘솔 + 외부 API 호출(X-Cert-Key·4단검증·응답봉투·에러코드·curl). mock 기능 🚧 배지. `docs/README.md` 진입 링크 추가.

### 시행착오
- **"mockup으로 보임" 오진.** 사용자가 mock 의심 → 조사하니 데이터는 처음부터 실 dev Oracle(BFF 끝까지 admin01 실 3명 반환). 원인은 데이터 아닌 **UI 라벨**("Mockup" 태그 + "prod·region" 가짜 칩). 교훈 = "mock 같다" 신고는 데이터/라벨 분리 진단.
- **health 바이트배열 오해.** PowerShell `Invoke-WebRequest .Content` 가 byte[] 로 출력돼 "DB 연결 안 됨"으로 오독. `Invoke-RestMethod` 로 파싱하니 db UP(처음부터 정상).
- **커밋 제목 오염.** Bash 툴에 PowerShell here-string `@'...'@` 써서 제목에 `@` 누출 → `git commit --amend -m ... -m ...`(다중 플래그)로 재작성. 교훈 = Bash 툴엔 `$'...'` 또는 다중 `-m`.
- **에이전트 계약 추정 오염.** Explore 에이전트가 FE mockup 잔재 보고 헤더 `certification-key:`·봉투 `success/error` 로 추정 → 코드 진실로 정정: 헤더 `X-Cert-Key`(`gateway/GatewayController.java:52`), 봉투 `{ok,data?,code?,detail?,traceId}`(`gateway/GatewayResponse.java`). done 페이지 curl 은 mockup 잔재. 교훈 = 에이전트 결과의 계약값은 코드로 재검증.

### 검증
- 백/프론트 백그라운드 가동, `/actuator/health` db UP(실 Oracle).
- env 칩: `/dashboard` HTML 에 `local`·`0.0.1-SNAPSHOT` 존재·`ap-northeast-2` 제거 확인. `/api/_ops/version` → env=local. 백엔드 `compileJava` EXIT=0.
- 가이드: 12파일+교차링크 정합, 한국어 콜론 종결 0건, 실서버 `GET /api/sample/sample-user-info`(키 없이) → `401 {"ok":false,"code":"INVALID_CERT_KEY","traceId":...}` 로 봉투 일치 확인.

### 다음
- 변동 없음. Vault(C7) / 테스트격리(Testcontainers) / dev-01 PR.
- 🚧 실연동 잔여(라벨 아닌 기능): 회원가입·비번찾기·본인정보수정/비번변경·인시던트 자동감지·알림규칙.
- 핸드오프(구동법·진입순서·⚠SECRET_KEY) = [`01_핸드오프.md`](01_핸드오프.md).

---

## 2026-06-06 — AI 초안등록(MCP) PRD 확정 (구현 전 계획)

### 한 일
- 신규 PRD [`02_AI초안등록_PRD.md`](../product/02_AI초안등록_PRD.md) — AI(MCP)가 API 정의를 DRAFT 초안으로만 등록, 활성화는 사람. Explore 2 + Plan 1 에이전트로 기존 구성 분석 후 작성(코드 변경 0).
- open-questions §K 신설(K0-a·K0-b 닫힘 + K1~K7 열림), checklist AI-M1~M3 추가, README 라우팅 갱신.

### 결정 (사용자 확인)
- **K0-a role `AI` 신설** + `requireAdminOrAi`. ADMIN 재사용 기각 — 핵심 근거 = **현 `ApiDefService.create()` 는 요청 status 를 그대로 수용**(미지정 시에만 DRAFT). ADMIN 토큰이면 즉시 ACTIVE 생성 가능 → "초안만" 원칙이 서버에서 강제 안 됨.
- **K0-b AI 초안 SQL = 사람과 동일(쓰기 포함)**. C4 SqlPolicy 그대로(DELETE·DDL 상시 거부). 부주의 승인 리스크는 R4 — user-guide 승인 체크리스트(M3)로 완화.
- 승인 플로 = 승인테이블 무변경(AI 생성 DRAFT → 관리자가 기존 목록에서 ACTIVE 전환). 신규 승인타입(API_DEF)은 K3 후속 — `approveApi` 는 연계시스템 "사용 신청" 승인용이라 정의 활성화와 별개임을 확인.
- MCP = Node/TS stdio, `mcp/` 신설, REST 1:1 래핑(backend 수정 0). Spring AI 내장 기각(수명주기 결합).

### 조사에서 확인한 사실 (구현 시 의존)
- FE 에 DRAFT 필터·배지 기존재(`ApiListTable.tsx`) → 승인 화면 신설 불필요.
- REGID 가 insert actor 로 이미 기록 → AI 식별 신규 컬럼 불요. 활성화 감사 = MODID/MODDT.
- `ROLE_DVCD` 에 CHECK 제약(`07_DBA_DDL.sql` CK_USR_USER_ROLE) → role 추가는 additive ALTER + EZ_CODE 1행 + 계정 시드.
- `gateway/RateLimiter` 재사용 가능(분당 고정윈도). 스키마 메타 조회 엔드포인트는 없음 → SchemaService 신설(Oracle 딕셔너리 직질의 — DatabaseMetaData 는 remarksReporting 없이 코멘트 null).
- 5회 로그인 실패 자동 INACTIVE → MCP 클라이언트는 재로그인 무한루프 금지(서비스계정 잠금 유발).
- open-questions 의 G 는 이미 마이그레이션 섹션 → AI 연동은 **K** 로 부여(에이전트 제안 G 와 충돌, 수정함).

### 다음
- **AI-M1**(backend 최소변경) 착수 — DDL 3건부터. 체크리스트 = [`02_checklist.md`](02_checklist.md) AI-M1.

---

## 2026-06-06 — AI-M1 backend 구현 (코드 完, dev Oracle 네트워크 대기)

### 한 일
- **DDL additive** — 07_DBA_DDL(CHECK +'AI'·EZ_CODE 1행·ai-mcp01 시드 §6 추가, 코드시드 30→31)·dev-schema·06 모델링·07 요청서 동기화([[keep-ddl-with-backend]]).
- **role AI** — `AuthSupport.requireAdminOrAi`/`isAi`, `UserService.ROLES` +AI.
- **apidef** — 컨트롤러 가드 5곳 교체(list/get/create/validate-sql/check-path), create 에 AI 분기: RateLimiter(`ai-create:{userId}`, `app.ai.create-per-min` 기본10) + `ApiDefService.create(req,actor,aiActor)` 가 **status 무시 DRAFT 강제** + `countDraftsByRegid` 상한(기본50). `ApiDef`/`ApiDefResponse` 에 `regId` 노출(REGID AS REG_ID alias), `findAll(q, regId)` mine 필터.
- **datasource** — `SchemaService` 신규(USER_TAB_COMMENTS/USER_TAB_COLUMNS+USER_COL_COMMENTS 직질의, 테이블 상한 500, 2단계 응답, TTL 캐시 600s, `evict` 를 DataSourceService update/delete/swap 에 훅). `GET /{id}/schema?table=` 엔드포인트. AI 의 DS 목록 응답은 jdbcUrl·dbUser null 처리.
- **시드** — `LocalDataSeeder.seedAiAccount()` 독립 멱등(기존 사용자 있어도 ai-mcp01 만 보충, 실패는 warn). 비번 `ai-mcp01!`(데모 관례).
- **테스트** — ApiDefServiceTest +3(DRAFT 강제/상한/타건 403), AuthSupportTest 5, SchemaServiceTest 5. 누계 57→67, `gradlew build`+`test` green.
- **문서** — 05 §4·§5(ADMIN·AI 표기+schema 행), 04 가이드 §3/§7/§8/§12.

### 결정
- 스키마 질의는 `USER_*` 뷰(접속계정 현재 스키마 한정) — ALL_* 대비 노출 최소, dev 의 V_USER 같은 뷰 포함 위해 TABLE_TYPE IN ('TABLE','VIEW').
- AI 상한 초과 = `INVALID_INPUT`(400), 분당 한도 = `RATE_LIMITED`(429) — 기존 ErrorCode 재사용, 신설 없음.
- 테이블명은 바인드 + 식별자 regex 이중 검증(인젝션 방어).

### 검증
- 단위 67종 green. 무DB 스모크: bootRun 후 `GET /{id}/schema`·`GET /api/apis`·`POST validate-sql` 무토큰 전부 **401**(라우팅·가드 배선 OK), healthz 200.

### 미해결 / 주의
- **dev Oracle(168.115.36.230) 현 네트워크에서 TCP 불가** — DDL 적용·AI 계정 시드·통합검증 전부 대기. 멱등 러너 = `backend/db/migrate/Migrate.java`(적용 후 폴더 삭제). 적용 순서: Migrate 실행 → `DXAPI_SEED_ENABLED=true` 부팅(ai-mcp01 시드) → 체크리스트 AI-M1 통합 항목 검증.
- 구 스키마(CHECK 미반영) 상태에서 seed 부팅하면 AI 계정 INSERT 가 ORA-02290 으로 warn 후 계속(부팅 안전).

### 다음
- dev Oracle 네트워크에서 통합검증(AI-M1 잔여 2항목) → **AI-M2** `mcp/` 서버(stdio, 도구 7종 — backend 변경 0).

---

## 2026-06-06 — AI-M2 MCP 서버 구현 (backend 변경 0)

### 한 일 (`mcp/` 신설)
- **스택**. Node/TS + `@modelcontextprotocol/sdk` 1.29.0 + zod. `McpServer.registerTool(name, {description, inputSchema(zod raw shape)}, cb)` + `StdioServerTransport` (설치본 d.ts 로 API 검증 — `tool()` 은 deprecated).
- **`src/client.ts`**. 토큰 수명주기 — 첫 호출 시 로그인(`{id,password}`), JWT exp 파싱해 만료 30초 전 refresh(회전 대응), 401 시 2초 백오프+재로그인 **1회만**, 자격증명 누락 시 fail-fast. 로그인 실패는 재시도 없이 오류 반환(5회 잠금 회피, R6). backend 오류 봉투(message·issues)를 `DxapiError` 로 보존.
- **`src/tools.ts`**. 도구 7종 = REST 1:1(R7, 로직 없음). 예외 = `draft_api` 만 validate-sql+check-path **선검증 합성**(backend 변경 0) 후 등록, status 필드 미전송(서버 DRAFT 강제와 이중 안전). 오류는 isError content 로 그대로 노출 — AI 의 SQL 수정 루프 가능.
- **`smoke.mjs`**. stdio JSON-RPC 직접 — initialize→tools/list(7종 일치)→tools/call. 유지(체크리스트 verify 용).
- README(.mcp.json 예시·자격증명 절차·한도) + .gitignore. docs/README 라우팅 1줄.

### 검증
- `npm run build`(tsc) EXIT=0. 스모크: 도구 7종 등록 일치 + check_path 호출 → backend 도달, 로그인 실패(DB down → 500)가 **단발 오류로 반환**(재시도 루프 없음 — 설계 그대로). 실데이터 검증·端-端은 Oracle 보류 섹션 선행 필요.

### 주의
- 스모크의 tools/call 타임아웃은 90초 — DB 무응답 시 백엔드 커넥션 타임아웃(30s+)까지 기다린다.
- mcp 서버 로그는 stderr 전용(stdout = JSON-RPC 채널).
- 사용자 결정(2026-06-06): **dev Oracle DDL 적용은 보류** — 체크리스트 "⏸️ 보류" 섹션에 사내망 절차 5단계 등록.

### 다음
- 사내망에서 보류 섹션 1~4 → AI-M1 통합 + AI-M2 실데이터·端-端 검증.
- 이후 docs/00_전체조망 매트릭스에 AI 초안등록 행 추가(검증 완료 시점).

---

## 2026-06-06 — AI-M3 일부 선진행 (FE 배지 + 승인 체크리스트)

### 한 일
- **FE "AI 생성" 배지**. `types/api.ts` apiDefSchema 에 `regId` optional 추가(backend 가 이미 반환). `ApiListTable.tsx` — 상태 배지 옆 보라(`w-badge--violet`) "AI" 배지, `regId.startsWith("ai-")` 관례로 식별(서비스계정 ai-mcp01), title 에 승인 경고, `data-testid="ai-badge"`.
- **user-guide R4 완화**. `04_API관리.md` 에 "AI 가 등록한 초안 — 승인 전 검토 체크리스트" 섹션 — 쓰기 SQL 경고(INSERT/UPDATE/MERGE 는 정책 통과함을 명시), 6항목 체크리스트(SQL·마스킹·파라미터·경로·인증/노출·DS), AI 계정 킬스위치·한도 안내.

### 결정
- AI 식별 = **regId 'ai-' prefix 관례** (FE 하드코딩 'ai-mcp01' 대신 — 계정 추가 시 무수정). 별도 컬럼·role 조회 없음.
- BFF 무변경 — apis 라우트는 응답 통째 중계라 regId 자동 통과.

### 검증
- `eslint`(변경 2파일) 0 / `tsc --noEmit`(npx typescript@5) 0. **화면 표시 확인은 Oracle 보류 후**(현 환경 로그인 불가 — DB down). 대기 DRAFT KPI 타일은 미착수(후속).

### 다음
- 변동 없음 — 사내망 보류 5단계가 선행. 그 검증 때 AI 배지 표시도 함께 확인.

---

## 2026-06-07 — 새 dev Oracle 전환 + AI 초안등록 전체 통합검증 완료 🎉

### dev DB 교체 (사용자 구성)
- 신규 = `jdbc:oracle:thin:@//cramis-macbookpro.tail181647.ts.net:1521/freepdb1`, 유저 `dxapi`/`dxapi6805` — **Oracle AI Database 26ai Free(23.26)**, Tailscale 경유(MacBook). 구 사내 `168.115.36.230/DEVORA19` **폐기**.
- TCP·JDBC 접속 확인 → `application-local.yml` 기본값 교체 → 빈 스키마에 일회용 JDBC 러너로 `dev-schema.sql`(75건)+`seed-meta.sql`(34건) 설치 + 데모 배선(V_USER 뷰, DS20260509001 → 본 DB 재지정·평문 PW passthrough). 러너는 적용 후 삭제.
- 새 DB 는 dev-schema 가 AI role 포함이라 **구 보류 5단계(Migrate.java) 불요** → `backend/db/migrate/` 삭제, 체크리스트 보류 섹션 해소.

### 버그 2건 발견·수정 (검증 중)
- **시더 순서버그**(AI-M1 잔재). `seedAiAccount()` 가 먼저 들어가면 빈 DB 에서 `count>0` → 데모 사용자 시드 스킵. count 쿼리를 `WHERE USER_ID NOT LIKE 'ai-%'` 로 — 첫 부팅에서 실증, 수정 후 데모 3명+인증키 정상.
- **mcp tools.ts 필드 불일치**. validate-sql 실제 응답 = `{valid, plan, message}` (PRD §7 표기 allowed 와 다름) → draft_api 선검증이 항상 실패할 뻔. `allowed→valid`, `reason→message` 수정. 교훈 = 계약값은 실응답으로 재검증(06-03 教訓 재현).

### 통합검증 (전부 green, 실 DB)
- admin·ai-mcp01 로그인 / AI DS 목록 접속정보 제외 / schema 15테이블·V_USER 컬럼 / validate-sql valid / **create: status ACTIVE 요청 → DRAFT 강제 + regId=ai-mcp01**(A20260607001) / AI PUT·DELETE 403(전체 body 로 검증 — `{"status":...}` 단독은 @Valid 400 이 가드보다 먼저) / AI 목록 자기 건만·타건 403 / ADMIN ACTIVE 전환 / 연계 매핑 추가 → **게이트웨이 200 + name 마스킹(`A******`)**.
- MCP 도구 7종 실호출 풀스위트 green — draft_api 가 A20260607002 DRAFT 등록.
- `gradlew test -Dit.devdb=true` BUILD SUCCESSFUL (단위 67 + 수용 IT, 새 DB).
- FE — BFF 로그인 → `/api-list` HTML 에 **ai-badge 2건 렌더** 확인.

### 주의
- 새 dev DB 는 **Tailscale 연결 + MacBook Oracle 기동** 전제. health db DOWN 이면 그것부터 확인.
- AI 데모 잔재 — A20260607001(ACTIVE, E20260509001 매핑), A20260607002(DRAFT) 존재.
- 핸드오프·backend/db/README·guide04 의 접속정보 갱신 완료. 이력 기록(과거 DEVORA19 언급)은 보존.

### 다음
- AI-M2 잔여 1건 — Claude 호스트에 `.mcp.json` 연결해 **대화 레벨 端-端**(도구 레벨은 검증 완료).
- docs/00_전체조망 매트릭스에 AI 초안등록 행 추가 / AI-M3 잔여(KPI 타일, K2~K5).

---

## 2026-06-07 — API Try-it(테스트 실행) PRD 확정 (구현 전 계획)

### 한 일
- 신규 PRD [`03_API테스트실행_PRD.md`](../product/03_API테스트실행_PRD.md) — 콘솔(마법사 4단계·수정화면)과 공개 /docs 에서 API 실제 실행. Explore 1 + Plan 1 에이전트 조사 후 작성(코드 변경 0).
- open-questions §L 신설(L0 닫힘 3건 + L1~L6), checklist TI-M1~M4, README 라우팅.

### 결정 (사용자 확인 3건)
- 범위 = **두 표면 모두, 콘솔 먼저**. / 콘솔 DML = **실행 후 롤백**(CALL 차단). / **/docs DRAFT 노출 갭 동반 수정**(listDocVisible ACTIVE 1줄).

### 조사에서 확인한 사실 (구현 시 의존)
- 마법사 "테스트 실행" = Stepper 라벨만 있고 **탭 미구현**(ApiForm TABS 4개). /docs 는 buildCurl() 까지만.
- api-list "상세" = edit 화면 그 자체 → 5번째 탭 하나로 상세·마법사 둘 다 해결.
- backend CORS 설정 전무 → /docs 는 BFF 공개 프록시(`/api/try/{path}`)로 우회(게이트웨이 무수정).
- `datasources/test-connection` = ad-hoc 테스트 엔드포인트 직접 선례. SqlExecutor 는 maxRows·timeout 미설정(옵션화 용이).
- 게이트웨이 rate-limit 은 인증 블록 안 → 익명 API 는 한도 없음(기존 동작, L4).
- publicDocs 가 DRAFT 도 노출(docVisible 만 필터) — 06-07 /docs 트러블슈팅에서 발견한 갭, 본 PRD 로 닫기로.

### 다음
- **TI-M1**(backend test-run) 착수 — 체크리스트 = [`02_checklist.md`](02_checklist.md) TI-M1.

---

## 2026-06-07 — TI-M1 backend test-run 구현·검증 완료

### 한 일
- `apidef/TestRunService`(+Request/Result) — ad-hoc 실행: method·DS 검증 → SqlPolicy(등록과 동일 기준) → CALL 등 비지원 동사 차단 → 커넥션 수동(autocommit off, `SingleConnectionDataSource(con, true)` 래핑) → SELECT(maxRows·queryTimeout, `SqlExecutor.mask` 재사용)/DML(update) → **finally 무조건 rollback**. 오류는 루트 메시지(ORA-)를 issues 로 그대로.
- `SqlExecutor` — `toNamed` public 화 + `mask(rows, ruleByCol)` 공용 추출(기존 maskRows 가 위임).
- `ApiDefController` `POST /test-run`(requireAdmin + RateLimiter `"test-run:"+userId`), `application.yml` `app.test-run.{per-min:30, timeout-sec:10, max-rows-cap:1000}`.
- 문서 — 05 §4 행, guide04 §3·§12. 단위 `TestRunServiceTest` 4종(누계 71).

### 검증 (실 dev DB)
- SELECT+마스킹 `관**` / maxRows=1 `limited:true` / **UPDATE 롤백 실증**(affected=1·rolledBack=true, dept_nm "학사지원처" 원상) / AI 토큰 403 / CALL 400·DDL 400·ORA-00942 노출 / call_hist seq 113→113 미적재. `gradlew test` green.

### 트러블슈팅 (CLAUDE.md §10)
- `ApiException.getMessage()` = code.name() — 상세는 `issues()`. 테스트 단언을 issues 로 수정.
- bash 직접 `-d` 한글 body 가 INVALID_INPUT(JSON 파싱 실패) — **파일 경유 `--data-binary @file` 은 정상**. 서버 무결, 셸 인코딩 함정(PS 에 이어 bash 도). 검증 스크립트는 한글 페이로드를 파일로.

### 다음
- **TI-M2** 콘솔 FE — TryItPanel + ApiForm 5탭 + BFF route.

---

## 2026-06-07 — TI-M2 콘솔 Try-it FE 완료

### 한 일
- `components/TryItPanel.tsx` 신규(공용) — params 메타 기반 입력폼(boolean 은 select, defaultValue 프리필, required 검사), 타입 변환(number/boolean) 후 execute(props) 호출, 응답 JSON 뷰 + 배지(성공/실패·rowCount·elapsedMs·행 제한·롤백됨), 非GET confirm 문구 주입형. docs 모드(M3)에서 재사용 전제.
- `ApiForm` — TabId/TABS 에 "test" 추가(5탭, Stepper 라벨과 정합), 패널에서 **폼 상태 그대로** test-run 전달(저장 전·미저장 수정분·DRAFT 동일 경로).
- BFF `app/api/mock/apis/test-run/route.ts` — 봉투 그대로 중계(평탄화 없음 — TryItPanel 이 ok/data/issues 직접 해석).
- e2e `e2e/tryit.spec.ts` — 로그인→A20260607004 편집→테스트 실행 탭→실행→실 DB rows 단언. user-guide 04 4단계 실사용 설명.

### 검증
- eslint 0 에러(react-hook-form watch 경고 1건은 기존 패턴 동일) / tsc 0 / **e2e tryit.spec green(13.9s)**.

### 부수 발견 (미수정 — 기존 드리프트)
- `e2e/real-backend.spec.ts` 의 `api-row` **5건 고정 단언** — AI 데모 4건 추가로 현재 9건이라 실행 시 실패할 것. 내 변경과 무관(데이터 드리프트). 수정 시 개수 단언을 `>=5` 또는 시드 텍스트 존재 단언으로 완화 권장.

### 다음
- **TI-M3** /docs Try-it — `/api/try/[path]` 공개 프록시 + DocsViewer 패널 + listDocVisible ACTIVE 필터.

---

## 2026-06-07 — TI-M3 /docs Try-it + DRAFT 필터 완료 (Try-it 전 마일스톤 종료)

### 한 일
- `app/api/try/[path]/route.ts` 신규 — 무인증 게이트웨이 프록시(GET/POST, X-Cert-Key·query/body·XFF forward, 봉투 그대로). backend 게이트웨이 무수정.
- `DocsViewer` — 상세에 "직접 실행(Try it)" 카드: authRequired 면 키 password input(메모리만, `key={no}` 로 API 전환 시 패널 리셋), TryItPanel docs 모드(非GET = 실데이터 변경 confirm). 게이트웨이 응답(data 배열) 건수 배지 위해 TryItPanel 타입 보강.
- backend `listDocVisible` 에 ACTIVE 필터 — /docs·openapi.json 에서 DRAFT 제외(기존 갭 닫음).
- e2e `docs-tryit.spec.ts` 2종 + user-guide 10 "직접 실행" 섹션.

### 검증
- backend test green / FE eslint·tsc 0 / e2e 2종 green(8s) — DRAFT 미노출 + 오답키 실패→정상키 성공·user_id 실데이터.
- /docs 경유 호출이 call_hist 에 적재 확인(seq 201 401·202 200) — "진짜 호출" 정책대로.

### 주의 (e2e 작성 함정)
- /docs Try-it 정상키 검증은 **연계시스템에 매핑된 API**(sample-user-info)로만 가능 — 미매핑 API 는 정상키도 `API_NOT_MAPPED`.

### 다음
- Try-it 기능 완료(TI-M1~M3). 잔여 = TI-M4 선택(open-q L1~L6) / real-backend.spec 5건 단언 드리프트 / dev-01 PR.

---

## 2026-06-07 — 잔여 B1·B2 + 위생 A2~A4 + main 병합(9차)

### 한 일
- **B1**. repo 루트 `.mcp.json` 동봉(dev 자격증명) — Claude Code 재시작 시 dxapi MCP 자동 연결. **대화 레벨 端-端 검증은 재시작 후 1회 남음**. mcp/README 에 빌드 선행(npm install+build — dist 미커밋) 안내.
- **B2**. 대시보드 할 일에 "AI 초안 대기" 타일(regId `ai-*` 且 DRAFT, 보라 배지).
- **A4**. AI 데모 API 정리 — 001 매핑 해제 후 001~003 삭제, **A20260607004 는 e2e 의존으로 유지**(시드 5+1=6건).
- **A3+stale 단언 정리**. real-backend(api-row·user-row 고정 개수 → 최소치+텍스트, ai-mcp01 추가), day1-smoke #3·#7 — **/docs 공개 정책으로 갱신**(옛 "관리자 모드"·"로그인 필수" 단언 제거). 교훈: `expect(await count())` 는 auto-wait 없음 — 가시성 단언 먼저.
- **A2**. 전체조망 §3.1 에 AI 초안등록·API Try-it ✅ 행.
- **main 병합 9차** — 주의 2건 발견·해결: ① origin/main 에 **타 세션의 8차 병합+핸드오프 영구화(0ca05e2)·`.codex`/`AGENTS.md`** 가 먼저 푸시돼 있었음 → origin/main 머지(충돌 0) 후 푸시. ② 복원태그 -8 은 타 세션이 선점 → 이번 = `pre-dev01-merge-9`(2276b75). main `a2fbe73`·dev-01 동기화 완료.

### 검증
- e2e 4 spec **15/15 green**. tsc 0. dashboard 기존 lint 위반 2건(라인 106 setState-in-effect·189 Date.now — 본 변경 무관) 미수정 잔존.

### 다음
- Claude Code **재시작 → 대화로 "○○ API 만들어줘" 1회**(B1 마감). 잔여 = TI-M4/open-q 결정들 / Vault(C7) / dashboard lint 2건.
