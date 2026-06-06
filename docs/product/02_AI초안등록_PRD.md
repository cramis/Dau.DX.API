> AI(MCP 클라이언트)가 API 정의를 **승인대기 초안(DRAFT)** 으로 등록하는 기능의 PRD. 원칙 = AI 는 초안만, 활성화는 사람. 기존 구성 큰 수정 없음.

# 02. AI 초안등록 PRD — MCP 도구로 API 정의 초안 생성

**브랜치**: `dev-01` · **작성일**: 2026-06-06 · **상태**: 초안(범위 확정, 구현 전)

---

## 0. 한 페이지 요약

- **무엇을**. Claude 등 AI 에이전트가 MCP 도구로 게이트웨이의 API 정의를 **DRAFT 상태로만** 등록한다. 관리자가 기존 API 목록 화면에서 검토 후 ACTIVE 전환(활성화 권한은 사람 전용).
- **스택/도구**. 신규 role `AI` + `requireAdminOrAi` 가드(backend 소폭 수정) / `mcp/` Node + TypeScript stdio MCP 서버(신규, backend REST 1:1 래핑) / 신규 백엔드 엔드포인트 1개(`GET /api/datasources/{id}/schema`).
- **1차 범위**. M1 backend 최소변경(role·가드·DRAFT 강제·schema 조회·상한) + M2 MCP 서버 7도구. M3 운영보강(FE 배지·알림 등)은 후속.
- **계약**. 기존 [`05_api_연결목록.md`](../spec/05_api_연결목록.md) 무변경. schema 엔드포인트 1개만 추가(§6).
- **DB**. 신규 테이블·컬럼 없음. additive DDL 3건 — ROLE_DVCD CHECK 확장, EZ_CODE 1행, AI 계정 시드 1행([`07_DBA_DDL.sql`](../spec/07_DBA_DDL.sql) 동기화).
- **언제 끝남**. Claude 가 MCP 로 스키마 조회 → SQL 작성 → validate → DRAFT 등록까지 수행하고, 관리자가 콘솔에서 그 초안을 ACTIVE 로 전환해 외부 호출이 실제 동작하며, AI 토큰으로는 ACTIVE 생성·전환이 서버에서 거부될 때.

**비목표** (이번에 안 함).
- AI 의 자동 활성화·자동 승인. 어떤 형태로든 불가(서버 강제).
- 승인 테이블(`DXAPI_USER_APPR_L`) 변경·신규 승인타입. → 후속(open-q K3).
- FE 화면 개편. DRAFT 필터·배지는 기존 그대로 사용. "AI 생성" 배지는 M3 선택.
- HTTP(원격) MCP·멀티 사용자 MCP. 1차는 stdio 로컬 실행. → 후속(open-q K4).

---

## 1. 배경 · 목표

API 등록은 현재 사람이 콘솔에서 테이블 구조를 파악하고 SQL 을 직접 작성해야 한다. SQL 비숙련 담당자는 여기서 막힌다. AI 에게 이 작성 단계를 맡기되, **운영 게이트웨이의 안전선(활성화)은 사람이 쥔다**.

목표.
1. AI 가 대화만으로 "스키마 파악 → SQL 작성 → 검증 → 초안 등록"을 완주한다. 사람의 일은 승인(상태 전환) 클릭 하나.
2. "AI 는 초안만"을 **서버에서 강제**한다. MCP 도구 관례나 클라이언트 신뢰에 의존하지 않는다.
3. 기존 구성 큰 수정 없음 — 아키텍처 변경 0, 신규 테이블 0, 수정은 가드·검증 한 줄급 ~11파일.

비목표는 §0. 핵심 근거 사실 하나 — 현재 `ApiDefService.create()` 는 요청 `status` 를 그대로 수용한다(`apidef/ApiDefService.java` validate, 미지정 시에만 DRAFT). 즉 AI 에 ADMIN 토큰을 주면 즉시 ACTIVE 생성이 가능해 원칙이 서버에서 강제되지 않는다. → role 분리가 필수(§2).

---

## 2. 잠근 결정

[`open-questions.md`](open-questions.md) 신규 섹션 K(AI 연동) 중 2건을 본 PRD 가 닫는다.

| open-q | 결정 | 근거 |
|---|---|---|
| K0-a AI 권한 모델 | **role `AI` 신설** + `requireAdminOrAi` 가드. AI 의 create 는 서버가 status=DRAFT 강제 | ADMIN 재사용 시 "초안만" 원칙이 클라이언트 관례에만 의존(§1). USER 재활용은 일반 사용자에게 관리 엔드포인트가 열려 경계 붕괴. 수정량 = 가드 헬퍼 + 컨트롤러 5곳 + DRAFT 강제 1줄 |
| K0-b AI 초안 SQL 범위 | **사람과 동일(쓰기 포함)**. GET=SELECT/WITH, 非GET=+INSERT/UPDATE/MERGE/CALL — 기존 [`SqlPolicy`(C4)](open-questions.md) 그대로 | 승인 단계에서 사람이 SQL 을 검토한다는 전제. DELETE·DDL·DBMS_/UTL_·다중문은 C4 정책대로 항상 거부. 부주의 승인 리스크는 R4 로 관리 |

본 PRD 가 추가로 잠그는 설계(논의 완료, open-q 불필요).

| 결정 | 선택 | 기각 대안 · 이유 |
|---|---|---|
| 승인 플로 | **승인테이블 무변경**. AI 생성 = DRAFT → 관리자가 기존 목록(DRAFT 필터 기존재, `frontend/components/ApiListTable.tsx`)에서 검토 → PUT 으로 ACTIVE 전환. 전환자·시각은 MODID/MODDT 로 이미 감사됨 | 신규 승인타입(API_DEF) 신설 — 수정 10+ 파일, C8(감사요건) 확정 전 과투자. 승격 경로만 K3 으로 유지 |
| MCP 서버 형태 | **Node/TS stdio**, repo `mcp/` 신설. backend REST 1:1 래핑, backend 수정 0 | Spring AI 내장 — backend 와 수명주기 결합 + 의존성 트리 추가로 "큰 수정 금지" 최다 위반. HTTP MCP — 호스팅·인증층 필요, K4 후속(MCP TS SDK 가 양쪽 transport 지원 → 코드 재사용 가능) |
| 스키마 조회 | 신규 `GET /api/datasources/{id}/schema`. Oracle 딕셔너리(`ALL_TAB_COLUMNS`/`ALL_TAB_COMMENTS`/`ALL_COL_COMMENTS`) 직질의 | JDBC `DatabaseMetaData` — Oracle 에서 `remarksReporting` 없이 REMARKS(코멘트)가 null. 한국어 코멘트가 AI 의 SQL 정확도에 결정적이라 딕셔너리 직질의 채택. PG/MySQL 확장 시 DatabaseMetaData 분기(B2 연동) |

---

## 3. 시스템 아키텍처

```
 Claude (Code/Desktop)                    관리자 브라우저
        │ MCP (stdio)                          │
        ▼                                      ▼
┌──────────────────┐                 ┌──────────────────┐
│  mcp/ (Node/TS)  │                 │  Next.js BFF      │
│  도구 7종         │                 │  (기존 그대로)     │
│  토큰 수명주기 관리│                 └────────┬──────────┘
└────────┬─────────┘                          │ Bearer (ADMIN)
         │ REST + Bearer (role=AI)            │
         ▼                                    ▼
┌──────────────────────────────────────────────────────┐
│  Spring Boot (backend/)                               │
│  requireAdminOrAi: validate-sql·check-path·create(   │
│    DRAFT 강제)·schema·자기건 조회                       │
│  requireAdmin(기존 유지): 그 외 전부 — 활성화·삭제·     │
│    사용자·DS·연계시스템·승인                            │
└───────────┬──────────────────────────┬────────────────┘
            │ MetaDB (API_DEF_M)        │ DataSourceRegistry
            ▼                          ▼
     Oracle 19c MetaDB          사용자 등록 DB N개 (스키마 조회·SQL prepare 검증)
```

토큰 수명주기 (MCP 서버 내부).
1. 기동 시 `POST /api/auth/login` (AI 계정 id/pw — **env 로만 주입**, repo 커밋 금지. C7 연계).
2. Access 15분 — 만료 ~30초 전 `POST /api/auth/refresh` 로 갱신(refresh 회전 대응).
3. refresh 실패 시 재로그인 **1회 + 백오프**. 무한 재시도 금지 — 5회 실패 시 계정이 자동 INACTIVE 되는 기존 브루트포스 방어(`auth/AuthService`)에 걸려 서비스계정이 잠긴다(R6).
4. 관리자는 사용자 화면에서 AI 계정 INACTIVE 전환으로 **즉시 차단 가능**(킬스위치, 추가 구현 0).

---

## 4. 모듈 / 패키지 구조

```
backend/  (수정 ~11파일 + 신규 2~3 — 전부 가드·검증·조회 수준)
  auth/AuthSupport.java            # requireAdminOrAi(principal) 헬퍼 추가
  apidef/ApiDefController.java     # validate-sql·check-path·create·get·list 가드 교체 + create rate-limit 훅
  apidef/ApiDefService.java        # role=AI 면 status 강제 DRAFT + open-draft 상한 체크
  apidef/ApiAdminMapper.java/.xml  # mine 필터(REGID=) + AI DRAFT count 쿼리
  apidef/ApiDef.java, ApiDefResponse.java  # regId 노출(생성자 식별)
  user/UserService.java            # ROLES 에 "AI" 추가
  datasource/DataSourceController.java     # GET /{id}/schema 신설 + AI 용 목록 응답(접속정보 제외)
  datasource/SchemaService.java    # 신규 — 딕셔너리 질의 + TTL 캐시
  config/.../LocalDataSeeder.java  # 로컬 AI 계정 시드 1행
  application.yml                  # app.ai.create-per-min / app.ai.max-open-drafts

mcp/  (신규 — backend 수정 0)
  package.json, tsconfig.json
  src/index.ts                     # MCP stdio 서버 엔트리 + 도구 등록
  src/client.ts                    # REST 클라이언트 + 토큰 수명주기(§3)
  src/tools/*.ts                   # 도구 7종(§7)
  README.md                        # 설치·.mcp.json 예시·AI 계정 발급 절차

docs/spec/07_DBA_DDL.sql           # CK_USR_USER_ROLE CHECK +'AI' / EZ_CODE 1행 / AI 계정 시드
```

---

## 5. 1차 범위

### 5.1 포함 (M1 + M2)

| 영역 | 항목 |
|---|---|
| backend | role AI(DDL+가드+ROLES), create DRAFT 강제, mine 필터, rate-limit·open-draft 상한, `GET /api/datasources/{id}/schema`, AI 용 DS 목록 응답(접속정보 필드 제외), 계정 시드 |
| mcp | stdio 서버 + 도구 7종 + 토큰 수명주기 + README |
| 테스트 | ApiDefServiceTest 보강(AI 강제 DRAFT·상한) + SchemaServiceTest + 통합 1종(AI 토큰으로 ACTIVE 생성 거부) + MCP 스모크 |

### 5.2 제외 (후속)

FE "AI 생성" 배지·대기 KPI 타일(M3 선택), 승인타입 API_DEF(K3), HTTP MCP(K4), DRAFT TTL 자동정리(K5), 스키마 노출 화이트리스트(K2), 알림(E3). → 범위 이탈 금지, 후속 PR 분리.

---

## 6. HTTP 계약

기존 계약([`05_api_연결목록.md`](../spec/05_api_연결목록.md)) 무변경. **권한 컬럼만 확장** — 아래 표의 엔드포인트가 ADMIN 외에 AI 를 허용한다(그 외 전부 기존 requireAdmin 유지).

| Method | Path | 권한 | role=AI 일 때 동작 차이 |
|---|---|---|---|
| POST | `/api/apis/validate-sql` | ADMIN·AI | 동일 |
| GET | `/api/apis/check-path` | ADMIN·AI | 동일 |
| POST | `/api/apis` | ADMIN·AI | **status 무시하고 DRAFT 강제** + 분당 한도 + open-draft 상한(초과 429/400) |
| GET | `/api/apis` | ADMIN·AI | AI 는 자기 REGID 건만(서버 필터) |
| GET | `/api/apis/{id}` | ADMIN·AI | AI 는 자기 REGID 건만(타건 403) |
| GET | `/api/datasources` | ADMIN·AI | AI 응답에서 jdbcUrl·dbUserId 등 접속정보 필드 제외(K7) |
| GET | `/api/datasources/{id}/schema` | ADMIN·AI | **신규**. 아래 |

신규 — `GET /api/datasources/{id}/schema` (2단계 응답으로 크기 제어).
- `?table` 미지정 → 테이블 목록 `{items:[{tableName, comments}]}` (현재 스키마 한정, 상한 500).
- `?table=X` → 단일 테이블 컬럼 `{table, columns:[{name, dataType, nullable, comments}]}`.
- 구현 = `DataSourceRegistry.get(id)` 커넥션으로 Oracle 딕셔너리 질의. in-process TTL 캐시 10분(A5 정합 — 외부 캐시 금지), DS 변경/스왑 시 evict.
- 보안 — 노출 범위는 해당 DS 접속계정의 가시 객체 = **게이트웨이가 이미 SQL 실행 가능한 범위**. 데이터플레인 권한 확장 아님. 메타(컬럼명·코멘트) 자체의 민감성은 K2 에서 화이트리스트 여부 결정.

---

## 7. MCP 도구 명세 (7종)

전부 backend REST 1:1 매핑. MCP 서버에 비즈니스 로직 두지 않는다(드리프트 방지, R7).

| 도구 | REST | 입·출력 요지 |
|---|---|---|
| `list_datasources` | GET /api/datasources | 사용 가능 DS 목록(접속정보 제외) |
| `get_schema` | GET /api/datasources/{id}/schema | `dataSrcId`, `table?` → 테이블 목록 또는 컬럼 상세 |
| `validate_sql` | POST /api/apis/validate-sql | `sql, dataSrcId, method` → `{allowed, plan, reason}` (prepare 기반 무실행 검증 — ORA-00942/00904 까지) |
| `check_path` | GET /api/apis/check-path | `path` → `{available}` |
| `draft_api` | POST /api/apis | API 정의 전체(이름·경로·method·SQL·params·resps·마스킹). **status 필드 자체를 미전송** — 서버 강제와 이중 안전. 등록 전 validate_sql+check_path 합성 선검증(도구 내) |
| `list_my_drafts` | GET /api/apis | 자기 초안 목록(서버가 REGID 필터) |
| `get_api_status` | GET /api/apis/{id} | 초안의 현재 상태(DRAFT→ACTIVE 전환 여부 확인) |

오류 전파 — backend `{ok:false, message, issues}` 를 MCP 도구 오류로 그대로 노출(AI 가 reason 보고 SQL 수정 루프 가능).

---

## 8. 보안

### 8.1 AI 서비스계정 수명주기
- `DXAPI_USR_USER_M` 1행. `USER_ID='ai-mcp01'`, `ROLE_DVCD='AI'`, `STTUS_DVCD='ACTIVE'`, bcrypt 해시.
- 시드 — 운영 = [`07_DBA_DDL.sql`](../spec/07_DBA_DDL.sql) 시드 절(DBA 절차), 로컬 = `LocalDataSeeder` 1행.
- 자격증명 주입 — MCP 실행 env 로만. repo·설정파일 커밋 금지(C7 연계, K1).
- 차단 — 5회 로그인 실패 자동 INACTIVE(기존), refresh revoke(기존), 관리자 수동 INACTIVE(킬스위치).

### 8.2 권한 경계 (서버 강제)
- role=AI 가 닿는 표면 = §6 표가 전부. 활성화(PUT)·삭제·사용자·DS 변경·연계시스템·승인 = 전부 403.
- create 는 **요청 status 무시, DRAFT 강제**. ACTIVE 로 가는 유일한 경로 = ADMIN 의 PUT.
- 토큰 탈취 시 폭발반경 = 초안 생성 + 메타 읽기. 외부 노출 영향 0(DRAFT 는 게이트웨이가 `API_NOT_ACTIVE` 거부).

### 8.3 폭주 방지
- 분당 생성 한도 — 기존 `gateway/RateLimiter` 재사용, `app.ai.create-per-min`(기본 10).
- open-draft 상한 — REGID=AI ∧ DRAFT 건수 ≤ `app.ai.max-open-drafts`(기본 50). 초과 시 거부(수치 확정 = K6).

---

## 9. 감사 · 식별

전부 기존 컬럼 재사용 — 신규 감사 테이블·컬럼 없음.

| 무엇 | 어디 |
|---|---|
| AI 가 만든 초안 식별 | `REGID='ai-mcp01'` (insert 시 이미 기록됨) |
| 누가 언제 활성화 | `MODID`/`MODDT` (PUT 시 이미 기록됨) |
| AI 계정 로그인 이력 | `DXAPI_REFRESH_TOKEN_L` (IP·UA) |
| MCP 도구 호출 로그 | MCP 서버 stderr (stdio 표준 — 호스트 로그로 수집) |

---

## 10. 테스트 전략 (CLAUDE.md §8)

- **단위**. ApiDefServiceTest 보강 — AI principal 의 create 가 status=ACTIVE 요청에도 DRAFT 저장 / open-draft 상한 초과 거부. SchemaServiceTest — 캐시 TTL·evict. AuthSupport — requireAdminOrAi 분기.
- **통합** (dev Oracle, `-Dit.devdb=true` 기존 게이트). AI 계정 로그인 → schema 조회 → validate-sql → create → **DRAFT 확인** → AI 토큰으로 PUT(활성화) 403 → ADMIN 으로 ACTIVE 전환 → 게이트웨이 호출 200.
- **MCP 스모크**. 로컬 backend 대상 — 도구 7종 1회씩 + 토큰 만료 갱신 시나리오.
- **완료 기준**. §0 "언제 끝남" 시나리오 green.

---

## 11. 마일스톤

| 순서 | 내용 | 산출물 · 검증 |
|---|---|---|
| M1 | backend 최소변경 — DDL(additive 3건) → role AI + 가드 → DRAFT 강제·mine 필터 → rate/상한 → schema 엔드포인트 → 시드 → 테스트 | AI 계정으로 **curl 만으로** 초안 등록 가능 + ACTIVE 생성 거부 확인 |
| M2 | `mcp/` 서버 — 클라이언트(토큰 수명주기) → 도구 7종 → README·`.mcp.json` 예시 → 스모크 | Claude 에서 端-端 "스키마→SQL→검증→초안" 완주, backend 수정 0 |
| M3 | 운영보강(선택, 전부 open-q 연동) — FE "AI 생성" 배지·대기 KPI, 알림(E3), 화이트리스트(K2), 승인타입 승격(K3), HTTP MCP(K4), DRAFT TTL(K5) | 항목별 별도 결정 |

각 M 단위 커밋(CLAUDE.md §9). 상세 체크 = [`02_checklist.md`](../progress/02_checklist.md).

문서 동기화 의무 — M1 시 [`spec/05_api_연결목록.md`](../spec/05_api_연결목록.md)(schema 엔드포인트+권한 컬럼) · [`spec/07_DBA_DDL.sql`](../spec/07_DBA_DDL.sql)+[`spec/06_DB_모델링.md`](../spec/06_DB_모델링.md)(ROLE 제약·시드) · [`guide/04_backend_가이드.md`](../guide/04_backend_가이드.md)(requireAdminOrAi·SchemaService).

---

## 12. 잔여 open-questions

[`open-questions.md`](open-questions.md) §K 참조. K1 시크릿 보관(P1) · K2 스키마 노출 범위(P1) · K3 승인타입 승격(P2, C8 종속) · K4 HTTP MCP(P2) · K5 DRAFT TTL(P2) · K6 rate-limit 수치 확정(P1) · K7 DS 응답 접속정보 제외 범위(P1). 막히는 시점에 닫고 본 PRD 에 조각 추가.

---

## 13. 리스크

| ID | 리스크 | 영향 | 완화 |
|---|---|---|---|
| R1 | AI 토큰/자격증명 탈취 | 중 — role AI 한정(초안+메타읽기) | 최소권한 role, Access 15분, refresh revoke, INACTIVE 킬스위치, 5회 잠금 |
| R2 | 초안 대량생성 폭주 | 중 | RateLimiter 재사용 + open-draft 상한 + DRAFT 필터 가시화 |
| R3 | 스키마 메타(컬럼명·코멘트) 민감정보 노출 | 중 | 현재 스키마 한정 + 2단계 응답 + K2 화이트리스트 |
| R4 | **쓰기 SQL 초안의 부주의 승인** (K0-b 가 쓰기 허용) | 고 | SqlPolicy 의 DELETE·DDL 상시 거부 유지 + user-guide 에 승인 전 SQL 검토 체크리스트(M3) + 승인자 MODID 감사 |
| R5 | 환경별 DDL(CHECK 변경) 드리프트 | 저 | additive ALTER 만, [`07_DBA_요청서.md`](../spec/07_DBA_요청서.md) 절차, dev-schema.sql 동시 갱신 |
| R6 | MCP 자격증명 오설정 → 계정 잠금(5회 실패) | 저 | fail-fast + 재로그인 1회·백오프, 무한 재시도 금지 |
| R7 | REST 계약 변경 시 MCP 도구 드리프트 | 저 | 도구 = REST 1:1 매핑(로직 없음) + M2 스모크 |
