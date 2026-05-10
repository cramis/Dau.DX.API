# 03. Mockup 구현 계획 (체크리스트 + 진행 상태)

> **이 문서만 보면 새 PC / 새 세션에서도 다음 줄부터 바로 이어갈 수 있다**.
> 매 작업 단위 종료 시 본 문서의 §4 "진행 상태 트래커" 와 `mockup/CHANGELOG.md` 양쪽을 갱신한다.

---

## 1. 한 페이지 요약

- **무엇을**: Next.js 단독으로 12개 화면 + 5개 샘플 게이트웨이 시연. 백엔드 코드 0줄.
- **어디서**: `mockup/` 폴더. Bun 으로 개발.
- **왜**: 화면·인터페이스를 사용자와 합의해 Phase 2(백엔드) 의 결정을 수렴.
- **언제 끝남**: [`01_mockup계획.md §8 종료 조건`](01_mockup계획.md#8-mockup-단계-종료-조건) 충족 + PO 사인오프.
- **중단 시 복귀**: 본 문서 §4 트래커의 `다음 시작점` 줄을 보고 그 작업부터 재개.

```
[Day 0 부트스트랩] → [Day 1 레이아웃] → [Day 2 인증] → [Day 3 API] →
[Milestone W: Wanted 디자인 통합] →
[Day 4 DS·연계] → [Day 5 모니터링·문서·승인·사용자] → [Day 6 e2e] → [Day 7 데모]
```

### 1.1 디자인 가이드 (Day 3.5 이후 신규/수정 화면 전부 적용)

- **디자인 시스템**: Wanted Design System (Pretendard Variable + Wanted Sans 웹폰트).
- **토큰 위치**: [`mockup/app/wanted-tokens.css`](../../mockup/app/wanted-tokens.css) — 96종 `--w-*` 변수.
- **컴포넌트 클래스**: [`mockup/app/wanted-components.css`](../../mockup/app/wanted-components.css) — `.w-app` / `.w-sidebar` / `.w-card` / `.w-btn` / `.w-input` / `.w-form-banner` / `.w-auth-*` 등.
- **공통 컴포넌트**: [`mockup/components/design/`](../../mockup/components/design/) — `AppShell` / `Icons` / `Stepper` / `CodeBlock` / `LineChart` / `primitives`(MetricTile/Hypothesis/HttpMethod/Notice/Checklist/TraceRow).
- **반응형**: 모바일 ≤768px 사이드바 → 햄버거 드로어. 그리드(`split--3` `metrics`) 1열 폴백. 비디오 프리뷰 폰트 축소.
- **신규 화면 구현 시 의무 사항**:
  1. shadcn `Button`/`Input`/`Form` 대신 `<button className="w-btn w-btn--primary">` / `<input className="w-input">` / 시맨틱 `<label htmlFor>` 직조.
  2. 토스트는 `sonner` 유지(Wanted 와 시각적 충돌 없음). 인라인 메시지는 `.w-form-banner` 또는 `.w-notice`.
  3. 페이지 헤더는 `<PageHead breadcrumb sub actions>` 사용. 단일 카드는 `.w-card` + `.w-card__head/__body`.
  4. 모든 신규 페이지 진입 시 모바일(≤768px) 에서 가로 스크롤 0 인지 직접 확인.
- **e2e 호환**: 라벨/버튼 텍스트/`data-testid` 는 절대 변경 금지. UI 스타일만 Wanted 로 교체.

---

## 2. Prerequisites (선행 독서, 처음 합류 시)

순서대로 읽는다. 새 PC·새 세션 모두 동일.

1. [`README.md`](README.md) — 5분. 무엇을 만들고 무엇을 미루는가.
2. [`01_mockup계획.md`](01_mockup계획.md) — 10분. 폴더 구조, Mock 데이터, 5개 GW 인터페이스, e2e 5종.
3. [`02_화면명세.md`](02_화면명세.md) — 10분. 12개 화면 라우트와 핵심 필드.
4. [`open-questions.md`](open-questions.md) — 5분. **무엇을 결정 안 해도 되는지** 알고 가야 헤매지 않는다.
5. **본 문서 §4 트래커** — 즉시. 어디까지 했는가.
6. [`../../mockup/CHANGELOG.md`](../../mockup/CHANGELOG.md) — 마지막 두 항목. 직전 변경 컨텍스트.

> 합쳐서 약 30~40분이면 작업 재개 가능.

---

## 3. Day 별 체크리스트

> 각 Day 완료 시 ☐ → ☑ 로 바꾸고 §4 트래커 갱신. 한 Day 가 여러 세션으로 늘어져도 무방. 중간 항목만 채우다 멈춰도 OK.

### Day 0 — 부트스트랩 ✅ (완료, 2026-05-09)

- [x] Bun 1.2.15 + Next.js 16.2.6 + React 19.2 + Tailwind 4.3 + TypeScript 5.9 부트스트랩 (`--use-bun --no-src-dir --yes`)
- [x] shadcn/ui 초기화 + 13개 컴포넌트 (button/input/label/table/select/textarea/checkbox/sonner/card/dropdown-menu/tabs/dialog/form)
- [x] 라이브러리: zod 4.4 / react-hook-form 7.75 / @hookform/resolvers 5.2 / @monaco-editor/react 4.7 / @playwright/test 1.59
- [x] form.tsx 직접 작성 (shadcn add form silent fail 우회 — §6 노트 참조)
- [x] @radix-ui/react-slot, react-label 수동 설치
- [x] `bunx tsc --noEmit` clean (exit 0)

**산출물**: [`mockup/`](../../mockup/) — package.json + bun.lock + components.json + 13 ui 컴포넌트.

---

### Day 1 — 레이아웃 / 사이드바 / Mock JWT 가드 ✅ (완료, 2026-05-09)

**목표**: 로그인 후 사이드바에서 메뉴 클릭 시 빈 페이지가 정상 라우팅되어 노출.

- [x] `app/layout.tsx` 수정 — `lang="ko"`, Geist 폰트, `<Toaster />`(sonner) 마운트
- [x] `app/(auth)/layout.tsx` 신설 — 비로그인 화면 중앙 정렬 컨테이너
- [x] `app/(admin)/layout.tsx` 신설 — 사이드바 + 헤더 + 메인 레이아웃
- [x] `components/Sidebar.tsx` 신설 — 9개 admin 메뉴 (활성 라우트 하이라이트)
- [x] `components/AppHeader.tsx` 신설 — 좌측 로고, 우측 본인정보 + 로그아웃
- [x] `components/LogoutButton.tsx` 신설 (보너스) — POST `/api/mock/auth/logout` 호출
- [x] `components/ComingSoon.tsx` 신설 (보너스) — Day 1 placeholder 컴포넌트
- [x] `proxy.ts` 신설 — protected prefix 7개에서 mock-jwt 쿠키 검증 (Next.js 16 의 새 파일명. 이전 `middleware.ts` 는 §6.4 참조)
- [x] `lib/mockData.ts` 신설 — 시드(users 3 / apis 5 / dataSources 1 / extSystems 1)
- [x] `lib/mockAuth.ts` 신설 — `setMockJwt(userId)` / `clearMockJwt()` / `getCurrentUser()` (httpOnly 쿠키)
- [x] `types/api.ts` 신설 — Zod schemas 7종 (User / DataSource / ApiDef / ApiParam / ApiResp / ExtSystem / CallHistory + Approval)
- [x] `app/page.tsx` 수정 — 인증되어있으면 `/api-list`, 아니면 `/login` 으로 redirect
- [x] 12개 placeholder page 신설 — admin 9개 + auth 3개(login 은 Day 1 임시 동작) + docs 1개
- [x] `app/api/mock/auth/login/route.ts` (보너스) — Day 1 임시 ID 기반 로그인
- [x] `app/api/mock/auth/logout/route.ts` (보너스) — 쿠키 폐기
- [x] `bunx tsc --noEmit` clean (exit 0)
- [x] `bun run build` clean (16 라우트 모두 컴파일, deprecation 0)
- [x] **`e2e/day1-smoke.spec.ts` 8 시나리오 PASS** (Playwright chromium, 5.6초)
- [x] `playwright.config.ts` 추가 (baseURL=localhost:3000, chromium 단일 프로젝트)

**완료 정의**: 빈 페이지여도 모든 라우트 404 없이 노출되고, 미인증 시 `/login` 으로 튕긴다. Day 1 임시 로그인 페이지에서 `admin01` 또는 `user01` 클릭 → `/api-list` 진입 → 사이드바 메뉴 클릭으로 placeholder 화면들 순회 → 헤더 로그아웃 → `/login` 복귀 가능. 본 흐름은 `bun run e2e:day1` (또는 `bunx playwright test e2e/day1-smoke.spec.ts`) 으로 자동 회귀 검증된다.

---

### Day 2 — 인증 화면 (로그인 / 회원가입 / 비밀번호 찾기 / 본인 정보) ✅ (완료, 2026-05-09)

- [x] `app/(auth)/login/page.tsx` — react-hook-form + zod, ID/PW 검증, 에러 메시지 매핑
- [x] `app/(auth)/signup/page.tsx` — 9개 필드 + 동의 체크박스 + ID 중복확인
- [x] `app/(auth)/forgot-password/page.tsx` — 이메일 검증 + mock 토스트 (이메일 존재 노출 X)
- [x] `app/(admin)/me/page.tsx` — server component → MeTabs (3탭: 기본정보 / 비밀번호 변경 / 세션)
- [x] `app/(admin)/me/me-tabs.tsx` — ProfileForm / PasswordForm / SessionPanel
- [x] `lib/schemas/auth.ts` — login/signup/forgotPassword/updateProfile/changePassword 의 zod 스키마
- [x] `app/api/mock/auth/login/route.ts` — PW 검증 추가 (Day 1 의 ID-only 임시 로그인 교체)
- [x] `app/api/mock/auth/forgot-password/route.ts` — 항상 200, 존재 여부 비노출
- [x] `app/api/mock/users/check-id/route.ts` — `?id=xxx` 중복 확인
- [x] `app/api/mock/users/signup/route.ts` — PENDING 으로 mockData 에 추가
- [x] `app/api/mock/users/me/route.ts` — GET/PUT (본인 정보 조회·수정)
- [x] `app/api/mock/users/me/password/route.ts` — PUT (비밀번호 변경, 현재 PW 검증)
- [x] `app/api/mock/_reset/route.ts` (보너스) — e2e/데모 시드 복원
- [x] `mockData` 시드 비밀번호 추가 (`admin01!` / `user01!` / `user02!`)
- [x] `mockData` globalThis singleton 패턴 — Bun+Turbopack HMR 후에도 mutation 유지
- [x] Day 1 임시 로그인 페이지 → 정식 폼으로 교체
- [x] `bunx tsc --noEmit` clean
- [x] **`e2e/day2-auth.spec.ts` 7 시나리오 PASS** + Day 1 8 시나리오 회귀 확인 (총 15/15)
- [x] `playwright.config.ts` retries=1 (Bun+Turbopack 일시적 module reload race 회피)

**완료 정의**: 정식 ID/PW 폼으로 admin01·user01 로그인, 잘못된 PW 토스트, 회원가입 후 PENDING 상태로 추가 → 활성화 전 로그인 차단, 본인 정보 조회·수정·비밀번호 변경 후 신규 PW 로 재로그인. `bun run e2e:day2` 또는 `bunx playwright test` 로 자동 회귀.

---

### Day 3 — API 목록 + 등록 (Monaco) ✅ (완료, 2026-05-09)

- [x] `app/(admin)/api-list/page.tsx` — DataTable (검색·정렬·페이징, 클라이언트 in-memory)
- [x] `app/(admin)/api-list/new/page.tsx` — 4탭 (기본정보 / SQL / 입력 파라미터 / 응답 컬럼)
- [x] `app/(admin)/api-list/[id]/page.tsx` — 수정 (ApiForm 의 mode=edit 재사용)
- [x] `components/SqlEditor.tsx` — `@monaco-editor/react` wrapper, sql 언어 모드 + onMount 에서 editor 인스턴스 노출(e2e)
- [x] `components/ApiForm.tsx` — 4탭 폼의 컨트롤러 (react-hook-form + useFieldArray)
- [x] `components/ApiListTable.tsx` (보너스) — 클라이언트 측 검색·정렬·페이징(10건/page)
- [x] `lib/schemas/api.ts` — apiCreateSchema / apiUpdateSchema (path 정규식 + 응답 컬럼 1개 이상)
- [x] `app/api/mock/apis/route.ts` — GET (목록·검색) / POST (등록 + path 중복 검사 + 자동 일련번호)
- [x] `app/api/mock/apis/[id]/route.ts` — GET / PUT / DELETE
- [x] `app/api/mock/apis/check-path/route.ts` — `?path=xxx&excludeNo=yyy` 중복 확인
- [x] `app/api/mock/apis/validate-sql/route.ts` — Mock plan 문자열 + bind 변수 추출
- [x] `bunx tsc --noEmit` clean
- [x] `bun run build` clean (3 신규 + 4 mock route 추가, 경고 0)
- [x] **`e2e/day3-api.spec.ts` 6 시나리오 PASS** + Day 1/2 회귀 동일 PASS (전체 21/21, 17.3초)

**완료 정의**: 시드 5개가 목록에 노출, 검색·정렬·페이징 동작. 신규 API 등록(4탭) 후 목록 즉시 반영, 수정·삭제 가능. path 중복 / SQL 검증 mock 동작. `bun run e2e:day3` 또는 `bun run test:e2e` 로 자동 회귀.

---

### Milestone W — Wanted 디자인 시스템 통합 ✅ (완료, 2026-05-09 ~ 2026-05-10)

> Day 3 완료 후, Anthropic Design tool 의 Dau.DX.API Prototype.html 을 기준으로 18개 화면을 모듈식으로 재구성. Day 4·5 에 들어갈 화면(데이터소스·모니터링·hot-swap)도 UI 가 먼저 완성되어 있다. 기능(API 연동·승인·감사 로그) 은 Day 4·5 에서 채운다.

- [x] `app/wanted-tokens.css` — `--w-*` 96종 (color / shadow / radius / font stack). Pretendard Variable @font-face
- [x] `app/wanted-components.css` — `.w-*` 컴포넌트 클래스 (셸/카드/버튼/인풋/스테퍼/메트릭/트레이스/체크리스트/노티스/스플릿/탭 + Auth 셸·폼 배너 추가)
- [x] `app/globals.css` 최상단으로 Wanted Sans `@import url(...)` 이동 (PostCSS @import 규칙 위반 회피)
- [x] `components/design/AppShell.tsx` — 232px 사이드바(2-그룹 9메뉴) + 56px 토픈바, ≤768px 햄버거 드로어 + backdrop, `<header>` 시맨틱 유지
- [x] `components/design/Icons.tsx` — 31 lucide-style SVG (`<I name="...">` 스위치). `strokeWidth` 타입 충돌 해소
- [x] `components/design/{Stepper,CodeBlock,LineChart,primitives}.tsx` — 가설별 공통 블록
- [x] **가설 1 (셀프서비스 발급) — 6 화면**: `/api-list` KPI+테이블 / `/api-list/new` 5단 Stepper / `/api-list/[id]` 수정 / `/api-list/[id]/done` 신규 발급 완료 카드
- [x] **가설 2 (실시간 모니터링) — 6 화면**: `/monitoring` 대시보드 / `/incidents/[id]` / `/logs` / `/logs/[traceId]` 트레이스 / `/logs/[traceId]/root-cause` v1↔v2 SQL diff / `/rules` 알림 규칙
- [x] **가설 3 (Hot-swap) — 6 화면**: `/datasource` KPI+테이블 / `/datasource/[id]/swap` (test/impact/run/done 4단)
- [x] `/dashboard` 신규 — 4 KPI + 3 가설 배너 (각 가설로 진입)
- [x] `lib/monitoringSeed.ts` / `lib/datasourceMeta.ts` — 가설 2·3 시드(메트릭·incident·시리즈·풀 메타)
- [x] `lib/mockData.ts` 확장 — dataSources 1 → 5 (DAU-CORE-PROD/LMS-PROD/LIB-PROD/HR-PROD/CORE-STG)
- [x] `proxy.ts` PROTECTED_PREFIXES + matcher 에 `/dashboard` 추가
- [x] **로그인·회원가입·비밀번호 찾기** Wanted 적용 (2026-05-10): `(auth)/layout.tsx` 스플릿 셸(좌 그라디언트 브랜드 패널 + 우 폼 카드), shadcn Form 제거 → `.w-input`/`.w-btn--primary` 직조, `FormBanner` 토큰 교체
- [x] `bunx tsc --noEmit` clean
- [x] **Day 1/2/3 e2e 24/24 PASS** — 라벨/버튼/`data-testid` 보존 확인. `ADMIN_MENUS` 라벨(`API 관리`/`설정`/`사용자`) 만 e2e 측에서 갱신
- [x] `mockup/CHANGELOG.md` 두 항목 기록

**완료 정의**: 모든 admin 화면이 Wanted 셸 안에 동작. 모바일에서 햄버거로 사이드바 토글. 18 화면이 mock data 위에서 렌더링. **단, Day 4·5 의 기능적 완성도는 미완** — 데이터소스 CRUD/연결 테스트, 연계시스템 인증키 발급, 모니터링 실시간 호출 이력, 승인 흐름, 사용자 관리, 5개 샘플 GW 는 Day 4·5 에서 구현.

---

### Day 4 — 데이터소스 / 연계시스템 ✅ (완료, 2026-05-10)

> Milestone W 에서 KPI+테이블·hot-swap 4단 화면이 Wanted 디자인으로 먼저 렌더링되었고, Day 4 에서 CRUD·인증키 발급·연결 테스트를 채워 기능을 완성. 모달은 `components/design/Modal.tsx` (ESC 닫기 + body lock + ≤640px fullscreen) 공통 사용.

- [x] `app/(admin)/datasource/page.tsx` — 목록 + 검색 + 모달 등록/수정 + 행별 [수정][삭제] 버튼 + IN_USE 차단 + 빈 상태(`.w-empty`)
- [x] `components/DataSourceForm.tsx` — 모달 안의 폼 (이름·종류·JDBC URL·DB 사용자·풀 min/max·타임아웃·useYn) + `[연결 테스트]` 인라인 결과 배너
- [x] `app/api/mock/datasources/route.ts` (GET/POST) + `[id]/route.ts` (GET/PUT/DELETE — 매핑 API 있으면 IN_USE 응답)
- [x] `app/api/mock/datasources/test-connection/route.ts` — JDBC URL 에 `BREAK` 시 항상 실패 / `stg|dev|qa|lab` 호스트 75% 실패 / 그 외 90% 성공 + 80~220ms 지연
- [x] `app/(admin)/ext-system/page.tsx` — placeholder → 정식. 4 KPI(총수/매핑/만료임박/인증키 정책) + 검색 + 모달 + [키 재발급][수정][삭제]
- [x] `components/ExtSystemForm.tsx` — IP/CIDR textarea(줄당 1개), 이용 기간 date 2종(자동 시작 00:00:00 / 종료 23:59:59), 매핑 API 체크박스 그리드, 담당자(이름/이메일), 비고, ACTIVE 토글
- [x] `components/CertKeyDialog.tsx` — 1회 노출 다이얼로그 (`.w-form-banner--info` 경고 + readonly 입력 + `.w-btn--soft` 복사). 닫으면 목록은 마스킹된 키 (`AKAD####-••••...####` ) 만 노출
- [x] `app/api/mock/ext-systems/route.ts` + `[id]/route.ts` + `[id]/regenerate-key/route.ts` (freshCertKey 1회 응답)
- [x] `lib/schemas/datasource.ts` / `lib/schemas/extSystem.ts` / `lib/certKey.ts`
- [x] 공통 자산: `components/design/Modal.tsx` + `.w-modal*` / `.w-empty` 클래스 + `Icons.tsx` 의 `Trash`/`Pencil`/`Key` 3종 추가
- [x] **`e2e/day4-ds-ext.spec.ts` 8 시나리오 PASS** + Day 1·2·3 24 시나리오 회귀 (총 32/32, 27.8초)
- [x] `bunx tsc --noEmit` clean

**완료 정의**: 데이터소스 5건 + 연계시스템 1건 시드 위에서 CRUD + 연결 테스트 + 인증키 발급/재발급 모두 동작. 모달은 모바일(≤640px) 에서 fullscreen 폴백. `bun run test:e2e` 32/32 자동 회귀.

---

### Day 5 — 모니터링 + 문서 + 승인 + 사용자 + 샘플 GW ✅ (완료, 2026-05-10)

> Milestone W 에서 `/monitoring` 6 화면이 시드 기반 Wanted UI 로 렌더링되었고, Day 5 에서 **샘플 GW 5개 + 인메모리 큐 + 4단 검증** 으로 외부 호출이 즉시 모니터링에 반영되도록 연결. 승인/사용자/문서 페이지도 placeholder → 정식.

- [x] 차트 라이브러리 결정 ✅ — `components/design/LineChart.tsx` 자체 SVG (§6.1)
- [x] `monitoring/page.tsx` 외 5 화면 — Wanted UI 완료, Milestone W
- [x] **모니터링 라이브 큐**: `lib/mockHistory.ts` (globalThis 싱글턴, 최대 500건) + `LiveLogTable.tsx` (5초 폴링) + `LiveStatsCard.tsx` (KPI 4종 + 2x 시리즈)
- [x] `app/api/mock/monitoring/history/route.ts` — q/statusCode/apiNo/extSysId/from/to/limit 필터
- [x] `app/api/mock/monitoring/stats/route.ts` — windowMin(5~180) + 분당 시리즈
- [x] `monitoringSeed.getCallByTrace` 가 라이브 큐로 폴백해 trace 상세가 동적 traceId 도 표시
- [x] `app/docs/page.tsx` — 좌측 그룹 트리 + 우측 상세(method/파라미터/응답/curl 코드블록). 비로그인 가능
- [x] `app/(admin)/approvals/api/page.tsx` — 3탭(대기/승인/반려) + KPI + 행별 [승인][반려]. window.prompt 로 반려 사유
- [x] `app/(admin)/approvals/user/page.tsx` — 동일 패턴
- [x] `app/api/mock/approvals/api/route.ts` + `[seq]/approve/route.ts` + `[seq]/reject/route.ts` (admin 권한 검증, 승인 시 ext.mappedApis 에 targetId 자동 추가)
- [x] `app/api/mock/approvals/user/...` — 동일 패턴 (승인 시 user.status PENDING → ACTIVE)
- [x] `app/(admin)/users/page.tsx` — 검색·상태 필터 + 4 KPI + 행별 [활성화][비활성화][반려]. 본인 행은 액션 비활성
- [x] `app/api/mock/users/route.ts` (GET admin 전용, password 마스킹) + `[id]/route.ts` (GET/PATCH, `CANNOT_UPDATE_SELF` 보호)
- [x] **5개 샘플 게이트웨이** (`app/api/sample/<path>/route.ts`):
    - [x] `sample-user-info` (GET) — mockData.users 시드 응답
    - [x] `sample-grade-list` (GET) — 고정 4건
    - [x] `sample-grade-save` (POST) — saved=1
    - [x] `sample-dept-tree` (GET) — 고정 7건
    - [x] `sample-notification-send` (POST) — A20260509005 가 DRAFT 라 항상 `API_NOT_ACTIVE`
- [x] `lib/mockGateway.ts` — 4단 검증(인증키→IP CIDR→이용기간→매핑 API) + `runSampleGateway` 공통 + 응답 후 `enqueueCall`. localhost(::1/127.0.0.1) 는 IP 검증 자동 통과
- [x] `lib/mockHistory.ts` — `enqueueCall` / `listCalls` / `findByTrace` / `statsSnapshot` / `resetCallStore`
- [x] `app/api/mock/reset/route.ts` 가 `resetCallStore` 도 호출 — 시드 복원 시 라이브 큐 비움
- [x] **`e2e/day5-monitor-approve-users.spec.ts` 6 시나리오 PASS** + Day 1·2·3·4 32 시나리오 회귀 (총 38/38, 33.8초). Day 1 e2e 의 `/docs` heading 검증 2건은 새 뷰어 기준으로 갱신
- [x] `bunx tsc --noEmit` clean

**완료 정의**: `curl /api/sample/sample-user-info?id=user01` 호출 → 5초 안에 `/monitoring/logs` 라이브 표와 `/monitoring` 대시보드 LiveStatsCard 에 반영. 승인 흐름은 ext.mappedApis 또는 user.status 를 즉시 갱신. 문서 뷰어가 5개 시드 API 모두에 대해 파라미터/응답/curl 예시를 표시.

---

### Day 6 — Playwright e2e 5종 ☐

- [ ] `bunx playwright install` — 브라우저 바이너리
- [ ] `playwright.config.ts` — base URL, projects (chromium 만으로 충분)
- [ ] `e2e/01-api-register.spec.ts` — 관리자 로그인 → API 등록 → 목록 표시
- [ ] `e2e/02-datasource.spec.ts` — 데이터소스 등록 → 연결 테스트
- [ ] `e2e/03-ext-system.spec.ts` — 연계시스템 등록 + API 매핑 + 인증키 재발급
- [ ] `e2e/04-external-call.spec.ts` — Playwright `request` 로 `/api/sample-user-info` 호출 → 200 → 모니터링 즉시 반영
- [ ] `e2e/05-approval.spec.ts` — 사용자 신청 → 관리자 승인 → 매핑 자동 추가
- [ ] `bun run test:e2e` 5/5 PASS
- [ ] `package.json` scripts 추가: `"test:e2e": "playwright test"`

**완료 정의**: 5개 시나리오 모두 단독 실행으로 PASS.

---

### Day 7 — 사용자 1차 데모 + 피드백 반영 ☐

- [ ] 시드 데이터 정돈 (`lib/mockData.ts` 의 데모용 케이스)
- [ ] 데모 시나리오 문서 1쪽 (`mockup/DEMO.md`)
- [ ] PO + 외부 시스템 담당자 1차 데모 (예약)
- [ ] 피드백 → `mockup/CHANGELOG.md` 에 항목별 기록
- [ ] [`01_mockup계획.md §8 종료 조건`](01_mockup계획.md#8-mockup-단계-종료-조건) 체크리스트 점검
- [ ] (변경이 많으면) 다음 주차 일정 산정

**완료 정의**: 데모 + 피드백 반영 1회 완료. 4주 초과 시 PO 가 "현재 안" 채택 결정.

---

## 4. 진행 상태 트래커 (Progress Tracker)

> **모든 작업 단위 종료 시 본 절을 갱신한다**. git commit 직전이 최적 시점.

| 항목 | 값 |
|---|---|
| **현재 Day** | Day 5 ✅ 완료 → Day 6 ☐ (Playwright e2e 5종 시나리오 + CI gate) |
| **마지막 갱신** | 2026-05-10 (Day 5 완료 시점) |
| **마지막 git commit** | b5c549b (Refactor authentication pages to align with Wanted design specifications) — Day 4·5 변경은 미커밋 |
| **다음 시작점** | Day 6 — `e2e/01-api-register.spec.ts` 등 5종 통합 시나리오 + `package.json` `"test:e2e"` 스크립트 (현재는 day1~5 단위 파일만 존재) |
| **막힘 / 결정 대기** | 없음 |
| **알려진 환경 차이** | Windows 11 (사용자 환경). macOS/Linux 전환 시 Playwright 브라우저 재설치 필요 |

### 4.1 다음 작업의 명령 (복붙 가능)

새 세션 진입 직후 이 블록만 그대로 따라하면 다음 작업이 시작된다.

```powershell
# 1. 환경 확인
cd c:\Dev\Workspace\Web\Dau.DX.API
git pull
cd mockup
bun install                        # 락파일 변경 없으면 즉시 종료
bunx tsc --noEmit                  # exit 0 인지 확인
bun run dev                        # http://localhost:3000 — 부트스트랩 정상 확인 (Ctrl+C 로 종료)
```

```
# 2. Day 1 첫 작업 시작
파일 열기: mockup/app/layout.tsx
체크리스트: 본 문서 §3 Day 1 첫 항목부터
```

---

## 5. 새 세션 / 새 PC 진입 절차

> 다른 PC 에서 처음 받았거나, 며칠 만에 다시 들어가 무엇부터 할지 모를 때.

### 5.1 클론·설치 (한 번만)

```powershell
git clone <repo-url> Dau.DX.API
cd Dau.DX.API
# 사전 요구: Bun ≥ 1.2, Node ≥ 20 설치되어 있어야 함
cd mockup
bun install                        # bun.lock 기준 의존성 설치
bunx playwright install chromium  # Day 6 진입 전 한 번
```

### 5.2 매번 작업 진입

```powershell
cd c:\Dev\Workspace\Web\Dau.DX.API
git pull
cd mockup
bun install                        # 변경 없으면 빠름
bun run dev                        # 동작 확인 후 Ctrl+C
```

### 5.3 무엇부터 할지 찾기

1. 본 문서 §2 Prerequisites 의 6개 문서 30~40분 훑기 (처음 합류 시).
2. 본 문서 §4 트래커의 `다음 시작점` 줄을 본다.
3. `mockup/CHANGELOG.md` 마지막 항목 2개를 본다 — 직전에 무엇이 바뀌었나.
4. 해당 Day 의 §3 체크리스트로 점프, 첫 ☐ 항목부터 시작.
5. 작업 중 막히면 §6 컨텍스트 노트의 동일 주제 항목 검색.

### 5.4 작업 단위 종료 시 (반드시)

```
1. 변경 사항 git commit (작은 단위)
2. 본 문서 §4 트래커 갱신 (다음 시작점 + 마지막 commit hash)
3. mockup/CHANGELOG.md 에 한 줄 추가
4. (선택) §6 컨텍스트 노트에 결정/시도/막힘 한 줄 추가
```

---

## 6. 컨텍스트 노트 (Decisions · Discoveries · Pitfalls)

> 결정한 이유, 시도하다 막힌 것, 다음에 동일 함정에 빠지지 않을 단서. **세션이 끊겨도 같은 결정을 재현할 수 있게**.

### 6.1 결정 사항

| 일자 | 결정 | 사유 |
|---|---|---|
| 2026-05-09 | `--no-src-dir` 채택 | [`02_화면명세`](02_화면명세.md) 의 폴더 구조와 일치 (`app/(admin)/...` 직접 위치) |
| 2026-05-09 | shadcn 의 default style + slate base color | 기본값으로 시작, 디자인 토큰은 Mockup 진행하며 확정 |
| 2026-05-09 | 락파일 = `bun.lock` 만 유지 | npm/CI 정책은 [`open-questions.md` D7](open-questions.md) 결정 시까지 보류. `package-lock.json` 은 미생성 |
| 2026-05-09 | Mock JWT = httpOnly 쿠키 | 실제 JWT 서버 만들지 않고 단순 쿠키 1개로 인증 흉내. C5 결정 시 교체 |
| 2026-05-09 | Mock 4단 검증 = 임시 구현 | 알고리즘 자체는 [`open-questions.md` C1·C2`](open-questions.md) 미결, 현재는 `extSystem.certKey === header` 단순 비교 |
| 2026-05-09 | 시드 비밀번호 = 평문 ID + `!` (예: `admin01!`) | Mockup 단계라 bcrypt 불필요. C3 결정 시 `lib/mockData.ts` 의 password 필드만 교체 |
| 2026-05-09 | `mockData` globalThis singleton 패턴 | Bun + Turbopack HMR 이 모듈 재컴파일 시 mutation 휘발 → globalThis 에 보관해 영속화 |
| 2026-05-09 | `/api/mock/_reset` 라우트 도입 | e2e 의 beforeEach 와 데모 정리에 시드 복원이 필수. Mockup 한정 도구라 인증 없이 호출 가능 |
| 2026-05-09 | Playwright `retries: 1` | Bun + Turbopack dev 환경의 일시적 module reload race 1회 retry. CI 에서는 0 권장 |
| 2026-05-09 | API 목록 검색·정렬·페이징은 클라이언트 in-memory | mockData 가 in-memory 라 서버 쿼리 의미 없음. Phase 2 백엔드 도입 시 서버 페이징으로 교체 |
| 2026-05-09 | Native `<select>` 채택 (shadcn `@base-ui/react` Select 회피) | 폼 통합 단순화. base-ui Select 의 onValueChange + Portal 위치 이슈를 피하고, native 가 e2e selector 로도 안정적 |
| 2026-05-09 | `mockData/_reset` → `reset` rename | Next.js 16 의 private folder 규칙(`_` prefix 라우팅 제외) 으로 `_reset` 가 404. Mockup 한정 도구라 보호 필요성 낮음 |
| 2026-05-09 | `apiDefSchema` 의 `.default([])` / `maskRule.default("none")` 제거 | zodResolver + zod v4 의 input/output 분리로 `useForm<T>` 의 TFieldValues 가 widen 됨. defaults 는 form 측에서 부여 |
| 2026-05-09 | API 일련번호 = `A` + `YYYYMMDD` + 3자리 시퀀스 | 시드와 포맷 일치. 백엔드 결정 후 변경 가능 |
| 2026-05-09 | DELETE 확인 = `window.confirm` | Mockup 단계는 단순 confirm. shadcn Dialog 로의 교체는 시각 디자인 정리 시점에 |
| 2026-05-09 | **Wanted Design System 채택** (Pretendard Variable + Wanted Sans) | Anthropic Design tool 의 Dau.DX.API Prototype.html 을 기준 디자인으로 확정. shadcn 은 그대로 두되 신규/재구성 화면은 `.w-*` 클래스 사용 (병행) |
| 2026-05-09 | 디자인 토큰을 `--w-*` CSS 변수 + 공통 클래스 분리 | Tailwind 4 의 `@theme inline` 와 충돌 회피. 토큰(`wanted-tokens.css`) 과 컴포넌트 클래스(`wanted-components.css`) 를 globals.css 가 import |
| 2026-05-09 | 차트는 자체 SVG (`components/design/LineChart.tsx`) | recharts/Tremor 미도입. 시드 데이터 단순 라인이라 의존성 추가 불필요. Phase 2 본격 모니터링 시 재검토 |
| 2026-05-09 | `<header>` 시맨틱 유지 + 햄버거 드로어 | 모바일(≤768px) 에서 사이드바를 `transform: translateX(-100%)` 로 숨기고 `useState` 토글로 열기. `useEffect([pathname])` 로 라우트 변경 시 자동 닫힘 |
| 2026-05-10 | 인증 화면을 스플릿 셸로 재구성 | 좌측 그라디언트 브랜드 패널(가치 chip 3종) + 우측 폼 카드. ≤960px 단일 컬럼 폴백. `(auth)/layout.tsx` 만 교체하면 login/signup/forgot-password 가 동일 셸 사용 |
| 2026-05-10 | `FormBanner` 토큰 교체 (testid/role 보존) | shadcn Tailwind 클래스 → `.w-form-banner--{variant}`. e2e 가 `data-testid="form-banner-{variant}"` 와 `role="alert"`/`status` 만 의존하므로 외형만 변경해도 안전 |
| 2026-05-10 | 자체 `Modal` 컴포넌트 (shadcn Dialog 미사용) | ESC 닫기 / body scroll lock / ≤640px fullscreen 폴백을 한 컴포넌트로 통합. shadcn Dialog 의 Radix Portal + 포커스 트랩 의존 회피 |
| 2026-05-10 | 인증키 1회 노출 + 마스킹 정책 | 발급·재발급 시 `freshCertKey` 응답으로 다이얼로그 표시 → 닫으면 목록에는 `AKAD####-••••...####` 만 노출. 백엔드 도입 시 동일 정책 유지 가능 |
| 2026-05-10 | 데이터소스 삭제 IN_USE 차단 | 매핑 API 가 있는 DS 삭제 시 `409 IN_USE` + `detail` 에 첫 매핑 API 명을 담아 응답. 사용자에게 어떤 API 가 막고 있는지 즉시 안내 |
| 2026-05-10 | 연결 테스트 결정성 — `BREAK` / 호스트 prefix | 시연 일관성 위해 jdbcUrl 에 `BREAK` 포함 시 100% 실패, `stg/dev/qa/lab` 호스트는 75% 실패. 그 외 90% 성공. e2e 는 `BREAK` 로 결정적 실패 검증 |
| 2026-05-10 | 폼은 RHF 없이 useState + safeParse | 데이터소스/연계시스템 폼은 ApiForm(RHF) 처럼 useFieldArray 가 필요 없어 `useState<Input>` + 제출 시 `schema.safeParse()` 로 단순화. 코드량 1/3 |
| 2026-05-10 | 인증키 형식 = `AKAD####-XXXXXXXX-...` | id 의 마지막 4자리(예: E20260509001 → 9001)를 prefix 로 두어 추적성 + 가독성. 백엔드 결정 시 단순 교체 |

### 6.2 시도하다 막힌 것 (Pitfalls)

| 증상 | 원인 | 해결 |
|---|---|---|
| `bunx shadcn@latest add form --yes` 가 출력만 짧게 나오고 파일 미생성 | shadcn 의 form 추가가 silent fail (Tailwind 4 + shadcn 최신 조합의 회귀 추정) | `components/ui/form.tsx` 를 표준 shadcn 코드로 직접 작성 (현재 본 폴더에 동봉된 코드와 동일) |
| `tsc --noEmit` 에러: `Cannot find module '@radix-ui/react-label'` | shadcn add label 시 의존성 자동 설치 누락 | `bun add @radix-ui/react-label` 수동 설치 |
| `bunx create-next-app` 의 prompt 가 작업을 멈춤 | non-interactive 옵션 누락 | `--ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-bun --yes` 모두 명시 |
| **proxy.ts 의 가드가 `/api-list` 에서 통과되어 미인증 진입 가능** ⚠ Day 1 e2e 로 발견 | `matcher: ["/((?!api\|...).*)"]` 의 negative lookahead 가 `api-list` 의 첫 3자 `api` 와 매칭되어 라우트 자체가 matcher 에서 제외됨 | matcher 를 negative-lookahead 가 아닌 **화이트리스트** 로 변경 (`/api-list/:path*` 등 protected prefix 만 명시). PROTECTED_PREFIXES 와 1:1 일치 |
| Sidebar 의 비활성 메뉴가 `bg-accent/50` (hover variant) 때문에 `/bg-accent/` 정규식에 매칭됨 | className 매칭은 utility class 가 늘어나면 fragile | `data-active={active}` attribute 를 link 에 추가, 테스트는 `toHaveAttribute("data-active", "true")` 로 검증 |
| Playwright 메뉴 순회에서 "API 승인" 검색이 timeout | `/docs` 클릭 후 admin layout 밖으로 나가 사이드바가 사라짐 → 다음 메뉴 link 못 찾음 | 순회 메뉴는 admin layout 안 8개로 한정, `/docs` 는 끝에 별도 클릭으로 검증 |
| **shadcn 의 `@base-ui/react` 기반 Button 이 `asChild` prop 미지원** ⚠ Day 2 build 로 발견 | shadcn 의 새 버전(@base-ui/react) Button 은 `asChild` 를 export 하지 않음. `<Button asChild><Link/></Button>` 패턴 사용 시 TS 에러 | `import { buttonVariants }` → `<Link className={buttonVariants({ variant: "ghost" })}>` 패턴으로 교체 |
| **Bun + Turbopack HMR 이 mockData 모듈 재컴파일 시 mutation 휘발** ⚠ Day 2 e2e 로 발견 | route handler 가 import 한 mockData 와 다른 route handler 의 mockData 가 다른 인스턴스가 되어 회원가입·비밀번호 변경 등이 사라짐 | `mockData` 를 globalThis singleton 으로 보관 (`globalThis.__dauDxApiMockData__`). HMR 후에도 동일 ref 유지 |
| Playwright `getByLabel("개인정보 동의")` 가 strict mode violation | shadcn Checkbox 가 hidden input + visible role=checkbox span 두 element 로 렌더되어 같은 label 에 둘 다 매칭 | `getByRole("checkbox", { name: "..." })` 로 role 한정 |
| Playwright `getByRole("button", { name: "로그아웃" })` 가 ambiguous | 헤더와 세션 탭에 동시에 "로그아웃" 버튼이 있음 | 컨테이너 한정: `page.locator("header").getByRole(...)` 또는 `page.getByRole("tabpanel").getByRole(...)` |
| Day 1 e2e 가 Day 2 변경 후 깨짐 | Day 1 의 임시 로그인 버튼이 Day 2 정식 폼으로 교체되어 selector 미존재 | `loginAs(page, id, pw)` helper 로 통일. 향후 Day N 변경 시 Day N-1 e2e 도 동일 helper 만 갱신 |
| **`/api/mock/_reset` 가 404** ⚠ Day 3 e2e 로 발견 | Next.js 16 의 private folder 규칙 — `_` prefix 폴더는 라우팅에서 자동 제외 | `app/api/mock/_reset/` → `app/api/mock/reset/` rename. Day 1·2·3 e2e 의 `request.post` 경로 갱신 |
| **zodResolver + zod `.default()` 가 `useForm<T>` 의 TFieldValues 를 `FieldValues` 로 widen** ⚠ Day 3 ApiForm 작성 중 발견 | zod v4 의 `.default()` 가 input/output 타입을 분리시켜 resolver 의 generic 추론이 깨짐 | 폼 입력 스키마(`apiCreateSchema`/`apiDefSchema`) 의 `.default()` 제거하고 `useForm` 의 `defaultValues` 에서 빈 배열·기본값 부여 |
| Monaco 의 textarea 셀렉터(`.monaco-editor textarea` / `.inputarea`) 가 버전·렌더 타이밍에 따라 흔들림 | `.first()` 가 IME 보조용 `.ime-text-area` (aria-hidden, readonly) 에 매칭되어 키 입력이 무시됨 | SqlEditor 의 onMount 에서 editor 인스턴스를 `window.__sqlEditor` 로 노출, e2e 의 `fillSql` 은 `editor.setValue(...)` 로 직접 설정 |
| Playwright `getByRole("cell", { name: /^번호/ })` 가 헤더에 매칭 안 됨 | `<th>` 의 ARIA role 은 `cell` 이 아닌 `columnheader` | `getByRole("columnheader", { name: /^번호/ })` |
| **PostCSS `@import rules must precede all rules`** ⚠ Milestone W 도입 중 발견 | `wanted-tokens.css` 가 `@font-face` 다음에 외부 Wanted Sans `@import url(...)` 을 두어 CSS 사양 위반 | 외부 `@import url(...)` 한 줄을 `app/globals.css` 의 최상단(다른 `@import "tailwindcss"` 보다도 위) 으로 이동. 각 css 파일 안에서 `@font-face` 만 남김 |
| Icons.tsx TS2322: `stroke` 숫자가 SVGProps 의 `stroke: string` 과 충돌 | lucide-style 아이콘 props 가 SVGProps 를 extend 하면 stroke 타입이 덮어써짐 | `stroke` → `strokeWidth` 으로 props 이름 변경 + `extends SVGProps<SVGSVGElement>` 제거. `<svg strokeWidth={n}>` 만 사용 |
| Day 1 e2e 가 Milestone W 직후 깨짐 (사이드바 라벨) | `API` → `API 관리`, `본인 정보` → `설정`, `사용자 관리` → `사용자` 로 변경됨 | 사용자 합의로 "디자인 우선" — `e2e/day1-smoke.spec.ts` 의 `ADMIN_MENUS` 와 `day2-auth.spec.ts` 의 메뉴 클릭 라벨만 새 라벨로 교체 |
| Day 3 e2e 가 Milestone W 직후 깨짐 (컬럼 헤더) | `번호` → `API 번호` 로 변경 | `getByRole("columnheader", { name: /API 번호/ })` 로 정규식 갱신 |
| Day 4 e2e 의 `getByText("DAU-LMS-PROD")` strict 위반 | 같은 이름이 테이블 셀(td) + 풀 차트 카드 헤더(h3) 양쪽에 노출됨 | `getByRole("cell", { name: "...", exact: true })` 로 한정. 토스트 텍스트와의 충돌도 동일 방식 적용 |
| Day 4 e2e 신규 등록 후 `getByText("DAU-NEW-DS")` strict 위반 | 토스트 메시지 "DAU-NEW-DS 데이터소스를 등록했습니다" 와 셀 양쪽 매칭 | 위와 동일 — `getByRole("cell", { exact: true })` 또는 `[data-testid="ds-row"].filter({ hasText })` 사용 |

### 6.3 미결 / Day 진입 전 결정 필요

| 시점 | 항목 | 후보 / 결정 |
|---|---|---|
| ~~Day 5 시작 전~~ | ~~차트 라이브러리~~ | ✅ **결정됨 (Milestone W)** — `components/design/LineChart.tsx` 자체 SVG. recharts 미도입 |
| ~~데모 후~~ | ~~디자인 토큰 정식화~~ | ✅ **결정됨 (Milestone W)** — Wanted Design System 채택. `wanted-tokens.css` + `wanted-components.css` 가 정식 토큰 |
| Day 6 시작 전 | Playwright 브라우저 범위 | chromium 만 (Mockup 단계는 멀티 브라우저 의미 없음) |
| ~~Day 4 진행 중~~ | ~~DataSource/ExtSystem 의 다이얼로그 형태~~ | ✅ **결정됨** — `components/design/Modal.tsx` 자체 모달(ESC 닫기 + body scroll lock + ≤640px fullscreen 자동). shadcn Dialog 미사용 |

### 6.4 발견 사항 (Discoveries)

- Next.js 16 + Bun 부트스트랩이 자동 생성하는 파일 4종: `README.md`, `AGENTS.md`, `CLAUDE.md`, `eslint.config.mjs`. `AGENTS.md` 와 `CLAUDE.md` 는 Next.js 의 LLM 가이드 — 우리 루트의 `CLAUDE.md` 와 별개라 **삭제하지 말 것**.
- shadcn `add` 가 자동 설치하는 Radix 의존성이 누락되는 케이스가 종종 있음. 새 컴포넌트 추가 후 항상 `tsc --noEmit` 으로 검증.
- Bun 의 `bunx` 는 npm 의 `npx` 와 동일 동작. 일관되게 `bunx` 사용.
- **Next.js 16 의 파일 컨벤션 변경**: `middleware.ts` 가 deprecated 되고 `proxy.ts` 로 변경됨. 함수 시그니처는 동일(`export function proxy(req: NextRequest)`). build 시 deprecation 경고로 발견. 본 프로젝트는 Day 1 에서 바로 `proxy.ts` 채택. 참고: <https://nextjs.org/docs/messages/middleware-to-proxy>.
- **`cookies()` 가 async**: Next.js 15+ 에서 `cookies()` 가 Promise 반환. `await cookies()` 후 `.get()`/`.set()`/`.delete()` 사용. 본 프로젝트의 `lib/mockAuth.ts` 가 모두 async 인 이유.
- **placeholder 검증 트릭**: 모든 라우트의 `page.tsx` 에 `<ComingSoon name="..." />` 만 두면 빈 페이지여도 라우팅·layout 검증이 가능. Day 진행 따라 한 파일씩 정식 구현으로 교체.
- **CSS `@import` 순서 규칙**: PostCSS 는 모든 `@import` 가 다른 규칙(예: `@font-face`) 보다 앞서 있어야 한다. globals.css 가 진입점이므로 외부 폰트 `@import url(...)` 은 globals.css 최상단에 두고, 우리 css 파일들 안에서는 `@font-face` 만 사용 (`@import` 금지).
- **Wanted 디자인의 `<header>` 시맨틱**: e2e 가 `page.locator("header")` 로 사용자 정보를 찾으므로 AppShell 의 토픈바는 반드시 `<header className="w-topbar">` 으로 둔다. `<div>` 로 바꾸면 Day 1·2 e2e 깨진다.
- **모바일 검증**: DevTools 의 device toolbar 로 ≤768px 에서 햄버거 → 사이드바 → 라우트 클릭 → 자동 닫힘 사이클을 매 페이지 추가 시 직접 확인. e2e 는 viewport 기본(`Desktop Chrome`) 에서만 돌아가므로 모바일 회귀는 자동 잡히지 않는다.

---

## 7. 빠른 참조 (Cheat Sheet)

### 7.1 폴더 구조 (현재 + 예정)

```
mockup/
├── app/
│   ├── (auth)/                       # ✅ Day 2 + Milestone W — login/signup/forgot-password (Wanted 스플릿 셸)
│   ├── (admin)/                      # ✅ Day 1 layout, ✅ Day 2~5 페이지 (Milestone W 에서 Wanted AppShell 로 교체)
│   │   ├── dashboard/                # ✅ Milestone W — 4 KPI + 3 가설 배너
│   │   ├── api-list/                 # ✅ Day 3 + Milestone W (Stepper / done 추가)
│   │   ├── datasource/               # ✅ Day 4 — 목록·검색·CRUD·연결테스트
│   │   │   └── [id]/swap/            # ✅ Milestone W — test/impact/run/done 4단
│   │   ├── ext-system/               # ✅ Day 4 — 목록·CRUD·인증키 발급/재발급
│   │   ├── monitoring/               # ✅ Milestone W UI / ☐ Day 5 실시간 큐
│   │   │   ├── incidents/[id]/       # ✅ Milestone W
│   │   │   ├── logs/                 # ✅ Milestone W
│   │   │   │   └── [traceId]/        # ✅ Milestone W (root-cause 포함)
│   │   │   └── rules/                # ✅ Milestone W
│   │   ├── approvals/                # ☐ Day 5
│   │   ├── users/                    # ☐ Day 5
│   │   └── me/                       # ✅ Day 2
│   ├── docs/                         # ☐ Day 5
│   ├── api/
│   │   ├── mock/                     # ✅ Day 2~4 / ☐ Day 5 (monitoring·approvals·users·gateway 추가 예정)
│   │   │   ├── auth/, users/, apis/, reset/   # ✅ Day 1~3
│   │   │   ├── datasources/                   # ✅ Day 4 (route, [id]/route, test-connection)
│   │   │   └── ext-systems/                   # ✅ Day 4 (route, [id]/route, [id]/regenerate-key)
│   │   └── sample/                   # ☐ Day 5
│   ├── wanted-tokens.css             # ✅ Milestone W — --w-* 96종 + Pretendard
│   ├── wanted-components.css         # ✅ Milestone W — .w-* 컴포넌트 클래스
│   ├── globals.css                   # ✅ Day 0 + Milestone W (Wanted Sans @import 최상단)
│   ├── layout.tsx                    # ✅ Day 1
│   └── page.tsx                      # ✅ Day 1 (redirect → /api-list)
├── components/
│   ├── ui/                           # ✅ shadcn 13개 (Day 0) — 일부 폼은 Milestone W 에서 .w-* 로 대체
│   ├── design/                       # ✅ Milestone W + Day 4 — Wanted 공통 컴포넌트
│   │   ├── AppShell.tsx              # 232px 사이드바 + 56px 토픈바 + 햄버거 드로어
│   │   ├── Icons.tsx                 # 34 lucide-style SVG (Day 4 에서 Trash/Pencil/Key 추가)
│   │   ├── Stepper.tsx               # 5단 스테퍼
│   │   ├── CodeBlock.tsx             # 신택스 하이라이트
│   │   ├── LineChart.tsx             # 자체 SVG 라인 차트 (recharts 대체)
│   │   ├── Modal.tsx                 # ✅ Day 4 — ESC/scroll lock/≤640px fullscreen 폴백
│   │   └── primitives.tsx            # MetricTile / Hypothesis / HttpMethod / Notice / Checklist / TraceRow
│   ├── FormBanner.tsx                # ✅ Day 2 + Milestone W (Wanted 토큰 교체, testid/role 보존)
│   ├── ApiListTable.tsx              # ✅ Day 3 + Milestone W (.w-tbl 재구성)
│   ├── ApiForm.tsx                   # ✅ Day 3 (Milestone W 에서 그대로 유지)
│   ├── SqlEditor.tsx                 # ✅ Day 3
│   ├── DataSourceForm.tsx            # ✅ Day 4 — useState + safeParse, 연결 테스트 버튼
│   ├── ExtSystemForm.tsx             # ✅ Day 4 — IP textarea + date 2종 + 매핑 API 체크박스
│   ├── CertKeyDialog.tsx             # ✅ Day 4 — 1회 노출 + 복사 + 경고 배너
│   └── (MonitoringChart 는 design/LineChart 로 흡수)
├── lib/
│   ├── utils.ts                      # ✅ Day 0
│   ├── mockData.ts                   # ✅ Day 1 + Milestone W (dataSources 5개 확장)
│   ├── mockAuth.ts                   # ✅ Day 1
│   ├── monitoringSeed.ts             # ✅ Milestone W — 가설 2 시드(metrics/incidents/calls/rules)
│   ├── datasourceMeta.ts             # ✅ Milestone W — 가설 3 시드(pool/poolPct/latency)
│   ├── certKey.ts                    # ✅ Day 4 — `AKAD####-XXXXXXXX-...` 인증키 생성기
│   ├── schemas/
│   │   ├── auth.ts                   # ✅ Day 2
│   │   ├── api.ts                    # ✅ Day 3
│   │   ├── datasource.ts             # ✅ Day 4
│   │   └── extSystem.ts              # ✅ Day 4
│   ├── mockGateway.ts                # ☐ Day 5
│   └── mockHistory.ts                # ☐ Day 5 (모니터링 화면을 정적 시드 → 실시간 큐로 전환)
├── hooks/                            # 필요 시 생성
├── types/
│   └── api.ts                        # ✅ Day 1
├── e2e/                              # ✅ Day 1·2·3·4 32/32 PASS / ☐ Day 6 (5 신규 시나리오)
├── proxy.ts                          # ✅ Day 1 + Milestone W (/dashboard 추가)
├── playwright.config.ts              # ✅ Day 1
└── (자동 생성: package.json / bun.lock / components.json / next.config.ts / ...)
```

### 7.2 자주 쓰는 명령

```powershell
# 개발 서버
bun run dev                            # http://localhost:3000

# 타입 체크 (작업 단위 종료 시 필수)
bunx tsc --noEmit

# Lint
bun run lint

# e2e (Day 6 이후)
bun run test:e2e

# 의존성 추가
bun add <pkg>
bun add -d <pkg>

# shadcn 컴포넌트 추가
bunx shadcn@latest add <name> --yes
# 만약 silent fail 하면 components/ui/<name>.tsx 직접 작성 (§6.2)
```

### 7.3 트러블슈팅

| 증상 | 1차 시도 |
|---|---|
| `port 3000 in use` | `bun run dev -- -p 3001` 또는 점유 프로세스 종료 |
| `tsc` 에러 — 모듈 not found | `bun install` 재실행. 그래도 실패하면 `bun add <누락모듈>` |
| 브라우저에 `mockData` 변경 안 반영 | Next.js HMR 한계. 페이지 새로고침 또는 dev 서버 재기동 |
| Playwright 브라우저 없음 | `bunx playwright install chromium` |
| shadcn add 후 빌드 실패 | `tsc --noEmit` 으로 누락 의존성 확인 → `bun add` |

---

## 8. 종료 후 → Phase 2 진입

Day 7 데모 + 사인오프 완료 시:

1. 본 문서 §3 Day 7 의 ☐ 모두 ☑ 로.
2. [`01_mockup계획.md §8 종료 조건`](01_mockup계획.md#8-mockup-단계-종료-조건) 체크리스트 100% 충족 확인.
3. [`open-questions.md` 의 P0 항목](open-questions.md) 들을 **하나씩 닫는 작업**으로 Phase 2 시작.
4. 닫힐 때마다 본 폴더에 새 PRD 한 개씩 추가 (예: `04_백엔드결정.md`, `05_DB결정.md`).
5. `기존안/` 의 해당 주제 문서를 발췌해 활용.

---

**작성일**: 2026-05-09
**최종 갱신**: 2026-05-10 (Day 5 — 모니터링 라이브 큐 + 승인/사용자/문서 + 샘플 GW 완료 시점)
**다음 갱신 트리거**: Day 6 통합 e2e 5종 (`e2e/01~05-*.spec.ts`) 머지 시 §4 의 `다음 시작점` 변경 + §3 Day 6 항목 ☐ → ☑.
