> API Try-it(테스트 실행) PRD — 관리 콘솔과 공개 /docs 에서 등록 API 를 **실제 실행해 결과를 확인**하는 기능. 콘솔 = 관리자 인증 ad-hoc 실행(DML 롤백), /docs = 실제 게이트웨이 호출 재현.

# 03. API 테스트 실행(Try-it) PRD

**브랜치**: `dev-01` · **작성일**: 2026-06-07 · **상태**: 초안(범위 확정, 구현 전)

---

## 0. 한 페이지 요약

- **무엇을**. ① 관리 콘솔(API 등록 마법사 4단계·수정 화면)에서 작성/등록한 API 를 **저장 전이라도, DRAFT 라도** 즉시 실행해 결과(행·마스킹·소요시간)를 확인. ② 공개 `/docs` 에서 외부 사용자가 `X-Cert-Key` 를 입력해 **실제 게이트웨이 호출**을 브라우저에서 재현(Swagger Try-it 류).
- **스택/도구**. 신규 backend `POST /api/apis/test-run`(requireAdmin, ad-hoc) 1개 + FE 공용 `TryItPanel` 컴포넌트 + BFF 공개 프록시 `/api/try/{path}`. 기존 `SqlExecutor`(실행·마스킹)·`RateLimiter`·`test-connection` 선례 재사용.
- **1차 범위**. M1 backend test-run → M2 콘솔 FE(마법사 5탭) → M3 /docs Try-it + DRAFT 노출 갭 1줄 수정.
- **계약**. 기존 [`05_api_연결목록.md`](../spec/05_api_연결목록.md) 무변경, test-run 1행 추가. 게이트웨이 표면(`/api/sample/**`) 무수정.
- **DB**. 신규 테이블·컬럼 0.
- **언제 끝남**. 마법사에서 저장 전 SQL 을 실행해 행을 보고, AI 가 만든 DRAFT 를 승인자가 실행해 본 뒤 승인하며, /docs 에서 키 입력→호출→마스킹된 실응답을 확인할 수 있을 때.

**비목표** (이번에 안 함).
- 게이트웨이(`/api/sample/**`) 표면·동작 변경. CORS 개방.
- CALL(저장 프로시저) 테스트 — 내부 commit 롤백 불가, 1차 차단. → open-q L2.
- 테스트 전용 이력 테이블·컬럼. → L3.
- /docs 인증키 영속 보관(sessionStorage 등). 1차 메모리만. → L1.

---

## 1. 배경 · 목표

등록한 API 가 "정확히 어떤 결과를 주는지" 확인하려면 지금은 curl 을 직접 쳐야 한다. 마법사의 "테스트 실행" 단계는 Stepper 라벨만 있고 미구현(`frontend/components/ApiForm.tsx` — 탭 4개뿐), `/docs` 는 curl 예시 생성(`DocsViewer.buildCurl()`)까지만. AI 초안등록([`02_AI초안등록_PRD.md`](02_AI초안등록_PRD.md)) 이후엔 "승인 전에 실행해 보고 승인" 흐름이 필요해 콘솔 테스트 실행의 가치가 더 커졌다.

목표.
1. 콘솔 — 저장 전·후, DRAFT 포함 모든 정의를 관리자 권한으로 즉시 실행. 쓰기 SQL 도 **롤백 전제로** 결과 확인.
2. /docs — 외부 개발자가 문서 페이지에서 실제 게이트웨이 호출을 그대로 재현(검증 4단·rate-limit·이력 전부 실동작).
3. 운영 응답 충실 재현 — 마스킹 규칙 적용된 모습 그대로 보여준다.

---

## 2. 잠근 결정

| # | 결정 | 근거 |
|---|---|---|
| 1 | **범위 = 두 표면 모두, 콘솔 먼저**(M1→M2→M3) | 콘솔은 AI 초안 승인 워크플로와 직결. /docs 는 BFF 프록시만으로 backend 무수정 달성 |
| 2 | **콘솔 test-run 은 ad-hoc 정의 실행** — `POST /api/apis/test-run`(id 기반 아님) | 저장 전 마법사·미저장 수정분 테스트 가능. `datasources/test-connection` 선례. id 기반은 "저장된 것만" 제약 |
| 3 | **DML = 실행 후 롤백** | affected 확인 + DB 원상복구. 차단은 쓰기 API 의 검증 목적 반감, 그대로 실행은 데이터 오염. CALL 은 차단(L2) |
| 4 | **콘솔 test-run 이력 미적재 / /docs 호출은 적재 유지** | `DXAPI_CALL_HIST_L` 은 외부 호출 원장 — 테스트 혼입 시 KPI 왜곡. /docs 경유는 진짜 호출 |
| 5 | **/docs 는 BFF 공개 프록시**(`/api/try/{path}`) — backend CORS 개방 기각 | 게이트웨이 표면 무수정. 4단 검증·rate-limit·이력 그대로 통과 = 충실 재현 |
| 6 | **DRAFT 의 /docs 노출 갭 동반 수정** — `listDocVisible` ACTIVE 필터 1줄(M3) | Try-it 출시 순간 DRAFT 항목은 눌러도 403 — 갭이 사용자 가시화. openapi.json 도 동시 해결 |

---

## 3. 시스템 아키텍처

```
[관리 콘솔 경로 — M1·M2]
 관리자 브라우저 → BFF /api/mock/apis/test-run (backendProxy, Bearer)
   → backend POST /api/apis/test-run (requireAdmin)
       SqlPolicy 하드가드 → DataSourceRegistry 커넥션
       ├─ SELECT: maxRows·timeout 적용 → rows + 마스킹
       └─ DML:    autocommit off → 실행 → affected → ROLLBACK
       이력 미적재(INFO 로그만) · RateLimiter("test-run:"+userId)

[공개 /docs 경로 — M3]
 브라우저(키 입력) → BFF /api/try/{path} (무인증 프록시, X-Cert-Key·query/body·XFF forward)
   → backend GET|POST /api/sample/{path}   ← 기존 게이트웨이 그대로
       4단 검증 → 실행 → 마스킹 → call_hist 적재(진짜 호출)
```

---

## 4. 모듈 / 패키지 구조

```
backend/  (M1 — 신규 3, 수정 3)
  apidef/TestRunService.java     # 신규 — 커넥션 수동 관리·SELECT/DML 분기·롤백·maskRows 재사용
  apidef/TestRunRequest.java     # 신규 — {method, sql, dataSrcId, params, resps?, maxRows?}
  apidef/TestRunResult.java      # 신규 — {rows?|affected?, rowCount, limited, elapsedMs, rolledBack}
  apidef/ApiDefController.java   # 수정 — POST /test-run + requireAdmin + rate-limit 훅
  gateway/SqlExecutor.java       # 수정 — 실행·마스킹 로직 옵션화(maxRows·timeout 주입 가능하게) 소폭
  application.yml                # 수정 — app.test-run.{per-min, timeout-sec, max-rows-cap}

frontend/ (M2 — 신규 2, 수정 1 / M3 — 신규 1, 수정 1)
  components/TryItPanel.tsx          # 신규 공용 — params 메타 기반 입력폼 자동 생성 + 응답 JSON 뷰
  app/api/mock/apis/test-run/route.ts # 신규 — backendProxy 1:1 (validate-sql route 동형)
  components/ApiForm.tsx             # 수정 — 5번째 탭 "테스트 실행" (TabId·TABS +1)
  app/api/try/[path]/route.ts        # 신규(M3) — 무인증 게이트웨이 프록시
  components/DocsViewer.tsx          # 수정(M3) — 상세에 TryItPanel(docs 모드)

backend/ (M3 — 수정 1)
  apidef/ApiDefService.java          # listDocVisible 에 ACTIVE 필터 1줄
```

---

## 5. 1차 범위

### 5.1 포함 (M1~M3)
backend test-run(롤백·한도·마스킹) / 마법사 5탭·수정화면 테스트 / /docs Try-it(키 입력·confirm) / DRAFT 문서 노출 필터 / 단위·통합·e2e 테스트 / 문서 동기화.

### 5.2 제외 (후속 — M4·open-q)
CALL 테스트(L2), test-run 감사 정식화(L3), 익명 API per-IP 제한(L4), AI role 의 test-run(L5), 키 sessionStorage(L1), 게이트웨이 본체 queryTimeout 적용(별도 갭으로 기록만).

---

## 6. HTTP 계약

기존 계약 무변경. 추가 1건 + BFF 프록시 1건.

**`POST /api/apis/test-run`** (ADMIN — [`05_api_연결목록.md §4`](../spec/05_api_연결목록.md) 에 행 추가 예정)

```jsonc
// 요청
{
  "method": "GET",                  // SQL 정책 분기 (GET=SELECT만, 非GET=+INSERT/UPDATE/MERGE)
  "sql": "SELECT ... WHERE x = #{p}",
  "dataSrcId": "DS20260509001",
  "params": { "p": "값" },          // 바인드 값 맵
  "resps": [{ "col": "user_nm", "maskRule": "name" }],   // 선택 — 주면 운영과 동일 마스킹
  "maxRows": 100                    // 선택 — 기본 100, 상한 1000
}
// 응답 (SELECT)
{ "ok": true, "data": { "rows": [...], "rowCount": 3, "limited": false, "elapsedMs": 12, "rolledBack": false } }
// 응답 (DML)
{ "ok": true, "data": { "affected": 1, "rowCount": 1, "limited": false, "elapsedMs": 8, "rolledBack": true } }
// 실패 — ORA- 루트 메시지 그대로 (관리자 표면. 게이트웨이의 상세 숨김과 의도적으로 다름)
{ "ok": false, "message": "INVALID_INPUT", "issues": "ORA-00942: table or view does not exist" }
```

**BFF `GET|POST /api/try/{path}`** (frontend 공개 라우트, M3) — `X-Cert-Key`·query/body 를 `${BACKEND_URL}/api/sample/{path}` 로 그대로 전달, 응답 봉투(`{ok,data,code,traceId}`) 그대로 반환. 브라우저 IP 를 `X-Forwarded-For` 로 세팅.

---

## 7. DML 롤백 설계 · 한계

- `DataSourceRegistry.get(dataSrcId)` 에서 Connection 수동 획득 → `setAutoCommit(false)` → `SingleConnectionDataSource` 래핑 → 기존 실행·마스킹 로직 재사용 → 결과 수집 후 **무조건 rollback** → 커넥션 반환.
- `rolledBack: true` 를 응답·UI 배지로 명시 — "DB 는 원상복구됨".
- **한계 (PRD·UI 문구로 명시, R1)**: 시퀀스 NEXTVAL 은 롤백돼도 소모됨 / autonomous transaction·트리거 내 commit 은 롤백 불가 / CALL 은 이 이유로 1차 차단.

---

## 8. 보안 · 한도

| 항목 | 정책 |
|---|---|
| 권한 | `requireAdmin` 전용. AI role 불허(1차 — L5). test-run 은 관리자 ad-hoc SQL 실행 표면이지만 폭발반경은 기존과 동일(ADMIN 은 이미 등록·활성화로 임의 SQL 실행 가능) |
| SQL 정책 | `SqlPolicy` 하드가드 그대로 — DDL·DELETE·다중문·DBMS_/UTL_ 상시 거부, method 기반 동사 제한 |
| rate-limit | `RateLimiter` 재사용, key=`"test-run:"+userId`, `app.test-run.per-min` 기본 30 (L6) |
| row/timeout | maxRows 기본 100·상한 1000(`limited` 플래그) / queryTimeout = DS `QUERY_TIMEOUT_SEC` 폴백 `app.test-run.timeout-sec` 10s |
| /docs 키 | password 형 input, React 메모리만 보관(L1), 非GET confirm("실제 데이터가 변경됩니다") |

---

## 9. 이력 정책

| 경로 | `DXAPI_CALL_HIST_L` | 비고 |
|---|---|---|
| 콘솔 test-run | **미적재** | 외부 호출 원장 오염 방지(신규 구분 컬럼 금지 원칙). backend INFO 로그(actor·dataSrcId·verb·elapsed)로만. 감사 정식화 = L3 |
| /docs try-it | **적재** | 진짜 게이트웨이 호출 — traceId 로 모니터링 추적 가능(장점) |

---

## 10. 테스트 전략 (CLAUDE.md §8)

- **단위**. `TestRunServiceTest` — SELECT rows·maxRows limited·DML affected+rolledBack·CALL 거부·정책 거부(Mockito + 가능 범위).
- **통합**(dev Oracle, `-Dit.devdb=true`). UPDATE test-run 후 **원본 행 불변 실증**(rollback) / DRAFT 정의 실행 / AI 토큰 403 / maxRows.
- **e2e**. 마법사에서 저장 전 실행(M2) / /docs 키 입력→200·오답키 401(M3).
- **완료 기준**. §0 "언제 끝남" 시나리오 green.

---

## 11. 마일스톤

| 순서 | 내용 | 산출물·검증 |
|---|---|---|
| TI-M1 | backend `POST /api/apis/test-run` — TestRunService(SELECT 한도/DML 롤백/CALL 차단) + rate-limit + 테스트 | curl+ADMIN 토큰: rows / affected+rolledBack 후 DB 원상 / DRAFT 실행 / AI 403 |
| TI-M2 | 콘솔 FE — TryItPanel + ApiForm 5탭 + BFF route | 마법사 저장 전 실행 green, AI DRAFT "실행해 보고 승인" 시나리오 |
| TI-M3 | /docs — `/api/try/{path}` 프록시 + DocsViewer 패널 + listDocVisible ACTIVE 필터 | 정상키 200(마스킹)·오답키 401·익명 API 무키 200·이력 적재 확인·DRAFT 문서 미노출 |
| TI-M4(선택) | L1 키 보관·L2 CALL·L4 per-IP — open-q 결정 후 | 항목별 |

문서 동기화 — [`spec/05_api_연결목록.md`](../spec/05_api_연결목록.md)(§4 행 추가) · [`guide/04_backend_가이드.md`](../guide/04_backend_가이드.md) · [`user-guide/04_API관리.md`](../user-guide/04_API관리.md)(4단계 실사용 설명) · [`user-guide/10_API문서_공개페이지.md`](../user-guide/10_API문서_공개페이지.md).

---

## 12. 잔여 open-questions

[`open-questions.md`](open-questions.md) §L — L1 키 보관 UX(P1) / L2 CALL 지원(P2) / L3 감사(P2) / L4 익명 per-IP(P2) / L5 AI role 접근(P2) / L6 수치 확정(P1).

---

## 13. 리스크

| ID | 리스크 | 영향 | 완화 |
|---|---|---|---|
| R1 | 롤백 불완전(시퀀스 소모·트리거 내 commit) | 중 | CALL 차단 + 한계 문구 + 통합테스트로 rollback 실증 |
| R2 | test-run = 관리자 ad-hoc SQL 표면(토큰 탈취 시) | 중 | requireAdmin + SqlPolicy 하드가드 + rate-limit + 로그. 폭발반경 기존 ADMIN 과 동일 |
| R3 | /docs 에서 인증키가 브라우저에 머묾 | 중 | 메모리만·password input·경고문(L1). 키 입력 주체 = 키 소유자 |
| R4 | /docs 경유 DML 이 실데이터 변경 | 중 | 非GET confirm + "실제 호출" 경고 — 의도된 재현 동작 |
| R5 | 익명 API try-it 폭주(게이트웨이 한도 미적용 구간) | 저 | 기존 동작 — L4 에서 per-IP 결정 |
| R6 | 장기 SELECT 의 대상 DS 풀 점유 | 저 | maxRows+queryTimeout(M1). 게이트웨이 본체 timeout 은 별도 갭 기록 |
| R7 | BFF 프록시 XFF 신뢰(스푸핑) | 저 | 기존 게이트웨이도 XFF 신뢰 — 프록시는 실IP 세팅, 악화 없음 |
