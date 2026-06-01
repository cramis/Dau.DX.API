> Dau.DX.API 본 개발(Phase 3) 위키 인덱스. mockup 을 기반으로 실제 backend + frontend 를 만드는 작업의 진입 문서.

# Dau.DX.API — 본 개발 위키

mockup(`mockup/`)으로 화면·인터페이스가 확정된 뒤, 실제 동작하는 backend + frontend 를 만드는 단계의 문서 트리다. 기존 계획 문서(`doc/Dau.DX.API_개발계획/`)와 **분리**해 본 개발 전용으로 둔다.

---

## 한 줄 정의

mockup 의 12화면 + 5종 게이트웨이를, **Spring Boot 백엔드 + Next.js 프런트엔드 + Oracle 19c MetaDB** 로 실제 구현한다. 작업 브랜치는 `dev-01`.

---

## ▶ 현재 상태 (2026-06-01, 새 세션 시작점)

**백엔드는 05 계약 대부분 구현 + dev Oracle 19c 端-端 통합검증 완료.** 단위테스트 57종 green.

| 구분 | 상태 |
|---|---|
| M1 스캐폴드 / M2 인증·세션 / M3 게이트웨이 / M4 호출이력·모니터링 | ✅ |
| 관리 CRUD 5도메인 (users·datasources·ext-systems·apis·approvals) | ✅ |
| dev Oracle 연동 (`168.115.36.230/DEVORA19`, 유저 `dx`) | ✅ 통합검증 |
| **frontend 관리/모니터링 화면 BFF 이관** | ✅ 6도메인 完 (users·datasources·ext-systems·apis·approvals·monitoring) — dev Oracle 端-端 검증, [`05_frontend_BFF_이관_로그.md`](05_frontend_BFF_이관_로그.md) |
| P2 (import/export, test-connection, validate-sql) | ⬜ (백엔드 부재 → 화면 mock 유지) |
| Testcontainers 자동 통합테스트 / dev-01 → main PR | ⬜ |

**실행 (dev Oracle 연결).**
```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"   # java PATH 없음
$env:DXAPI_SEED_ENABLED = "true"   # 빈 USER 테이블에 데모 사용자/인증키 시드
cd backend; .\gradlew.bat bootRun  # application-local.yml 기본값이 dev DB 가리킴
# 검증: Invoke-RestMethod http://localhost:8080/actuator/health  → db: UP
# 로그인: admin01 / admin01!
```
스키마 재생성·접속 상세는 [`../backend/db/README.md`](../../backend/db/README.md). 구조·확장법은 [`04_backend_가이드.md`](04_backend_가이드.md).

**다음 세션 추천 시작.** 위 ⬜ 중 하나. 컨텍스트 새로 시작 시 본 표 + `04_backend_가이드.md` §1·§10 + `03_context-notes.md` 최신 항목부터 읽으면 됨.

---

## 문서 트리

| 파일 | 역할 |
|---|---|
| **README.md** (본 문서) | 위키 인덱스, 진입점 |
| [`01_본개발_PRD.md`](01_본개발_PRD.md) | **★ 본 개발 PRD**. 잠근 결정·아키텍처·1차 범위·계약 매핑·인증·테스트 |
| [`02_checklist.md`](02_checklist.md) | 작업 체크리스트(M1~M5). 작업하며 체크 |
| [`03_context-notes.md`](03_context-notes.md) | 결정·근거·트러블슈팅 로그(시간순). **최신 항목 = 현재 맥락** |
| [`04_backend_가이드.md`](04_backend_가이드.md) | **★ 백엔드 상세 가이드**(구조·규약·모듈·확장 레시피). 유지보수·신규개발 진입점. 백엔드 변경 시 함께 갱신 |
| [`05_frontend_BFF_이관_로그.md`](05_frontend_BFF_이관_로그.md) | frontend → 실 백엔드 BFF 이관 진행 로그(도메인별 변경·검증·문제·수정). 화면 연동 디버깅 진입점 |

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

**작성일**: 2026-05-31 · **최종 갱신**: 2026-06-01 (frontend BFF 이관 6도메인 완료)
**브랜치**: `dev-01`
