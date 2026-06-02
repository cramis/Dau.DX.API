> Dau.DX.API 문서 허브 단일 진입점. 역할별 라우팅 + 생명주기 구분 + 신규 문서 배치 규칙. 모든 문서는 여기서 시작.

# Dau.DX.API 문서 허브

이 저장소의 **모든 문서는 `docs/` 하나**로 모았다(과거 `/wiki`·`/doc` 통합, 2026-06-02). 폴더는 **생명주기·역할**로 나뉜다. 무엇을 찾든 아래 표에서 출발하면 된다.

> 한 줄 정의. 내부 DB 데이터를 SQL 등록만으로 REST API 화하고, 인증키·IP·기간·매핑 통제 + 마스킹으로 외부에 안전하게 노출하는 **멀티-DB 셀프서비스 API 게이트웨이**(EzAPI 후속). 전체 그림 = [`00_프로젝트_전체조망.md`](00_프로젝트_전체조망.md).

---

## ▶ 새 세션/신규 합류 진입 순서

1. [`00_프로젝트_전체조망.md`](00_프로젝트_전체조망.md) — 목표·현황 매트릭스·갭. **여기부터.**
2. [`product/01_본개발_PRD.md`](product/01_본개발_PRD.md) — 왜 이 범위·잠근 결정.
3. [`guide/04_backend_가이드.md`](guide/04_backend_가이드.md) — 구조·규약·확장법(백엔드 작업 시).
4. [`progress/03_context-notes.md`](progress/03_context-notes.md) 최신 항목 — 현재 맥락.

---

## 역할별 라우팅 ("…하려면 → 여기")

| 하려는 것 | 문서 |
|---|---|
| 전체 위치·진행 현황 파악 | [`00_프로젝트_전체조망.md`](00_프로젝트_전체조망.md) |
| 제품 범위·잠근 결정 확인 | [`product/01_본개발_PRD.md`](product/01_본개발_PRD.md) |
| 미결정/결정 이력 확인 | [`product/open-questions.md`](product/open-questions.md) |
| **HTTP 계약(엔드포인트·응답·에러코드)** | [`spec/05_api_연결목록.md`](spec/05_api_연결목록.md) |
| **DB 스키마(14테이블 DDL·모델)** | [`spec/06_DB_모델링.md`](spec/06_DB_모델링.md) · [`spec/07_DBA_DDL.sql`](spec/07_DBA_DDL.sql) |
| DBA 협업·설치 | [`spec/07_DBA_요청서.md`](spec/07_DBA_요청서.md) |
| 호출 이력 적재·파티션 정책 | [`spec/04_동아_오라클_모니터링.md`](spec/04_동아_오라클_모니터링.md) |
| 백엔드 구조·확장 레시피 | [`guide/04_backend_가이드.md`](guide/04_backend_가이드.md) |
| 프론트 BFF 연동 디버깅 | [`guide/05_frontend_BFF_이관_로그.md`](guide/05_frontend_BFF_이관_로그.md) |
| 보안(마스킹·SQL정책·암호화·레이트리밋) | [`guide/06_보안강화_설계.md`](guide/06_보안강화_설계.md) |
| 작업 체크리스트 | [`progress/02_checklist.md`](progress/02_checklist.md) |
| 결정·트러블슈팅 로그(시간순) | [`progress/03_context-notes.md`](progress/03_context-notes.md) |
| 전체 비전(NFR·인프라·EzAPI 이관) 원본 | [`reference/기존안/INDEX.md`](reference/기존안/INDEX.md) |
| mockup 단계 역사물 | [`archive/mockup-phase/`](archive/mockup-phase/) |

> 앱별 로컬 문서는 각 폴더에 그대로. 백엔드 DB 런북 = [`../backend/db/README.md`](../backend/db/README.md), e2e 가이드 = [`../frontend/e2e/README.md`](../frontend/e2e/README.md).

---

## 디렉터리 생명주기

| 폴더 | 역할 | 상태 |
|---|---|---|
| (루트) `00_프로젝트_전체조망.md` | 전체 조망 + 현황 매트릭스 | 활성 |
| `product/` | 무엇/왜 — 제품 정의·결정 | 활성 |
| `spec/` | **SoT** — 계약·DB 스키마·DDL. 깨면 안 됨 | 활성 |
| `guide/` | 어떻게 — 백엔드·프론트·보안 가이드 | 활성 |
| `progress/` | 진행 추적 — 체크리스트·결정 로그 | 활성 |
| `reference/기존안/` | 엔터프라이즈 원본 PRD 13종. 전체 비전·NFR·인프라의 유일 출처 | 참고(일부만 유효) |
| `archive/mockup-phase/` | mockup 단계 문서. 역사 보존 | **읽되 따르지 말 것** |

---

## 유지 규칙 (신규 문서 → 어느 폴더)

- 제품 정의·결정 → `product/`. 계약/스키마(SoT) → `spec/`. 개발/운영 가이드 → `guide/`. 진행·체크리스트·로그 → `progress/`.
- 전체 비전 원본은 `reference/기존안/` (수정보다 발췌해 활성 문서로 승격).
- 대체된 문서는 지우지 말고 `archive/` 로 이동(이력 보존).
- **번호 prefix 가 폴더 간 겹침**(예 `spec/06` vs `guide/06`) → 링크·언급 시 **항상 폴더 동반 표기**.
- 코드/SQL 가 문서를 참조하면 경로를 `docs/...` 로. 스키마 변경 시 `spec/07_DBA_DDL.sql` + `spec/06_DB_모델링.md` 동기화(메모리 `keep-ddl-with-backend`). 백엔드 변경 시 `guide/04_backend_가이드.md` 동기화.

---

**통합일**: 2026-06-02 (과거 `/wiki` + `/doc/Dau.DX.API_개발계획` → `docs/`).
