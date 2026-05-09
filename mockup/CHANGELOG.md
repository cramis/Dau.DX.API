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

## 2026-05-09 — Day 1 ✅ 레이아웃 / 사이드바 / Mock JWT 가드

- 도메인 타입(`types/api.ts`) + 시드(`lib/mockData.ts`) + 인증 헬퍼(`lib/mockAuth.ts`)
- 공통 컴포넌트: `Sidebar`, `AppHeader`, `LogoutButton`, `ComingSoon`
- (admin) layout + 9개 placeholder + (auth) layout + 3개 페이지 + `/docs` placeholder = 13개 라우트
- `app/(auth)/login/page.tsx` 는 Day 1 임시 (admin01/user01 버튼 로그인). Day 2 에 정식 폼으로 교체.
- `app/api/mock/auth/login`, `/logout` route handler (Day 2 에 PW 검증 추가)
- 루트 `layout.tsx` 한국어 lang + sonner Toaster 마운트, `page.tsx` redirect 로직
- `middleware.ts` → **`proxy.ts`** 로 시작 (Next.js 16 deprecation 회피)
- `bun run build` 통과 (16 라우트 전부, 경고 0)

> **다음**: [03 §3 Day 2](../doc/Dau.DX.API_개발계획/03_mockup_구현계획.md#day-2--인증-화면-로그인--회원가입--비밀번호-찾기--본인-정보-) — `app/(auth)/login/page.tsx` 를 react-hook-form + zod 정식 폼으로 교체부터.
