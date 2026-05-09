# Mockup 변경 이력

> Mockup 단계의 화면·인터페이스·Mock 데이터 변경을 추적한다. PRD 본문(`doc/Dau.DX.API_개발계획/`) 의 변경은 git history 로 추적하므로 여기 적지 않는다.

기록 형식: 한 줄 요약 + 사유. 1주 1회 사용자 데모 후 일괄 정리.

---

## 2026-05-09 — 부트스트랩

- Next.js 16.2.6 + React 19.2 + TypeScript 5.9 + Tailwind CSS 4.3 (App Router, no src-dir)
- Bun 1.2.15 로 부트스트랩 (`bunx create-next-app@latest mockup --use-bun --yes`)
- shadcn/ui 초기화 (default style, slate base color)
- 기본 컴포넌트 12종: button / input / label / table / select / textarea / checkbox / sonner / card / dropdown-menu / tabs / dialog / form
- 라이브러리: zod 4.4, react-hook-form 7.75, @hookform/resolvers 5.2, @monaco-editor/react 4.7, @playwright/test 1.59
- 폴더 구조: `app/(auth)`, `app/(admin)`, `app/docs`, `app/api/mock`, `app/api/sample`, `components/ui`, `lib`, `hooks`, `types`, `e2e` 는 화면 구현 시 점진 추가

> 다음: [01_mockup계획.md §6 화면 구현 순서](../doc/Dau.DX.API_개발계획/01_mockup계획.md#6-화면-구현-순서-1주-가이드) 1일차 — 레이아웃·사이드바·Mock JWT 가드.
