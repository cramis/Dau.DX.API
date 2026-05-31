> Dau.DX.API 본 개발(Phase 3) 위키 인덱스. mockup 을 기반으로 실제 backend + frontend 를 만드는 작업의 진입 문서.

# Dau.DX.API — 본 개발 위키

mockup(`mockup/`)으로 화면·인터페이스가 확정된 뒤, 실제 동작하는 backend + frontend 를 만드는 단계의 문서 트리다. 기존 계획 문서(`doc/Dau.DX.API_개발계획/`)와 **분리**해 본 개발 전용으로 둔다.

---

## 한 줄 정의

mockup 의 12화면 + 5종 게이트웨이를, **Spring Boot 백엔드 + Next.js 프런트엔드 + Oracle 19c MetaDB** 로 실제 구현한다. 작업 브랜치는 `dev-01`.

---

## 문서 트리

| 파일 | 역할 |
|---|---|
| **README.md** (본 문서) | 위키 인덱스, 진입점 |
| [`01_본개발_PRD.md`](01_본개발_PRD.md) | **★ 본 개발 PRD**. 잠근 결정·아키텍처·1차 범위·계약 매핑·인증·테스트 |
| [`02_checklist.md`](02_checklist.md) | dev-01 1차(P0 수직 슬라이스) 작업 체크리스트. 작업하며 체크 |
| [`03_context-notes.md`](03_context-notes.md) | 작업 중 내린 결정과 근거 로그. 계속 append |

---

## 상위 문서 (참조)

| 문서 | 본 개발에서의 역할 |
|---|---|
| [`../doc/Dau.DX.API_개발계획/05_api_연결목록.md`](../doc/Dau.DX.API_개발계획/05_api_연결목록.md) | HTTP 계약(contract). 백엔드 컨트롤러의 1차 입력 |
| [`../doc/Dau.DX.API_개발계획/06_DB_모델링.md`](../doc/Dau.DX.API_개발계획/06_DB_모델링.md) | Oracle 19c 14테이블 DDL. MyBatis 매퍼의 1차 입력 |
| [`../doc/Dau.DX.API_개발계획/04_동아_오라클_모니터링.md`](../doc/Dau.DX.API_개발계획/04_동아_오라클_모니터링.md) | 호출 이력 적재·파티션 정책. 게이트웨이 모니터링의 근거 |
| [`../doc/Dau.DX.API_개발계획/open-questions.md`](../doc/Dau.DX.API_개발계획/open-questions.md) | 미결정 목록. 본 PRD §2 가 일부(A1/A2/B1/C 계열)를 닫는다 |
| [`../mockup/types/api.ts`](../mockup/types/api.ts) | 도메인 타입 SoT. BE DTO 미러링 기준 |

---

## 진입 절차 (새 세션)

1. [`01_본개발_PRD.md`](01_본개발_PRD.md) §0 한 페이지 요약 + §2 잠근 결정 확인.
2. [`02_checklist.md`](02_checklist.md) 의 첫 미완료 ☐ 부터 시작.
3. 작업 단위 종료 시 [`03_context-notes.md`](03_context-notes.md) 에 결정·근거 append, 체크리스트 갱신.
4. 커밋은 논리 단위로 (CLAUDE.md §9).

---

**작성일**: 2026-05-31
**브랜치**: `dev-01`
