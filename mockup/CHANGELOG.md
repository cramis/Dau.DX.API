# Mockup 변경 이력

> Mockup 단계의 화면·인터페이스·Mock 데이터 변경을 추적한다. PRD 본문(`doc/Dau.DX.API_개발계획/`) 의 변경은 git history 로 추적하므로 여기 적지 않는다.

기록 형식: 한 줄 요약 + 사유. 1주 1회 사용자 데모 후 일괄 정리.

---

## 2026-05-09 — 부트스트랩 (Day 0 ✅)

- Next.js 16.2.6 + React 19.2 + TypeScript 5.9 + Tailwind CSS 4.3 (App Router, no src-dir)
- Bun 1.2.15 로 부트스트랩 (`bunx create-next-app@latest mockup --use-bun --yes`)
- shadcn/ui 초기화 (default style, slate base color)
- 기본 컴포넌트 13종: button / input / label / table / select / textarea / checkbox / sonner / card / dropdown-menu / tabs / dialog / form
- form.tsx 는 shadcn add silent fail 회피로 직접 작성 (표준 코드 + 한국어 헤더)
- 라이브러리: zod 4.4 / react-hook-form 7.75 / @hookform/resolvers 5.2 / @monaco-editor/react 4.7 / @playwright/test 1.59
- @radix-ui/react-slot 1.2 / react-label 2.1 (shadcn 의존 수동 설치)
- TypeScript clean (`bunx tsc --noEmit` exit 0)

## 2026-05-09 — 진행 상태 PRD 추가

- [`doc/Dau.DX.API_개발계획/03_mockup_구현계획.md`](../doc/Dau.DX.API_개발계획/03_mockup_구현계획.md) 신설
- 7일 가이드 체크리스트 + 진행 상태 트래커 + 새 세션 진입 절차 + 컨텍스트 노트 + 트러블슈팅
- 매 작업 단위 종료 시 본 CHANGELOG 와 03 §4 트래커 양쪽 갱신 규칙

## 2026-05-10 — Day 5 모니터링·승인·사용자·문서·샘플 GW ✅

- **샘플 게이트웨이 5개** (`/api/sample/*`) — `lib/mockGateway.ts` 의 4단 검증(인증키→IP→이용기간→매핑 API) + `lib/mockHistory.ts` 인메모리 큐(globalThis 보관, 최대 500건). localhost(`::1`/`127.0.0.1`/`::ffff:127.0.0.1`) 는 IP 검증 자동 통과
  - `sample-user-info` (GET) — mockData.users 시드 응답
  - `sample-grade-list` (GET) — 고정 mock 4건
  - `sample-grade-save` (POST) — `{saved:1}`
  - `sample-dept-tree` (GET) — 고정 mock 7건
  - `sample-notification-send` (POST) — A20260509005 가 DRAFT 라 `API_NOT_ACTIVE` 응답 (정책 검증용)
- **모니터링 라이브 큐 연결**
  - `app/api/mock/monitoring/history/route.ts` — q/statusCode/apiNo/extSysId/from/to/limit 필터
  - `app/api/mock/monitoring/stats/route.ts` — windowMin(5~180) KPI + 분당 시리즈
  - `components/LiveLogTable.tsx` — 5초 자동 폴링 + 응답코드 필터 + 텍스트 검색. 큐 비어있을 때 `curl` 가이드 노출
  - `components/LiveStatsCard.tsx` — `/monitoring` 대시보드 하단에 "LIVE" 라이브 KPI(총/성공/오류/p95) + 2x 시리즈 차트
  - `monitoring/logs/page.tsx` 정적 시드 → LiveLogTable 로 교체 (필터 패널은 디자인 보존)
  - `monitoringSeed.getCallByTrace` — seed 미스 시 라이브 큐(`mockHistory.findByTrace`) 로 폴백해 trace 상세 페이지가 라이브 traceId 도 표시
- **승인 (API/User)**
  - `app/api/mock/approvals/api/route.ts` (GET ?status) + `[seq]/approve/reject/route.ts` (admin 권한 필요). 승인 시 `extSystem.mappedApis` 에 targetId 자동 추가
  - `app/api/mock/approvals/user/route.ts` + `[seq]/approve/reject/route.ts`. 승인 시 `user.status` PENDING → ACTIVE, 반려 시 → REJECTED
  - `(admin)/approvals/api/page.tsx` / `(admin)/approvals/user/page.tsx` — 3탭(대기/승인/반려) + KPI + 행별 [승인][반려]. `window.confirm` + reject 시 `window.prompt`
  - `mockData` 시드: `approvals` 2건(USER_SIGNUP user02, API_USAGE E20260509001 → A20260509004)
- **사용자 관리**
  - `app/api/mock/users/route.ts` (GET admin 전용, password 마스킹) + `[id]/route.ts` (GET/PATCH status — `CANNOT_UPDATE_SELF` 보호)
  - `(admin)/users/page.tsx` — 검색·상태 필터 + 4 KPI + [활성화][비활성화][반려] 버튼 + 본인 행은 액션 비활성
- **API 문서 뷰어**
  - `app/docs/page.tsx` — placeholder → 정식. 좌측 그룹별 트리 + API 검색, 우측에 method/경로/파라미터 표/응답 컬럼 표/curl 예시 코드블록. 비로그인 접근 가능
- **공통**
  - `app/api/mock/reset/route.ts` 가 `resetCallStore` 도 호출 — e2e/데모 시드 복원 시 라이브 큐도 비움
  - `types/api.ts` 에 `HttpMethod` 타입 export
- **e2e 신규 6 시나리오** (`day5-monitor-approve-users.spec.ts`) — /docs 비로그인 렌더, 사용자 비활성화, API 사용 승인 + ext.mappedApis 갱신, 가입 승인 + user02 로그인, 샘플 GW 3건 호출 → 라이브 표 3행, 잘못된 인증키 → 403 + 표에 1행. **전체 38/38 PASS**
- Day 1 e2e 의 `/docs` heading 회귀 2건 갱신 (placeholder → 실제 뷰어 검증으로 변경)
- `bunx tsc --noEmit` clean

## 2026-05-10 — Day 4 데이터소스 / 연계시스템 CRUD ✅

- **데이터소스** (`/datasource`)
  - 모달 기반 등록·수정 폼: 이름·종류(Oracle/PG/MySQL)·JDBC URL·DB 사용자·풀(min/max)·쿼리 타임아웃·useYn
  - 폼 안 `[연결 테스트]` 버튼 — `POST /api/mock/datasources/test-connection` 호출. JDBC URL 에 `BREAK` 포함 시 항상 실패, `stg/dev/qa/lab` 호스트는 75% 실패
  - 행별 [수정]/[삭제] 버튼. 매핑 API 가 있는 DS 삭제 시도 시 IN_USE 토스트
  - 검색 필터(이름·JDBC·ID), 빈 상태 안내(`.w-empty`)
- **연계시스템** (`/ext-system`)
  - 신규 페이지 (placeholder → 정식). 4 KPI 타일(총수/매핑수/만료임박 30일/인증키 정책)
  - 모달 기반 등록·수정 폼: 이름·허용 IP/CIDR(textarea)·이용 기간(date 2종)·매핑 API 체크박스 그리드·담당자(이름/이메일)·비고·status
  - 인증키 1회 노출 다이얼로그 (`CertKeyDialog`) — 발급/재발급 시 새 키 표시 + 복사 버튼 + 경고 배너. 닫으면 마스킹된 형태(`AKAD####-••••...`) 만 노출
  - `POST /api/mock/ext-systems/[id]/regenerate-key` 라우트 — 새 키 생성 + 시드 갱신 + freshCertKey 응답
- **공통 디자인 자산**
  - `components/design/Modal.tsx` — Wanted 토큰 모달(ESC 닫기·body 스크롤 락·≤640px fullscreen 폴백)
  - `app/wanted-components.css` — `.w-modal*` / `.w-empty` 클래스 추가
  - `Icons.tsx` — `Trash` / `Pencil` / `Key` 3종 추가
- **스키마·라이브러리**
  - `lib/schemas/datasource.ts` — `dataSourceCreate/UpdateSchema` (poolMin ≤ poolMax 리파인)
  - `lib/schemas/extSystem.ts` — `extSystemCreate/UpdateSchema` (IP/CIDR 정규식 + useEnd ≥ useBegin 리파인)
  - `lib/certKey.ts` — `AKAD####-XXXXXXXX-YYYYYYYY-ZZZZZZZZ` 형식 생성기
- **Mock 라우트 신규 6개**
  - `/api/mock/datasources` (GET·POST)
  - `/api/mock/datasources/[id]` (GET·PUT·DELETE — IN_USE 차단 포함)
  - `/api/mock/datasources/test-connection` (POST)
  - `/api/mock/ext-systems` (GET·POST — freshCertKey 응답)
  - `/api/mock/ext-systems/[id]` (GET·PUT·DELETE)
  - `/api/mock/ext-systems/[id]/regenerate-key` (POST)
- **e2e 신규 8 시나리오** (`day4-ds-ext.spec.ts`) — DS 검색·등록·연결테스트·풀 검증·삭제 차단 + ExtSys 마스킹·발급 다이얼로그·재발급. **전체 32/32 PASS**
- `bunx tsc --noEmit` clean

## 2026-05-10 — 인증 화면 Wanted 디자인 적용 (로그인·회원가입·비밀번호 찾기)

- `(auth)/layout.tsx` 스플릿 셸 재구성 — 좌측 그라디언트 브랜드 패널(Mockup 핵심 가치 3종 chip) + 우측 폼 카드. ≤960px 단일 컬럼, ≤768px 패널 헤더 단축
- `app/wanted-components.css` 추가 클래스: `.w-auth-shell` / `.w-auth-brand*` / `.w-auth-card(--wide)` / `.w-auth-demo*` / `.w-checkbox-row` / `.w-grid-2` / `.w-input-row` / `.w-form-banner(--error/success/info)`
- `FormBanner` 토큰 교체 — Tailwind 클래스 → `.w-form-banner` (testid `form-banner-{variant}` + role=alert/status 유지)
- 로그인/회원가입/비밀번호 찾기 페이지: shadcn Form/Input/Button/Checkbox 제거 → 시맨틱 `<label htmlFor>` + `.w-input` / `.w-btn--primary` / `.w-checkbox-row`. RHF + zod 검증 로직은 그대로
- e2e 회귀 0 — Day 1/2/3 24/24 PASS (`getByLabel`, 데모 버튼 ADMIN admin01, role=alert, testid=demo-accounts/id-check-ok 모두 보존)

## 2026-05-09 — Wanted 디자인 프로토타입 통합 (18 화면 · 모바일 반응형)

- Wanted Design System 토큰 도입: `app/wanted-tokens.css` (--w-* 변수 96종) + `app/wanted-components.css` (.w-* 컴포넌트 클래스). Pretendard Variable + Wanted Sans 웹폰트
- 셸 재구성: `components/design/AppShell.tsx` — 좌측 232px 사이드바 + 56px 토픈바 (기존 AppHeader/Sidebar 대체). `<header>` 시맨틱 유지
  - 모바일(≤768px): 사이드바 → 햄버거 드로어 + backdrop. 토픈바 chip/사용자명 자동 축소. 그리드(`split--3` `metrics`)는 1열 폴백
- 공통 디자인 컴포넌트: `Icons.tsx`(31 icons) / `Stepper` / `CodeBlock` / `LineChart` / `MetricTile` / `Hypothesis` / `HttpMethod` / `Notice` / `Checklist` / `TraceRow`
- 가설 1 (셀프서비스 발급) — 6 화면
  - `/api-list` (S1) 재구현: 4 KPI 타일(전체/운영중/셀프서비스 비율/평균 발급) + 검색·필터·정렬·페이징 테이블. e2e contract(`data-testid="api-row"` / 검색 placeholder / "총 N 건") 보존
  - `/api-list/new` (S2~S5): PageHead + 5단계 Stepper(현재 0) + 기존 ApiForm 4탭 폼
  - `/api-list/[id]` (수정): Stepper 4 단계로 "발급 완료" 강조
  - `/api-list/[id]/done` (S6) 신규: 발급 완료 카드 + 엔드포인트 + curl 자동 문서
- 가설 2 (모니터링) — 6 화면, `/monitoring`
  - 대시보드 (S1) — 4 KPI + 호출량 라인 차트(2x 시리즈) + 진행 인시던트 카드 + 상위 영향 API
  - `/monitoring/incidents/[id]` (S2) — CRITICAL 헤더 + 5xx 추이 + AI 진단 체크리스트
  - `/monitoring/logs` (S3) — 조건 패널(5종) + trace-id 행 결과 테이블
  - `/monitoring/logs/[traceId]` (S4) — TraceRow 6 row(http→auth→pool→oracle) + 요청/응답 코드블록
  - `/monitoring/logs/[traceId]/root-cause` (S5) — v1↔v2 SQL diff + EXPLAIN PLAN 메트릭 + AI 요약(4분 22초)
  - `/monitoring/rules` (S6) — 규칙 6개 + 편집 패널 + 발동 이력 라인
- 가설 3 (Hot-swap) — 6 화면, `/datasource`
  - `/datasource` (S1) 재구현: 5 데이터소스 + 풀 사용률·지연 + LMS-PROD 풀 추이 차트
  - `/datasource/[id]/swap` (S2) — 신규 연결 정보 폼 + 전환 모드 3종 + 실행 시점
  - `/datasource/[id]/swap/test` (S3) — 5/5 검증 체크리스트 + 차분 표 + 5 API 회귀
  - `/datasource/[id]/swap/impact` (S4) — 4 KPI + 상위 영향 시스템 + 시뮬레이션 TraceRow + 롤백 정책
  - `/datasource/[id]/swap/run` (S5) — 78% 진행률 + 트래픽 분포(6%↔94%) + 이벤트 로그 11줄
  - `/datasource/[id]/swap/done` (S6) — 사전·사후 비교 표 5행 + 헬스체크 5/5
- `/dashboard` 신규 (3 가설 배너 + 핵심 지표) · proxy.ts 보호 prefix 추가
- mockData 확장: dataSources 1 → 5 (DAU-CORE-PROD, DAU-LMS-PROD, DAU-LIB-PROD, DAU-HR-PROD, DAU-CORE-STG). `lib/monitoringSeed.ts` / `lib/datasourceMeta.ts` 신설
- `app/(admin)/layout.tsx` — async 서버 컴포넌트로 user 조회 후 AppShell 에 전달, brandRight 슬롯에 LogoutButton 마운트
- e2e 라벨 동기화: Day 1 ADMIN_MENUS(API → API 관리, 사용자 관리 → 사용자, 본인 정보 → 설정), Day 2 본인정보 링크 → 설정, Day 3 헤더 정렬 regex (API 번호), 신규 등록 link 텍스트
- 전체 e2e **24/24 PASS** · `bunx tsc --noEmit` clean · 14 신규 라우트 모두 200

**의도**: 디자인 캔버스에 정의된 3가설 × 6화면을 실제 라우트로 펼쳐 팀 데모 시 "가설을 한 흐름으로" 검증하도록 한다. 데스크톱 1280×820 픽셀 퍼펙트보다 흐름 + 모바일 동작 우선.

## 2026-05-09 — UX 개선: 인라인 에러 배너 + 데모 계정 빠른 채우기

- `components/FormBanner.tsx` — error/success/info 변형의 영구 인라인 배너 (role=alert, data-testid)
- 로그인 화면 — toast.error 를 인라인 배너로 전환. 폼 하단에 데모 계정 패널(admin01/user01/user02 PENDING 3개) 추가, 클릭 시 ID·PW 자동 채움
- 회원가입 화면 — 서버 에러는 인라인 배너. ID 중복확인 결과는 필드 하단(FormMessage / `data-testid="id-check-ok"`) 으로 자연스럽게 노출
- 비밀번호 찾기 — 성공·실패 토스트를 인라인 배너로 전환
- Day 2 e2e 9 시나리오로 확장 (배너 검증, 데모 계정 클릭, ID 중복확인 인라인). 전체 e2e 24/24 PASS

**의도**: toast 는 4초 후 사라져 사용자가 "왜 안 됐지" 를 놓치는 경우가 있다. 블로킹 에러는 폼 안에 영구 노출, 토스트는 성공·전이형 알림에 한정.

## 2026-05-09 — Day 3 ✅ API 목록 + 등록(4탭) + 수정 + 삭제

- `app/(admin)/api-list/page.tsx` — DataTable (검색·정렬·페이징, 클라이언트 in-memory)
- `app/(admin)/api-list/new/page.tsx` + `[id]/page.tsx` — ApiForm 재사용 (mode=create|edit)
- `components/ApiForm.tsx` — 4탭 (기본정보 / SQL / 입력 파라미터 / 응답 컬럼), react-hook-form + useFieldArray
- `components/SqlEditor.tsx` — `@monaco-editor/react` wrapper, sql 모드. onMount 에서 editor 인스턴스를 window 노출(e2e 안정화)
- `components/ApiListTable.tsx` — 클라이언트 측 검색·헤더 토글 정렬·페이지(10건/page)
- `lib/schemas/api.ts` — apiCreateSchema / apiUpdateSchema (path 정규식 + 응답 컬럼 1개 이상)
- mock route 4종: `/apis` (GET·POST), `/apis/[id]` (GET·PUT·DELETE), `/apis/check-path`, `/apis/validate-sql`
- 시드 5개 + `AYYYYMMDD###` 자동 일련번호 발번
- Native `<select>` 채택 (shadcn `@base-ui/react` Select 의존 회피, 폼 통합 단순화)

### Day 3 자동 검증

- `e2e/day3-api.spec.ts` 6 시나리오 작성 + `bun run e2e:day3` (PASS)
- 전체 e2e 21/21 PASS (17.3초). Day 1·2 회귀 동일 PASS
- **검증 중 4건 발견·수정**:
  1. **`/api/mock/_reset` 가 404** — Next.js 16 의 private folder 규칙(`_` prefix 폴더는 라우팅 제외)으로 `_reset` 자체가 라우팅 안 됨. `reset` 으로 rename. Day 1·2 e2e 의 reset 호출 경로도 동기화.
     (Day 2 e2e 가 PASS 했던 건 각 테스트가 시드 재초기화 없이도 독립적으로 동작했기 때문 — Day 3 의 mutation-heavy 시나리오에서 비로소 노출.)
  2. zodResolver + zod `.default([])` / `.default("none")` 조합이 input/output 타입 분리를 일으켜 `useForm<T>` 의 TFieldValues 가 widen → `apiDefSchema` 의 `.default()` 제거하고 `form.defaultValues` 로 처리
  3. Monaco textarea 셀렉터(`.monaco-editor textarea` / `.inputarea`) 가 버전·렌더 타이밍에 따라 흔들림 → SqlEditor 의 onMount 에서 editor 인스턴스를 `window.__sqlEditor` 로 노출, e2e 의 fillSql 은 `editor.setValue(...)` 직접 호출
  4. `<th>` 의 ARIA role 은 `columnheader` 이지 `cell` 아님 → `getByRole("columnheader", { name: /^번호/ })` 사용

## 2026-05-09 — Day 2 ✅ 인증 화면 정식 폼

- 정식 로그인 / 회원가입(9 필드 + 동의 + ID 중복확인) / 비밀번호 찾기 폼 (react-hook-form + zod)
- 본인 정보 페이지 3탭 (기본정보 / 비밀번호 변경 / 세션)
- 6개 mock route 추가: `/auth/login`(PW 검증) / `/auth/forgot-password` / `/users/check-id` / `/users/signup` / `/users/me` (GET·PUT) / `/users/me/password` / `_reset`
- `lib/schemas/auth.ts` — 5개 zod 스키마 (login, signup, forgot, updateProfile, changePassword)
- 시드 비밀번호 추가 (`admin01!` / `user01!` / `user02!`)
- `mockData` globalThis singleton — Bun+Turbopack HMR 후에도 mutation 유지
- `/api/mock/_reset` 라우트 — e2e 시드 복원

### Day 2 자동 검증

- `e2e/day2-auth.spec.ts` 7 시나리오 작성 + `bun run e2e:day2`
- Day 1 helper(`loginAs`) 로 통일 + `data-active` 검증
- **검증 중 5건 발견·수정**:
  1. shadcn `@base-ui/react` Button 의 `asChild` 미지원 → `buttonVariants` className 패턴
  2. Bun + Turbopack HMR 시 mockData mutation 휘발 → globalThis singleton
  3. Checkbox label strict mode violation → `getByRole("checkbox", { name: ... })`
  4. 헤더·세션 탭 중복 "로그아웃" 버튼 → 컨테이너 한정
  5. Day 2 정식 폼 교체로 Day 1 임시 버튼 셀렉터 깨짐 → `loginAs` helper 통일
- Playwright `retries: 1` (CI 에서는 0)
- 전체 e2e 15/15 PASS (10.6초)

## 2026-05-09 — Day 1 자동 검증 + 발견 버그 수정

- `playwright.config.ts` 추가, `e2e/day1-smoke.spec.ts` 8 시나리오 작성
- `bun run e2e:day1` 으로 회귀 검증 가능 (5.6초)
- **검증 중 실제 버그 3건 발견 + 즉시 수정**:
  1. `proxy.ts` matcher 의 negative-lookahead 가 `/api-list` 와 잘못 매칭되어 인증 가드 무력화 → matcher 를 화이트리스트(`/api-list/:path*` 등) 로 교체
  2. Sidebar 의 비활성 메뉴 hover variant `bg-accent/50` 가 활성 검증 정규식과 충돌 → `data-active` attribute 추가
  3. e2e 메뉴 순회 시 `/docs` 가 admin layout 밖이라 사이드바 소실 → 순회 8개 + `/docs` 별도 클릭 검증으로 시나리오 분리
- 03 §3 Day 1 체크리스트에 e2e PASS 항목 추가, §6.2 Pitfalls 에 위 3건 기록

## 2026-05-09 — Day 1 ✅ 레이아웃 / 사이드바 / Mock JWT 가드

- 도메인 타입(`types/api.ts`) + 시드(`lib/mockData.ts`) + 인증 헬퍼(`lib/mockAuth.ts`)
- 공통 컴포넌트: `Sidebar`, `AppHeader`, `LogoutButton`, `ComingSoon`
- (admin) layout + 9개 placeholder + (auth) layout + 3개 페이지 + `/docs` placeholder = 13개 라우트
- `app/(auth)/login/page.tsx` 는 Day 1 임시 (admin01/user01 버튼 로그인). Day 2 에 정식 폼으로 교체.
- `app/api/mock/auth/login`, `/logout` route handler (Day 2 에 PW 검증 추가)
- 루트 `layout.tsx` 한국어 lang + sonner Toaster 마운트, `page.tsx` redirect 로직
- `middleware.ts` → **`proxy.ts`** 로 시작 (Next.js 16 deprecation 회피)
- `bun run build` 통과 (16 라우트 전부, 경고 0)

> **다음**: [03 §3 Day 4](../doc/Dau.DX.API_개발계획/03_mockup_구현계획.md#day-4--데이터소스--연계시스템-) — `app/(admin)/datasource/page.tsx` 의 목록 + 등록/수정 다이얼로그 + 연결 테스트 mock 부터.
