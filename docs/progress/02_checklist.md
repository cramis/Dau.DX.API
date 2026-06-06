> dev-01 1차(P0 수직 슬라이스) 작업 체크리스트. 작업하며 ☐ → ☑ 로 갱신한다.

# 02. dev-01 체크리스트 — P0 수직 슬라이스

대상 범위는 [`01_본개발_PRD.md §5`](../product/01_본개발_PRD.md). 마일스톤 단위로 묶었다. 각 항목 끝의 **verify** 가 완료 판정 기준(CLAUDE.md §4).

---

## M1. 백엔드 스캐폴드 + MetaDB 연결

> 상태(2026-06-01). 코드·빌드·런타임 검증 완료. DDL 실행+시드만 Oracle 인스턴스 대기.

- [x] `backend/` Spring Boot 3.5.14 + Java 21 프로젝트 생성 (Gradle Kotlin DSL) → verify: `gradlew build` BUILD SUCCESSFUL, jar bootRun 부팅 OK
- [x] MyBatis + HikariCP + ojdbc11 의존성 추가 → verify: contextLoads 테스트 통과 (Oracle 없이 컨텍스트 로드)
- [~] `application-local.yml` MetaDB(Oracle 19c) 연결 → 설정 완료. Hikari `initialization-fail-timeout=-1` 로 DB 미기동 부팅 OK. **DB UP 검증은 Oracle 대기** (`/actuator/health` db 지표 = DOWN 확인, 배선 정상)
- [x] `ApiResponse<T>` / `ErrorCode` enum / `GlobalExceptionHandler` 공통 응답 → verify: `{ok:true,data}` 직렬화 확인
- [x] `TraceIdFilter` (요청별 traceId 발급) → verify: 응답 헤더 `X-Trace-Id` 발급 확인
- [x] `GET /api/_ops/healthz`, `GET /api/_ops/version` → verify: 200 + `{status:UP}` / `{build,commit,startedAt}`
- [ ] 로컬 MetaDB 에 [`07_DBA_DDL.sql`](../spec/07_DBA_DDL.sql) 실행 + mockup 시드 INSERT → verify: 14테이블 + 샘플 데이터 존재 **(Oracle 인스턴스 필요 — 다음 작업)**

## M2. 로그인 / 세션 + 본인 정보 + BFF

> 상태(2026-06-01). 백엔드 코드+단위테스트+무DB 스모크 완료. 로그인 端-端은 Oracle 대기. frontend 승격/BFF/화면은 다음 작업.

### 백엔드 (Oracle 없이 검증 완료)
- [~] `UserMapper` (findById/touchLoginSuccess/incrementLoginFailure) + XML → 코드 완료. 통합테스트는 Oracle 대기
- [x] bcrypt(cost 12) 비밀번호 검증 → verify: `PasswordEncoderTest` 통과 ($2a$12$ + matches)
- [x] `JwtProvider` (Access 15분 / Refresh 24시간, jti) → verify: `JwtProviderTest` 4종(발급/파싱/만료/위조) 통과. `DXAPI_REFRESH_TOKEN_L` 저장은 매퍼 코드 완료, 영속검증 Oracle 대기
- [x] `AuthService` 로그인 분기 → verify: `AuthServiceTest` 4종(성공/오답/비활성/미존재) Mockito 통과
- [~] `POST /api/auth/login` `/logout` `/refresh` → 라우팅·검증·예외 스모크 통과(empty→400, me無토큰→401, creds→500 db down). 200 응답은 Oracle 대기
- [~] `GET /api/users/me` (password 제외) → 무토큰 401 검증. 본인 조회 200 은 Oracle 대기

### Oracle 확보 즉시 가동 세팅 (완료)
- [x] `backend/db/seed-codes.sql` (공통코드), `seed-meta.sql` (DS/API/연계/승인) → mockData 정합
- [x] `LocalDataSeeder` (사용자 3명 bcrypt 주입, `DXAPI_SEED_ENABLED` 게이트, DB 미연결 시 no-op)
- [x] `docker-compose.yml` (Oracle Free) + `backend/db/README.md` 런북(A:docker / B:사내 / C:검증)

### frontend (완료 — 로그인 성공 端-端만 Oracle 대기)
- [x] `mockup/` → `frontend/` 승격 (robocopy) → verify: `bun install` + `bun run build` 성공(53 라우트 컴파일)
- [x] BFF: `/api/auth/login` `/logout` 신설(Spring 프록시 + httpOnly 쿠키 `dxapi_at`/`dxapi_rt`), `getCurrentUser`=백엔드 `/me` 중계, `proxy.ts` 가드 쿠키 교체 → verify: 토큰 httpOnly 쿠키로만 보관(화면 미노출)
  - 주의. auth 만 이관. `/api/mock/**` 의 나머지 도메인(datasource/apis/monitoring 등)은 각 마일스톤에서 순차 이관.
- [~] 화면 `(auth)/login`, `(admin)/me` 실연동 → BFF 스모크 통과(login 200 / me 무쿠키 307 redirect / login→backend 500 db down). 로그인 성공 후 me 표시 端-端은 Oracle 대기

## M3. 게이트웨이 4단 검증 + SQL 실행 + 마스킹

> 상태(2026-06-01). 코드+단위테스트+무DB 스모크 완료. 실제 4단 거부 분기·SQL 실행은 Oracle(MetaDB) 대기. call_hist 적재는 M4.

- [x] `DataSourceRegistry` (dataSrcId별 HikariDataSource 동적 생성·캐시·evict) → 코드 완료. 실제 풀 확보는 Oracle 대기
- [x] `CertKeyService` (HMAC-SHA256 hex, disti 앞8) → verify: `CertKeyServiceTest` 4종(결정성/상이/길이64/비평문) 통과
- [x] `IpWhitelistChecker` (IPv4 CIDR + localhost) → verify: `IpWhitelistCheckerTest` 6종(범위/경계/단일/리스트/오류) 통과
- [~] 이용기간 + 매핑 API 검증 → `GatewayService.verify` 4단 구현. 실제 분기 검증은 MetaDB 대기
- [x] `SqlExecutor` (#{param}→:param NamedParameter, literal 결합 차단, SELECT/DML 분기) → 코드 완료. 실행은 MetaDB+대상DB 대기
- [x] `MaskingApplier` (MASK_RULE_DVCD 7종) → verify: `MaskingApplierTest` 6종(none/null/name/phone/email/unknown) 통과
- [x] `GET/POST /api/sample/{apiPath}` 동적 라우팅 → verify: 라우트 매핑 + 게이트웨이 형태 응답(`{ok,code,traceId}`) 스모크. 내부 오류 detail 비노출 확인
- [~] 4단 실패별 ErrorCode + traceId 응답 → 매핑 완료(INVALID_CERT_KEY/EXT_SYSTEM_INACTIVE/IP_NOT_ALLOWED/OUT_OF_PERIOD/API_NOT_MAPPED/API_NOT_FOUND/API_NOT_ACTIVE/MISSING_PARAM). 각 단계 실제 거부는 MetaDB 대기
- [x] 데모 인증키 시드. `LocalDataSeeder` 가 연계시스템 E20260509001 의 HMAC 해시 설정 → `X-Cert-Key: AKAD9001-DXAPIDEMO-1234ABCD-5678EF90`

> 보안. 게이트웨이는 외부 노출 → INTERNAL_ERROR 의 내부 상세(스택/SQL)는 응답에서 제거, traceId+로그로만 추적.

## M4. 호출 이력 적재 + 모니터링

> 상태(2026-06-01). 백엔드 코드+단위테스트+무DB 스모크 완료. 실제 적재·조회는 Oracle 대기. 화면 연동은 다음(frontend BFF).

- [x] `CallHistoryQueue` (in-process BlockingQueue cap 10k) enqueue → verify: `CallHistoryQueueTest` 2종(drain/max) 통과. GatewayService 가 모든 결과 적재
- [x] `CallHistoryBatchWriter` (@Scheduled 1초 / 100건 batchUpdate, @PreDestroy flush) → 코드 완료. 실제 INSERT 는 Oracle 대기
- [x] DXAPI_CALL_HIST_L 적재 → JdbcTemplate.batchUpdate(SEQ_CALL_HIST.NEXTVAL). 당일 파티션 적재는 Oracle 대기
- [x] `GET /api/monitoring/stats` (KPI + 분당 시리즈, ADMIN) → `StatsCalculator` 로직 완료. verify: `StatsCalculatorTest` 4종(빈/카운트/윈도우/버킷) + 무토큰 401 스모크. 데이터 응답은 Oracle 대기
- [x] `GET /api/monitoring/history` (동적 필터 + FETCH FIRST, ADMIN) → 코드 완료. 무토큰 401 스모크. 데이터는 Oracle 대기
- [x] 화면 `(admin)/monitoring` 실제 연동 → BFF stats/history 프록시 이관. dev Oracle 端-端 검증(wiki/05)

## M5. 1차 통합 + 정리

> 상태(2026-06-01). dev Oracle 19c(`168.115.36.230/DEVORA19`, 유저 dx) 에서 **端-端 수동 통합검증 완료**. 자동화 테스트·open-q 정리는 잔여.

- [x] §0 端-端 시나리오 수동 검증 → 로그인 200, /me, 게이트웨이 오답401·정답200(`관**` 마스킹), call_hist 적재(total=2→), 모니터링 stats/history. dev-schema.sql 로 스키마 적용
- [x] 자동 통합테스트 = `GatewayIntegrationIT`(dev Oracle 대상, `-Dit.devdb=true` 게이트). 端-端(로그인·게이트웨이 마스킹·오답401) + 보안 가드(DROP 등록 400·validate DELETE) 6종 green. **Docker 부재로 Testcontainers 대신 실 dev DB** — Docker 확보 시 동일 단언 이전(후속)
- [x] Playwright e2e — 실 백엔드 대상 `day1-smoke`(로그인·RBAC·네비 8) + `real-backend`(화면별 실 dev Oracle 데이터 4) green. 게이트웨이는 `GatewayIntegrationIT`(API 레벨). mockup day2~6(reset 격리·셀프서비스 mock·변형)은 레거시 — `e2e/README.md`
- [ ] `03_context-notes.md` 최신화 → 계속 반영 중
- [x] open-questions.md 의 A1/A2/A3/B1/C1/C3/C5 + C4(SQL 화이트리스트) 상태 `[닫힘]` 갱신 → verify: 반영
- [ ] dev-01 커밋 정리 + 빌드/테스트 통과 확인 → verify: `./gradlew build` + frontend lint

---

# AI 초안등록 (MCP) — [`02_AI초안등록_PRD.md`](../product/02_AI초안등록_PRD.md)

> 상태(2026-06-06). AI-M1 코드·단위테스트·문서 완료. **dev Oracle 적용·통합검증만 네트워크 대기**(168.115.36.230 불가 환경 — `backend/db/migrate/Migrate.java` 실행 + seed 부팅 필요).

## AI-M1. backend 최소변경

- [~] DDL additive 3건 — `CK_USR_USER_ROLE` CHECK +'AI', EZ_CODE 1행, AI 계정(`ai-mcp01`) 시드. `07_DBA_DDL.sql`+`dev-schema.sql`+`06_DB_모델링.md`+`07_DBA_요청서.md` 동기화 완료 → **dev 적용은 네트워크 대기**(`backend/db/migrate/Migrate.java` 멱등 러너 준비됨, 적용 후 폴더 삭제)
- [x] `AuthSupport.requireAdminOrAi` + `UserService.ROLES` +'AI' → verify: `AuthSupportTest` 5종(ADMIN/AI 통과·USER 403·무토큰 401·requireAdmin 은 AI 거부)
- [x] `ApiDefController` 가드 교체 5곳(validate-sql·check-path·create·get·list) → verify: 무DB 스모크 — 신규 표면 무토큰 401(404 아님, 라우팅·가드 배선 확인). AI 토큰 검증은 Oracle 대기
- [x] `ApiDefService` — role=AI 면 status 강제 DRAFT → verify: `aiCreateForcesDraftEvenWhenActiveRequested` (ACTIVE 요청 → DRAFT insert)
- [x] mine 필터 — AI 는 자기 REGID 건만 목록·단건 조회 → verify: `aiGetOtherCreatorsApiForbidden` + findAll(regId) 매퍼 필터
- [x] rate-limit(`app.ai.create-per-min` 기본10, RateLimiter 재사용) + open-draft 상한(`app.ai.max-open-drafts` 기본50) → verify: `aiCreateBlockedAtOpenDraftCap`(400). 분당 429 는 통합 대기
- [x] `GET /api/datasources/{id}/schema` (SchemaService — USER_TAB/COL_COMMENTS 직질의, TTL 캐시 600s, DS 변경/삭제/스왑 시 evict, ORACLE 만 B2) → verify: `SchemaServiceTest` 5종(NOT_FOUND/비Oracle 거부/테이블명 검증/타입표기). 실 데이터 응답은 Oracle 대기
- [x] AI 용 DS 목록 응답 접속정보 제외(jdbcUrl·dbUser null) → verify: 컨트롤러 분기 구현. 응답 확인은 Oracle 대기
- [x] `LocalDataSeeder` AI 계정 1행 — 데모 사용자와 독립 멱등(기존 사용자 있어도 보충) → verify: 빌드 + no-op 패턴 유지
- [ ] 통합 — AI 로그인→schema→validate→create→DRAFT 확인→AI PUT 403→ADMIN ACTIVE 전환→게이트웨이 200 → verify: dev Oracle 네트워크 확보 후 (`Migrate.java` → seed 부팅 → 검증)
- [x] 문서 동기화 — `05_api_연결목록.md`(§4·§5 권한 ADMIN·AI + schema 행), `04_backend_가이드.md`(§3·§7·§8·§12) → verify: 반영
- 단위테스트 누계 57 → **67종** (`gradlew test` green 2026-06-06)

## AI-M2. MCP 서버 (`mcp/` 신설, backend 수정 0)

- [ ] `mcp/` 스캐폴드(Node/TS stdio, MCP SDK) → verify: 빌드 + 호스트 연결
- [ ] `src/client.ts` — login→access 갱신(만료 30초 전 refresh)→재로그인 1회·백오프(무한 재시도 금지) → verify: 토큰 만료 시나리오 스모크
- [ ] 도구 7종(list_datasources/get_schema/validate_sql/check_path/draft_api/list_my_drafts/get_api_status). draft_api 는 status 미전송 + 등록 전 validate·check-path 합성 → verify: 로컬 backend 대상 7종 스모크
- [ ] `README.md` + `.mcp.json` 예시 + env 자격증명 절차 → verify: 신규 환경에서 문서만으로 연결 재현
- [ ] 端-端 — Claude 가 대화로 "스키마→SQL→검증→초안" 완주, 관리자 콘솔에서 해당 DRAFT 확인 → verify: PRD §0 시나리오

## AI-M3. 운영보강 (선택 — open-q 닫힐 때만)

- [ ] FE "AI 생성" 배지(REGID 노출) + 대기 DRAFT KPI → verify: 목록 표시
- [ ] user-guide 승인 전 SQL 검토 체크리스트(R4) → verify: 문서 추가
- [ ] K2 화이트리스트 / K3 승인타입 / K4 HTTP MCP / K5 DRAFT TTL → 각 open-q 결정 후 별도 항목화

---

**진행 규칙**. 한 항목 완료 = verify 통과. M 단위 종료 시 커밋(CLAUDE.md §9) + context-notes append.
