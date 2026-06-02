> Dau.DX.API 본 개발(Phase 3) PRD. mockup 기반으로 Spring Boot 백엔드 + Next.js 프런트엔드를 실제 구현하는 계획서.

# 01. 본 개발 PRD — mockup 기반 실 구현

**브랜치**: `dev-01` · **작성일**: 2026-05-31 · **상태**: 초안(1차 범위 확정)

---

## 0. 한 페이지 요약

- **무엇을**. mockup(Next.js 메모리 Mock)을 실제 동작 시스템으로 승격. 백엔드를 새로 만들고, 프런트엔드는 mockup 을 승격해 실제 백엔드와 연동.
- **스택**. Spring Boot 3.x + Java 21 + MyBatis + HikariCP / Oracle 19c MetaDB / Next.js 16 (mockup 승격) + BFF.
- **1차 범위(dev-01)**. P0 수직 슬라이스 — 로그인/세션, 본인 정보, 게이트웨이 4단 검증 + 호출 이력 적재. 端-端 1개를 먼저 관통시킨다.
- **계약**. [`05_api_연결목록.md`](../spec/05_api_연결목록.md) 의 HTTP contract 를 그대로 구현. 변경 없음.
- **DB**. [`06_DB_모델링.md`](../spec/06_DB_모델링.md) 의 14테이블 DDL 을 그대로 사용. 변경 없음.
- **언제 끝남**. 외부 시스템이 `X-Cert-Key` 로 `/api/sample/{path}` 호출 → 4단 검증 통과 → 대상 DB 에서 SQL 실행 → 마스킹 응답 → `DXAPI_CALL_HIST_L` 적재까지 실제로 동작하고, 관리자가 로그인해 모니터링 화면에서 그 호출을 확인할 수 있을 때.

---

## 1. 배경 · 목표

mockup 은 화면과 HTTP 인터페이스를 메모리 Mock 으로 확정했다. 본 개발은 그 인터페이스를 **계약으로 고정**한 채, 뒤편을 실제 구현으로 채운다.

목표.
1. mockup 의 화면·컴포넌트를 100% 재사용하면서 데이터만 실제로 바꾼다.
2. [`05`](../spec/05_api_연결목록.md) 계약과 [`06`](../spec/06_DB_모델링.md) DDL 을 깨지 않는다(SoT).
3. 1개의 동작하는 端-端 흐름을 먼저 만들고, 나머지는 동일 패턴으로 확장한다.

비목표(1차 제외).
- 12화면 전부 / 모든 CRUD / import·export / 인시던트 자동 감지. → 후속 PR.
- K8s·CI/CD·Vault·관측성 스택. → [`open-questions.md`](open-questions.md) D~E 유지.

---

## 2. 잠근 결정 (open-questions 닫기)

본 PRD 는 아래 P0 항목을 닫는다. [`open-questions.md`](open-questions.md) 의 A1/A2/A3/B1/C1/C3/C5 상태를 `[닫힘 — 2026-06-01]` 로 갱신 완료(dev Oracle 端-端 검증).

| open-q | 결정 | 근거 |
|---|---|---|
| A1 백엔드 언어 | **Spring Boot 3.x + Java 21** | 06 DDL 이 HikariCP/ojdbc/Virtual Threads 전제. 사내 Java 자산 |
| A2 영속 계층 | **MyBatis** | SQL-to-REST 워크로드. 동적 SQL·결과셋 매핑이 핵심 → MyBatis 가 자연 |
| A3 커넥션 풀 | **HikariCP** | 데이터소스별 동적 풀(hot-swap) 레지스트리로 운용 |
| B1 MetaDB | **Oracle 19c** | 06 DDL 완성. A5 결정(캐시·큐 Oracle 단독)과 정합 |
| C1 cert-key 알고리즘 | **HMAC-SHA256** (장기 키, 평문 미저장, 앞 8자만 식별저장) | 06 `CRTFC_KEY_HASH`/`CRTFC_KEY_DISTI_TEXT` 컬럼 구조 |
| C3 비밀번호 해시 | **bcrypt cost 12** | 06 `PW_HASH` 코멘트 명시 |
| C5 JWT 사양 | **Access 15분 / Refresh 24시간**, Refresh 는 `DXAPI_REFRESH_TOKEN_L` 로 revoke 관리 | A5 결정(Redis 미사용 → 토큰 Oracle 관리) |

**1차에서 안 닫는 것**(잔여). C2 검증 단계 세부(STTUS_DVCD 분리), C4 SQL 화이트리스트, C6 마스킹 정규식, C7 시크릿(Vault), D·E·F·G·H 전부. → §13.

---

## 3. 시스템 아키텍처

```
  외부 시스템                관리자/사용자 브라우저
     │  X-Cert-Key               │  세션 쿠키
     ▼                           ▼
┌─────────────────┐      ┌──────────────────────────┐
│  Spring Gateway │      │  Next.js (frontend/)      │
│  /api/sample/** │      │  - 화면(mockup 승격)        │
│  4단 검증+실행   │      │  - BFF route handler        │
└────────┬────────┘      │    (/app/api/** = 프록시)   │
         │               └────────────┬───────────────┘
         │                            │  Bearer (BFF가 부착)
         │                            ▼
         │               ┌──────────────────────────┐
         └──────────────▶│  Spring Boot (backend/)   │
                         │  auth/user/apidef/ds/      │
                         │  extsystem/approval/mon    │
                         └───┬───────────────┬────────┘
                             │ MyBatis        │ HikariCP (동적)
                             ▼                ▼
                  ┌──────────────────┐  ┌──────────────────┐
                  │ Oracle 19c        │  │ 사용자 등록 DB N개 │
                  │ MetaDB (14테이블) │  │ ORACLE/PG/MySQL   │
                  └──────────────────┘  └──────────────────┘
```

핵심 설계점.
- **BFF**. 브라우저는 BFF(Next route handler)만 본다. BFF 가 세션 쿠키(httpOnly)를 보유하고, Spring 호출 시 JWT 를 `Authorization: Bearer` 로 부착. 토큰을 브라우저에 노출하지 않는다.
- **MetaDB vs 사용자 DB 분리**. MetaDB(Oracle 19c, MyBatis 고정)와 사용자가 등록한 데이터소스(동적, 멀티 타입)는 풀이 다르다. 게이트웨이 SQL 은 후자에서 실행.
- **동적 풀 레지스트리**. `DataSourceRegistry` 가 `Map<dataSrcId, HikariDataSource>` 보유. 데이터소스 CRUD/스왑 시 풀 재구성(mockup 의 datasource swap 화면 대응).

---

## 4. 모듈 / 패키지 구조

```
backend/                              # 신규 (Spring Boot, Gradle Kotlin DSL)
  build.gradle.kts
  src/main/java/ac/donga/dxapi/
    DxApiApplication.java
    config/        SecurityConfig, MyBatisConfig, DataSourceRegistry, JwtProps
    common/        ApiResponse, ErrorCode, GlobalExceptionHandler, TraceIdFilter
    auth/          AuthController, AuthService, JwtProvider, mapper(RefreshToken)
    user/          UserController(me/admin), UserService, UserMapper
    apidef/        ApiDefController, ApiDefService, ApiDefMapper      # 후속
    datasource/    DataSourceController, DataSourceService, DsMapper  # 후속
    extsystem/     ExtSystemController, ExtSystemService, ExtSysMapper
    approval/      ApprovalController, ApprovalService, ApprovalMapper # 후속
    gateway/       GatewayController, CertKeyVerifier, IpWhitelistChecker,
                   SqlExecutor, MaskingApplier, GatewayService
    monitoring/    MonitoringController, CallHistoryQueue, CallHistoryBatchWriter
  src/main/resources/
    mapper/*.xml                      # MyBatis SQL
    application.yml                   # profile: local/dev

frontend/                             # mockup/ 승격 (복사 후 변형)
  app/(admin)/...                     # 화면 그대로 재사용
  app/(auth)/...
  app/api/**                          # /api/mock/** 삭제, BFF 프록시 route 만 유지
  lib/apiClient.ts                    # BFF → Spring 호출 래퍼
  types/api.ts                        # mockup types 재사용 (DTO SoT)
```

> 1차에는 `auth/`, `user/`(me), `extsystem/`(검증용 조회), `gateway/`, `monitoring/`(적재) 만 구현. `# 후속` 표시는 2차 이후.

---

## 5. 1차 범위 — P0 수직 슬라이스 (dev-01)

[`05 §12`](../spec/05_api_연결목록.md) 의 P0 정의를 따른다. "관리자 로그인 → 외부 게이트웨이 호출 → 모니터링 확인" 한 줄을 端-端 관통시킨다.

### 5.1 포함 엔드포인트

| 영역 | 엔드포인트 | 비고 |
|---|---|---|
| 인증 | `POST /api/auth/login`, `POST /api/auth/logout` | JWT 발급, BFF 세션 쿠키 |
| 본인 | `GET /api/users/me` | 세션 → 사용자 조회. password 제외 |
| 게이트웨이 | `GET/POST /api/sample/{apiPath}` | 4단 검증 + SQL 실행 + 마스킹 + 적재 |
| 모니터링 | `GET /api/monitoring/stats`, `GET /api/monitoring/history` | call_hist 집계·목록 |
| 운영 | `GET /api/_ops/healthz`, `GET /api/_ops/version` | LB·배포 식별 |

### 5.2 포함 화면 (frontend)

- `(auth)/login` — 실제 로그인.
- `(admin)/me` — 본인 정보 조회.
- `(admin)/monitoring` — stats + history(게이트웨이 호출이 실제로 찍히는지 확인).

나머지 화면은 mockup 그대로 두되 BFF 미연결(후속). 

### 5.3 제외 (후속 PR)

users/datasources/apis/ext-systems CRUD, approvals, import/export, validate-sql, test-connection, 인시던트, 데이터소스 헬스.

---

## 6. HTTP 계약 → Spring 매핑 규칙

[`05`](../spec/05_api_연결목록.md) 을 그대로 따른다. 공통 규약.

- **공통 응답**. `ApiResponse<T>` = `{ ok, data }` / `{ ok:false, message, issues? }`. 게이트웨이는 `traceId` 추가.
- **에러 코드**. [`05 §0`](../spec/05_api_연결목록.md) 의 `ErrorCode` enum 그대로(`INVALID_CREDENTIALS`, `INVALID_CERT_KEY`, `IP_NOT_ALLOWED`, `OUT_OF_PERIOD`, `API_NOT_MAPPED` …).
- **DTO**. [`mockup/types/api.ts`](../../mockup/types/api.ts) 의 Zod 스키마를 SoT 로 보고 Java DTO 로 미러링. 필드명은 카멜케이스(JSON), DB 컬럼은 [`06`](../spec/06_DB_모델링.md) 의 스네이크 — MyBatis resultMap 에서 매핑.
- **베이스 경로**. 관리/메타 `/api/**`, 게이트웨이 `/api/sample/**`. mockup 의 `/api/mock/**` 는 frontend BFF 에서 제거.

---

## 7. 데이터 계층 (MyBatis + 멀티 DS)

- **MetaDB 매퍼**. [`06`](../spec/06_DB_모델링.md) 의 14테이블 → `resources/mapper/*.xml`. 1차는 `UserMapper`, `ExtSystemMapper`, `ApiDefMapper`(조회), `CallHistoryMapper`(INSERT) 만.
- **채번**. `A/E/DS + YYYYMMDD + seq3` 은 [`06 §3.2`](../spec/06_DB_모델링.md) 권장대로 `MAX(seq)+1 WHERE id LIKE 'A20260531%'` 코드 처리(시퀀스보다 트랜잭션 안정).
- **동적 데이터소스**. `DataSourceRegistry` 가 `DXAPI_DATASOURCE_M` 을 읽어 `dataSrcId` 별 `HikariDataSource` 생성·캐시. 게이트웨이 SQL 실행 시 `ApiDef.dataSrcId` 로 풀 선택. 비밀번호는 `DB_ENC_PW`(1차는 로컬 설정값, Vault 는 C7 후속).
- **SQL 실행**. `ApiDef.SQL_TEXT` 의 `#{param}` 바인딩만 허용. literal 결합 금지(SQL 인젝션 차단). 1차는 SELECT 위주, INSERT/UPDATE 는 트랜잭션 경계 확인 후.

---

## 8. 인증 · 보안

### 8.1 사용자 인증 (관리자/사용자 화면)
- 로그인 → bcrypt(cost 12) 검증 → JWT 발급(Access 15분 / Refresh 24시간).
- Refresh 토큰은 `DXAPI_REFRESH_TOKEN_L` 에 저장(revoke 가능, Redis 미사용 — A5 정합).
- BFF 가 Access/Refresh 를 httpOnly 쿠키로 보관, Spring 호출 시 Bearer 부착. 만료 시 BFF 가 refresh 흐름 수행.
- 로그인 실패 카운트 → `LOGIN_FAILURE_TMCNT` 누적, 5회 이상 앱 레벨 INACTIVE 전환([`06`](../spec/06_DB_모델링.md) 코멘트).

### 8.2 게이트웨이 4단 검증 (외부 시스템) — 1차 핵심
[`05 §10`](../spec/05_api_연결목록.md) 순서 그대로.
1. **인증키**. `X-Cert-Key` 평문 → HMAC-SHA256 → `CRTFC_KEY_HASH` 비교 + `STTUS_DVCD=ACTIVE`. 실패 `INVALID_CERT_KEY`.
2. **IP 화이트리스트**. `ALW_IP_ADDR_TEXT`(JSON CIDR 배열) ∋ clientIp. 실패 `IP_NOT_ALLOWED`.
3. **이용 기간**. `USE_BEGIN_DT ≤ now ≤ USE_END_DT`. 실패 `OUT_OF_PERIOD`.
4. **매핑 API**. `apiNo ∈ DXAPI_EXT_SYS_API_MAP_M`. 실패 `API_NOT_MAPPED`.
- 통과 시 SQL 실행 → 응답 컬럼 마스킹(`MASK_RULE_DVCD`) → `{ ok, data, traceId }`.
- 모든 결과(성공·실패)는 `DXAPI_CALL_HIST_L` 적재(§9).

### 8.3 응답 마스킹
`DXAPI_API_RESP_M.MASK_RULE_DVCD`(none/name/phone/email/rrn/card/addr)로 컬럼별 마스킹. 1차는 단순 규칙 적용, 정확한 정규식은 C6(후속).

---

## 9. 호출 이력 적재 (A5 / 04 정합)

- 게이트웨이가 응답 직전 `CallHistory` 를 in-process `BlockingQueue` 에 enqueue.
- `CallHistoryBatchWriter` 가 **1초 또는 100건** 마다 `INSERT INTO DXAPI_CALL_HIST_L` 배치([`04`](../spec/04_동아_오라클_모니터링.md) 수집 경로 그대로).
- `CALNG_DT` 일별 INTERVAL 파티션, LOCAL 인덱스 5종은 [`06 §5.1`](../spec/06_DB_모델링.md) DDL 그대로.
- `PARAM_JSON_TEXT` 는 PIPA 마스킹 적용 후 저장.

---

## 10. 로컬 개발 환경

- **MetaDB**. 로컬 Oracle 19c(docker `container-registry.oracle.com/database/free` 또는 사내 인스턴스). [`07_DBA_DDL.sql`](../spec/07_DBA_DDL.sql) 실행 → mockup 시드 INSERT.
- **사용자 DB(샘플)**. mockup 의 `DAU-CORE-PROD` 대체용 로컬 샘플 DB 1개(테스트 테이블).
- **프로필**. `application-local.yml`. 비밀번호·HMAC 키는 1차 로컬 설정, Vault 후속.
- **frontend**. mockup 복사 → `frontend/`. `bun dev`(로컬). BFF 가 `BACKEND_URL` 로 Spring(`:8080`) 프록시.

---

## 11. 테스트 전략 (CLAUDE.md §8)

- **단위**. `CertKeyVerifier`, `IpWhitelistChecker`(CIDR), 채번, 마스킹 — JUnit5.
- **통합**. Testcontainers Oracle 로 MetaDB 매퍼 + 게이트웨이 4단 검증 端-端.
- **e2e**. mockup 의 Playwright 스펙(`e2e/day*-*.spec.ts`) 재사용 — BFF 연동 후 로그인·게이트웨이 흐름.
- **완료 기준**. §0 "언제 끝남" 시나리오가 통합 테스트로 green.

---

## 12. 마일스톤

| 순서 | 내용 | 산출물 |
|---|---|---|
| M1 | backend 스캐폴드 + MetaDB 연결 + healthz | `backend/` 부팅, `/api/_ops/healthz` 200 |
| M2 | 로그인/세션 + /me + BFF | 로그인 화면 실제 동작 |
| M3 | 게이트웨이 4단 검증 + SQL 실행 + 마스킹 | `/api/sample/{path}` 실제 응답 |
| M4 | call_hist 큐·배치 적재 + 모니터링 화면 | 모니터링에서 호출 확인 |
| M5 | 1차 통합 테스트 green + dev-01 정리 | §0 시나리오 통과 |

각 M 단위로 커밋(CLAUDE.md §9). 상세 체크는 [`02_checklist.md`](../progress/02_checklist.md).

---

## 13. 잔여 open-questions (1차 미결)

- **C2** 검증 단계 STTUS_DVCD 분리, **C4** SQL 화이트리스트 동사 집합, **C6** 마스킹 정규식.
- **C7** 시크릿(Vault + ESO) — 1차는 로컬 설정값.
- **D**(CI/CD·K8s), **E**(관측성), **F**(도메인), **G**(EzAPI 마이그레이션), **H**(성능 목표).
- **B2** 사용자 DB 지원 범위(1차 Oracle 만, PG/MySQL 풀은 인터페이스만).

이들은 막히는 시점에 [`open-questions.md`](open-questions.md) 에서 닫고 본 위키에 PRD 조각 추가.

---

## 14. 리스크

| 리스크 | 영향 | 완화 |
|---|---|---|
| ojdbc Virtual Threads pinning(A4) | 게이트웨이 처리량 | 1차는 플랫폼 스레드 풀, VT 는 PoC 후 결정 |
| 동적 멀티 DS 풀 누수 | 메모리·커넥션 고갈 | Registry 가 풀 생성·폐기 단일 관리, 사용 중 DS 삭제 차단 |
| cert-key 평문 1회 노출 모델 | 분실 시 재발급 | `regenerate-key` 흐름 + `CRTFC_KEY_DISTI_TEXT` 식별 |
| MetaDB ↔ mockup 컬럼 드리프트 | 계약 깨짐 | [`mockup/types/api.ts`](../../mockup/types/api.ts) SoT, resultMap 단일 지점 매핑 |
| 1차 슬라이스가 전체로 번짐 | 일정 | §5.3 제외 목록 엄수, 후속 PR 분리 |
