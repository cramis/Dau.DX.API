# Dau.DX.API — 개발 계획 (Mockup-First Lite)

> 멀티-DB SQL-to-REST API 게이트웨이(EzAPI 재개발). **Mockup 부터 만든다**. 백엔드/DB/배포는 화면이 확정된 뒤 결정한다.

---

## 한 줄 정의

관리자가 SQL 을 등록하면 외부 시스템이 REST API 로 호출할 수 있는 self-service 데이터 API 플랫폼. 사내 여러 DB 를 동적으로 연결한다.

---

## 진행 단계

```
┌─ Phase 1 (지금) ──────────────────────────────────┐
│  Mockup 만들기                                     │
│  - Next.js 단독으로 12개 화면 + 5개 샘플 GW 시연    │
│  - 백엔드/DB 코드 0줄. 모든 데이터는 메모리 Mock     │
│  - 사용자 클릭으로 흐름 확인 → 화면·API 인터페이스 확정 │
└────────────────────────────────────────────────────┘
                     ↓ Mockup 사인오프
┌─ Phase 2 ────────────────────────────────────────┐
│  open-questions 하나씩 닫기                        │
│  - 백엔드 스택, DB, 인증, 배포 ... 순차 결정       │
│  - 결정될 때마다 본 폴더에 새 PRD 추가              │
└────────────────────────────────────────────────────┘
                     ↓
┌─ Phase 3 ────────────────────────────────────────┐
│  정식 개발 (frontend/ + backend/)                   │
└────────────────────────────────────────────────────┘
```

---

## 문서 구성

| 파일 | 역할 |
|---|---|
| **README.md** (본 문서) | 한 페이지 요약, 결정 잠금 범위 |
| [`01_mockup계획.md`](01_mockup계획.md) | Phase 1 작업자가 보는 메인 가이드 (폴더·Bun·Mock·5개 GW·e2e) |
| [`02_화면명세.md`](02_화면명세.md) | 12개 화면 wireframe (간략) |
| [`03_mockup_구현계획.md`](03_mockup_구현계획.md) | **★ 진행 상태 + 일별 체크리스트 + 새 세션 진입 절차 + 컨텍스트 노트** (작업 중 가장 많이 보는 문서) |
| [`04_동아_오라클_모니터링.md`](04_동아_오라클_모니터링.md) | Phase 2 PRD 초안 — 호출 이력을 Oracle 19c 에 영속화하는 데이터 모델·쿼리·수집 경로. `open-questions B4` 를 닫음 |
| [`05_api_연결목록.md`](05_api_연결목록.md) | FE ↔ BE 분리 시 사용할 HTTP 계약(contract) 목록. mockup 의 모든 라우트를 정식 endpoint 로 정리 |
| [`06_DB_모델링.md`](06_DB_모델링.md) | Oracle 19c MetaDB 의 정식 DDL 정의서. 14 테이블 + 시퀀스 + 코멘트 + 보존 정책 + 캐시·큐 전략(`A5`) 정합 |
| [`07_DBA_요청서.md`](07_DBA_요청서.md) | DBA 협업용 컨텍스트·체크리스트·운영 가이드. 8개 사전 확인 항목 + 검증 쿼리 |
| [`07_DBA_DDL.sql`](07_DBA_DDL.sql) | sqlplus/SQL Developer 로 그대로 실행 가능한 단일 DDL 스크립트. 06 PRD 의 SQL 만 추출 |
| [`open-questions.md`](open-questions.md) | Mockup 이후 결정할 사항 목록 |
| [`기존안/`](기존안/) | 이전에 작성한 13개 상세 PRD. 참고용으로 보존. **Mockup 단계에서는 적용하지 않는다** |

---

## 결정 잠금 범위 (Mockup 단계)

**잠그는 것**.
- 프론트엔드 프레임워크: **Next.js 16 (App Router) + TypeScript 5**
- 패키지 매니저: **Bun (로컬 개발)** — npm/배포 정책은 백엔드 결정 후 합류
- UI: **shadcn/ui + Tailwind CSS 4**
- e2e: **Playwright**
- 12개 화면 라우트 + 5개 샘플 게이트웨이의 **인터페이스(요청/응답 형태)** 만 픽스
- Mock 데이터 구조는 메모리 객체로만 정의

**열어두는 것** (모두 [`open-questions.md`](open-questions.md) 로 이동).
- 백엔드 언어/프레임워크
- DB 종류·스키마·MetaDB 설계
- 인증 알고리즘 (cert-key 검증 방식)
- 외부 호출 검증 단계 수와 정의
- SQL 화이트리스트 정책
- CI/CD 파이프라인
- K8s 배포·Helm·Argo CD
- Vault·시크릿 관리
- 도메인 (`api.donga.ac.kr` / `dxapi.donga.ac.kr` / `ezapi.donga.ac.kr`)
- DR·백업·RPO/RTO
- 성능 목표 수치 (RPS, p95)
- 보안 모델 깊이 (OWASP, 마스킹 정규식, PIPA 보존기간)
- 라이선스 정책 (Oracle JDBC, shadcn 카피 모델)

---

## 작업 원칙

1. **Mockup 이 진실의 원천**. 화면을 만들어보고 발견되는 것이 PRD 보다 우선.
2. **결정은 미루는 게 기본**. 결정해야만 다음이 막히는 시점에 결정한다.
3. **확정되면 본 폴더에 새 문서 추가**. 기존안/ 의 같은 주제 문서를 발췌 + 갱신해서 옮긴다.
4. **변경 추적**. Mockup 단계의 변경은 `mockup/CHANGELOG.md` 에, PRD 변경은 본 폴더의 git history 로.

---

## 다음 액션 (Mockup 작업자)

1. [`03_mockup_구현계획.md`](03_mockup_구현계획.md) 의 §2 Prerequisites + §4 진행 상태 트래커 → **현재 어디까지 했는지 확인**
2. §3 Day 별 체크리스트의 첫 ☐ 항목부터 시작
3. 작업 단위 종료 시 §4 트래커 + `mockup/CHANGELOG.md` 갱신 (필수)
4. 답이 필요한 항목 발견 시 [`open-questions.md`](open-questions.md) 에 추가

---

**작성일**: 2026-05-09
**이전 버전**: [`기존안/INDEX.md`](기존안/INDEX.md) (13개 문서, 참고용 보존)
