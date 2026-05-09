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
