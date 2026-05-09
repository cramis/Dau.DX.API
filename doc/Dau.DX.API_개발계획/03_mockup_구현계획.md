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
[Day 4 DS·연계] → [Day 5 모니터링·문서·승인·사용자] → [Day 6 e2e] → [Day 7 데모]
```

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

### Day 4 — 데이터소스 / 연계시스템 ☐

- [ ] `app/(admin)/datasource/page.tsx` — 목록 + 등록/수정 다이얼로그
- [ ] `components/DataSourceForm.tsx` — `[연결 테스트]` 버튼 (Mock 성공/실패 랜덤)
- [ ] `app/api/mock/datasources/route.ts` + `[id]/route.ts`
- [ ] `app/api/mock/datasources/test-connection/route.ts`
- [ ] `app/(admin)/ext-system/page.tsx` — 목록 + 등록/수정
- [ ] `components/ExtSystemForm.tsx` — IP textarea, 매핑 API multi-select
- [ ] `components/CertKeyDialog.tsx` — 인증키 1회 표시 모달 (복사 버튼)
- [ ] `app/api/mock/ext-systems/route.ts` + `[id]/route.ts`
- [ ] `app/api/mock/ext-systems/[id]/regenerate-key/route.ts`

**완료 정의**: 데이터소스/연계시스템 CRUD + 인증키 발급·재발급 흐름.

---

### Day 5 — 모니터링 + 문서 + 승인 + 사용자 + 샘플 GW ☐

- [ ] **차트 라이브러리 결정** (§6 컨텍스트 노트의 미결 항목 — recharts 권장)
- [ ] `app/(admin)/monitoring/page.tsx` — 검색 폼 + 차트 + 호출 이력 테이블
- [ ] `components/MonitoringChart.tsx` — 응답코드별 시간대 막대그래프
- [ ] `app/api/mock/monitoring/history/route.ts`
- [ ] `app/api/mock/monitoring/stats/route.ts`
- [ ] `app/docs/page.tsx` — 좌측 트리 + 우측 상세
- [ ] `app/(admin)/approvals/api/page.tsx`
- [ ] `app/(admin)/approvals/user/page.tsx`
- [ ] `app/api/mock/approvals/api/route.ts` + `[id]/(approve|reject)/route.ts`
- [ ] `app/api/mock/approvals/user/...` (동일 패턴)
- [ ] `app/(admin)/users/page.tsx`
- [ ] `app/api/mock/users/route.ts` + `[id]/route.ts`
- [ ] **5개 샘플 게이트웨이** (`app/api/sample/<path>/route.ts`):
    - [ ] `sample-user-info` (GET)
    - [ ] `sample-grade-list` (GET)
    - [ ] `sample-grade-save` (POST)
    - [ ] `sample-dept-tree` (GET)
    - [ ] `sample-notification-send` (POST)
- [ ] `lib/mockGateway.ts` — Mock 4단 검증 공통
- [ ] `lib/mockHistory.ts` — 인메모리 호출 이력 큐 (모니터링 화면 연동)

**완료 정의**: 외부 호출 시뮬레이션 → 모니터링 화면에서 즉시 보임.

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
| **현재 Day** | Day 3 ✅ 완료 → Day 4 ☐ 시작 전 |
| **마지막 갱신** | 2026-05-09 |
| **마지막 git commit** | 31ca9e5 (test+docs(mockup): Day 3 e2e 6 시나리오 + 트래커/CHANGELOG/§6 wrap-up) |
| **다음 시작점** | Day 4 첫 항목 — `app/(admin)/datasource/page.tsx` 의 목록 + 등록/수정 다이얼로그 |
| **막힘 / 결정 대기** | 없음 (Day 5 시작 전 차트 라이브러리만 결정 필요) |
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

### 6.3 미결 / Day 진입 전 결정 필요

| 시점 | 항목 | 후보 |
|---|---|---|
| Day 5 시작 전 | 차트 라이브러리 | **recharts (권장)** — shadcn chart 컴포넌트와 호환. 또는 Tremor / nivo |
| Day 6 시작 전 | Playwright 브라우저 범위 | chromium 만 (Mockup 단계는 멀티 브라우저 의미 없음) |
| 데모 후 | 디자인 토큰 정식화 | Day 7 데모 직후 `docs/design-tokens.md` 작성 |

### 6.4 발견 사항 (Discoveries)

- Next.js 16 + Bun 부트스트랩이 자동 생성하는 파일 4종: `README.md`, `AGENTS.md`, `CLAUDE.md`, `eslint.config.mjs`. `AGENTS.md` 와 `CLAUDE.md` 는 Next.js 의 LLM 가이드 — 우리 루트의 `CLAUDE.md` 와 별개라 **삭제하지 말 것**.
- shadcn `add` 가 자동 설치하는 Radix 의존성이 누락되는 케이스가 종종 있음. 새 컴포넌트 추가 후 항상 `tsc --noEmit` 으로 검증.
- Bun 의 `bunx` 는 npm 의 `npx` 와 동일 동작. 일관되게 `bunx` 사용.
- **Next.js 16 의 파일 컨벤션 변경**: `middleware.ts` 가 deprecated 되고 `proxy.ts` 로 변경됨. 함수 시그니처는 동일(`export function proxy(req: NextRequest)`). build 시 deprecation 경고로 발견. 본 프로젝트는 Day 1 에서 바로 `proxy.ts` 채택. 참고: <https://nextjs.org/docs/messages/middleware-to-proxy>.
- **`cookies()` 가 async**: Next.js 15+ 에서 `cookies()` 가 Promise 반환. `await cookies()` 후 `.get()`/`.set()`/`.delete()` 사용. 본 프로젝트의 `lib/mockAuth.ts` 가 모두 async 인 이유.
- **placeholder 검증 트릭**: 모든 라우트의 `page.tsx` 에 `<ComingSoon name="..." />` 만 두면 빈 페이지여도 라우팅·layout 검증이 가능. Day 진행 따라 한 파일씩 정식 구현으로 교체.

---

## 7. 빠른 참조 (Cheat Sheet)

### 7.1 폴더 구조 (현재 + 예정)

```
mockup/
├── app/
│   ├── (auth)/                       # Day 2 — login/signup/forgot-password
│   ├── (admin)/                      # Day 1 layout, Day 2~5 페이지
│   │   ├── api-list/                 # Day 3
│   │   ├── datasource/               # Day 4
│   │   ├── ext-system/               # Day 4
│   │   ├── monitoring/               # Day 5
│   │   ├── approvals/                # Day 5
│   │   ├── users/                    # Day 5
│   │   └── me/                       # Day 2
│   ├── docs/                         # Day 5
│   ├── api/
│   │   ├── mock/                     # Day 2~5
│   │   └── sample/                   # Day 5
│   ├── layout.tsx                    # Day 1
│   └── page.tsx                      # Day 1 (redirect)
├── components/
│   ├── ui/                           # ✅ shadcn 13개 (Day 0)
│   ├── Sidebar.tsx                   # Day 1
│   ├── AppHeader.tsx                 # Day 1
│   ├── DataTable.tsx                 # Day 3
│   ├── SqlEditor.tsx                 # Day 3
│   ├── ApiForm.tsx                   # Day 3
│   ├── DataSourceForm.tsx            # Day 4
│   ├── ExtSystemForm.tsx             # Day 4
│   ├── CertKeyDialog.tsx             # Day 4
│   └── MonitoringChart.tsx           # Day 5
├── lib/
│   ├── utils.ts                      # ✅ Day 0
│   ├── mockData.ts                   # Day 1
│   ├── mockAuth.ts                   # Day 1
│   ├── mockGateway.ts                # Day 5
│   └── mockHistory.ts                # Day 5
├── hooks/                            # 필요 시 생성
├── types/
│   └── api.ts                        # Day 1
├── e2e/                              # Day 6
├── middleware.ts                     # Day 1
├── playwright.config.ts              # Day 6
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
**최종 갱신**: 2026-05-09 (Day 3 완료 시점)
**다음 갱신 트리거**: Day 4 시작 시 §4 의 `현재 Day` 와 `다음 시작점` 변경.
