> dev-01 본 개발 중 내린 결정과 근거 로그. 작업하며 계속 append 한다. 다음 세션이 재유도 없이 이어가기 위한 문서.

# 03. Context Notes — dev-01

> 새 결정·트레이드오프가 생길 때마다 맨 아래에 날짜와 함께 추가. 지우지 말 것(이력).

---

## 2026-05-31 — 본 개발 착수 결정 4종

PRD 작성 전 사용자 확인으로 잠근 결정.

### 1. 백엔드 스택 = Spring Boot + Java 21 + MyBatis + HikariCP
- **왜**. [`06_DB_모델링.md`](../doc/Dau.DX.API_개발계획/06_DB_모델링.md) 가 이미 HikariCP·ojdbc·Virtual Threads 를 전제로 작성됨(JVM 가정). SQL-to-REST 워크로드라 동적 SQL·결과셋 매핑이 핵심 → ORM(JPA)보다 MyBatis 가 자연스럽다. 사내 Java 자산 가정.
- **닫은 open-q**. A1, A2, A3.
- **대안 기각**. NestJS(TS 공유 이점 있으나 node-oracledb·멀티DB 풀 성숙도 부담), FastAPI(06 의 JVM 전제와 불일치).

### 2. 프런트엔드 = mockup Next.js 승격 + BFF
- **왜**. mockup 의 12화면·컴포넌트를 100% 재사용. 브라우저에 JWT 노출 안 하려고 Next route handler 를 BFF(프록시)로 두고 세션 쿠키(httpOnly)는 BFF 가 관리. `/api/mock/**` 는 제거.
- **대안 기각**. 순수 SPA + 직접 호출 — 더 단순하나 인증키/세션 노출 표면이 커짐.

### 3. dev-01 1차 범위 = P0 수직 슬라이스
- **왜**. [`05 §12`](../doc/Dau.DX.API_개발계획/05_api_연결목록.md) P0 정의. 端-端 1개(로그인 → 게이트웨이 호출 → 모니터링 확인)를 먼저 관통시켜 아키텍처를 실증하고, 나머지는 동일 패턴으로 확장. 전체 일괄은 리뷰·롤백 단위가 너무 커짐.
- **제외**. CRUD 대부분, import/export, 승인, 인시던트 → 후속 PR.

### 4. 문서 = wiki/ 폴더 신설
- **왜**. 기존 계획 문서(`doc/`)와 물리 분리. 본 개발 전용 위키 트리(README + PRD + checklist + context-notes). CLAUDE.md §7(Plan+Checklist+Context Notes) 충족.

---

## 추가 잠금 (PRD §2 에서 함께 닫음)

- **C1 cert-key = HMAC-SHA256** (장기 키, 평문 미저장, 앞 8자 식별저장). 06 의 `CRTFC_KEY_HASH`/`CRTFC_KEY_DISTI_TEXT` 컬럼 구조에 정합.
- **C3 비밀번호 = bcrypt cost 12**. 06 코멘트 명시.
- **C5 JWT = Access 15분 / Refresh 24시간**, Refresh 는 `DXAPI_REFRESH_TOKEN_L` revoke. A5(Redis 미사용) 정합.

> 위 7개(A1/A2/A3/B1/C1/C3/C5)는 [`open-questions.md`](../doc/Dau.DX.API_개발계획/open-questions.md) 에서 아직 `[열림]`. M5 에서 `[닫힘 → wiki/01]` 로 갱신 예정(체크리스트 M5).

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
