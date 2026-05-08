# Dau.DX.API 개발계획 PRD 인덱스

> **프로젝트명**: `Dau.DX.API` (EzAPI 재개발)
> **정의**: 멀티-DB SQL-to-REST API 게이트웨이 (Self-Service Data API Platform)
> **위치**: `Dau.DX.Dox` 와 분리된 독립 신규 Git 저장소
> **작성일**: 2026-05-08
> **기반 문서**: [`../Dau.DX.API_개발계획.md`](../Dau.DX.API_개발계획.md), [`../기술스택_재개발_추천.md`](../기술스택_재개발_추천.md), [`../API_프로그램_분석.md`](../API_프로그램_분석.md)

---

## 한 페이지 요약

```
┌──────────────────────────────────────────────────────────────────────┐
│  Dau.DX.API — 멀티-DB SQL-to-REST API 게이트웨이                      │
│                                                                       │
│  Frontend  : Next.js 16 + TS + Tailwind + shadcn/ui                  │
│  Backend   : Spring Boot 3.x + Java 21 + MyBatis + HikariCP          │
│  DB        : Oracle 19c (MetaDB + 사용자 등록 업무 DB N개)           │
│  CI/CD     : Gitea Actions → Harbor → Argo CD → K8s                  │
│                                                                       │
│  개발 전략 — Mockup-First 점진 개발                                  │
│   Phase 1 │ mockup/ 폴더에서 Next.js 화면 + Mock 게이트웨이 시연      │
│   Phase 2 │ 사용자 만족까지 UX/플로우 반복                            │
│   Phase 3 │ frontend/ + backend/ 정식 구현, Oracle 19c 연동          │
│                                                                       │
│  Repo 전략 — App Monorepo + GitOps Manifest Repo (2-repo)            │
│   - dau.dx.api          (앱 코드)                                    │
│   - dau.dx.api-gitops   (Argo CD 매니페스트)                         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 문서 목록

| #   | 문서                                                    | 단계         | 핵심 내용                                              |
| --- | ------------------------------------------------------- | ------------ | ------------------------------------------------------ |
| 1   | [프로젝트 개요 및 목표](01_프로젝트_개요_및_목표.md)    | 정의         | 정의·배경·목표·범위·이해관계자·성공지표                |
| 2   | [요구사항 정의서](02_요구사항_정의서.md)                | 분석         | 기능 요구사항(FR1~FR8) + 비기능 요구사항(NFR)         |
| 3   | [시스템 아키텍처 설계서](03_시스템_아키텍처_설계서.md)  | 설계         | 3-tier 아키텍처, 컴포넌트, 데이터 흐름, 기술 스택      |
| 4   | [화면 명세서](04_화면_명세서.md)                        | 설계         | 11개 화면 wireframe·필드·동작·권한                     |
| 5   | [API 명세서](05_API_명세서.md)                          | 설계         | 관리자 콘솔 API + 동적 게이트웨이 API + 에러 코드      |
| 6   | [데이터 모델 설계서](06_데이터_모델_설계서.md)          | 설계         | MetaDB 스키마 (Oracle 19c) + 동적 데이터소스 구조      |
| 7   | [Mockup 개발 계획](07_Mockup_개발_계획.md)              | Phase 1      | mockup/ 폴더 구조·Mock 데이터·샘플 게이트웨이 5개      |
| 8   | [본 개발 계획](08_본_개발_계획.md)                      | Phase 3      | frontend/ + backend/ 정식 구현 가이드 (TDD-First)      |
| 9   | [보안 및 인증 설계서](09_보안_및_인증_설계서.md)        | 보안         | JWT + API Key + IP 화이트리스트 + 마스킹 + 감사       |
| 10  | [CI/CD 및 운영 가이드](10_CICD_및_운영_가이드.md)       | 운영         | Gitea Actions, Harbor, Argo CD, Helm, 환경 분리       |
| 11  | [마일스톤 및 위험 관리](11_마일스톤_및_위험관리.md)     | 일정         | M1~M4 마일스톤, 위험 매트릭스, 의존성                  |

---

## 단계별 읽는 순서

### 처음 합류한 개발자 (전체 그림 파악)
1. **INDEX** (이 문서)
2. [01 프로젝트 개요](01_프로젝트_개요_및_목표.md) — 우리는 무엇을 만드는가
3. [02 요구사항](02_요구사항_정의서.md) — 무엇을 충족해야 하는가
4. [03 시스템 아키텍처](03_시스템_아키텍처_설계서.md) — 어떤 구조로 만드는가
5. [11 마일스톤](11_마일스톤_및_위험관리.md) — 언제 무엇을 끝내야 하는가

### Phase 1 (Mockup) 작업자
1. [07 Mockup 개발 계획](07_Mockup_개발_계획.md) — 메인 가이드
2. [04 화면 명세서](04_화면_명세서.md) — 어떤 화면을 만드는가
3. [05 API 명세서](05_API_명세서.md) §5.5 — 샘플 게이트웨이 시연 스펙

### Phase 3 (정식 개발) 작업자
1. [08 본 개발 계획](08_본_개발_계획.md) — 메인 가이드
2. [06 데이터 모델](06_데이터_모델_설계서.md) — Oracle 19c 스키마
3. [09 보안/인증](09_보안_및_인증_설계서.md) — 인증·인가 구현
4. [10 CI/CD 운영](10_CICD_및_운영_가이드.md) — 배포 파이프라인

---

## 기술 스택 퀵 참조

### Frontend (Next.js)
| 영역          | 라이브러리                                        |
| ------------- | ------------------------------------------------- |
| Framework     | Next.js 16 (App Router) + TypeScript 5            |
| Styling       | Tailwind CSS 4 + shadcn/ui                        |
| State (서버)  | TanStack Query 5                                  |
| State (클라)  | Jotai 2                                           |
| Form          | React Hook Form 7 + Zod 3                         |
| Table         | TanStack Table 8                                  |
| SQL Editor    | Monaco Editor                                     |
| Test          | Playwright (e2e)                                  |

### Backend (Spring Boot)
| 영역             | 라이브러리                                      |
| ---------------- | ----------------------------------------------- |
| Framework        | Spring Boot 3.x + Java 21 (Virtual Threads)     |
| Persistence      | MyBatis 3 + HikariCP                            |
| DB Driver        | ojdbc11 (Oracle 19c) + pgjdbc + mysql-connector |
| Security         | Spring Security 6 + JWT (관리자) + API Key 필터 |
| Cache            | Redis (Lettuce)                                 |
| Documentation    | springdoc-openapi 2                             |
| Observability    | Spring Actuator + Micrometer + OTel Java Agent  |
| Test             | JUnit 5 + Mockito                               |

### Infrastructure
| 영역      | 도구                                  |
| --------- | ------------------------------------- |
| SCM       | Gitea                                 |
| CI        | Gitea Actions                         |
| Registry  | Harbor (Trivy 스캔, Cosign 서명)      |
| GitOps    | Argo CD (App-of-Apps)                 |
| Runtime   | Kubernetes (Helm + Kustomize overlay) |
| Secrets   | External Secrets Operator + Vault     |
| 관측성    | Loki / Prometheus / Tempo / Grafana   |

---

## 핵심 도메인 모델 (요약)

```
[데이터소스]    실제 DB 접속 정보 (JDBC URL, 계정, 풀 사이즈)
       │ 사용
       ▼
   [API]   외부 노출 REST 엔드포인트 (등록 SQL/프로시저 보유)
       │ 매핑
       ▼
[연계시스템]    호출 측 외부 시스템 (인증키 + 허용 IP + 사용기간 + 매핑 API)
       │ 보유
       ▼
   [사용자]    관리자(admin) / 일반사용자(user)
```

> 도메인 상세는 [01 프로젝트 개요](01_프로젝트_개요_및_목표.md) §3, [06 데이터 모델](06_데이터_모델_설계서.md) §2 참조.

---

## Phase 별 마일스톤 (요약)

| Phase | 마일스톤 | 기간 | 산출물 |
|---|---|---|---|
| 0 | 분석/설계 | 2주 | 본 PRD 문서 세트 (12개) |
| 1 | Mockup 1차 완성 | 1주 | mockup/ 화면 11개 + 샘플 게이트웨이 5개 |
| 2 | Mockup 확정 | 가변 | 사용자 피드백 N차 반영 |
| 3 | 백엔드 코어 + Oracle 19c 연동 | 4주 | DataSource Manager + Dynamic SQL Engine |
| 4 | 첫 실 데이터소스 동작 | 2주 | E2E 시나리오 통과 |
| 5 | stg/prod 환경 분리 | 1주 | Argo CD prod 운영 |
| 6 | 안정화/이관 | 3주 | 기존 EzAPI 메타 마이그레이션 + 컷오버 |

> 상세는 [11 마일스톤 및 위험 관리](11_마일스톤_및_위험관리.md) 참조.

---

## 핵심 의사결정 (재정리)

| 결정 | 선택 | 근거 문서 |
|---|---|---|
| 백엔드 스택 | Spring Boot 3.x + Java 21 + MyBatis | [기술스택 추천](../기술스택_재개발_추천.md) §5 |
| 프론트엔드 스택 | Next.js 16 + TypeScript | (확정) |
| DB | Oracle 19c | (확정) |
| 개발 전략 | Mockup-First 점진 개발 | [개발계획](../Dau.DX.API_개발계획.md) §3 |
| Repo 구조 | mockup/ + frontend/ + backend/ | [개발계획](../Dau.DX.API_개발계획.md) §5 |
| 배포 파이프라인 | Gitea → Gitea Actions → Harbor → Argo CD → K8s | [기술스택 추천](../기술스택_재개발_추천.md) §2 |
| 시크릿 관리 | External Secrets Operator + Vault (prod) | [기술스택 추천](../기술스택_재개발_추천.md) §9 |

---

## 참조 문서 (외부)

| 문서 | 경로 | 설명 |
|---|---|---|
| EzAPI 분석 | [`../API_프로그램_분석.md`](../API_프로그램_분석.md) | 기존 EzAPI 11개 화면 + 도메인 모델 분석 |
| 기능개선 방안 | [`../기능개선_확장_방안.md`](../기능개선_확장_방안.md) | 재개발 시 개선 포인트 |
| 기술스택 추천 | [`../기술스택_재개발_추천.md`](../기술스택_재개발_추천.md) | 백엔드 스택 선정 + CI/CD 파이프라인 |
| 개발계획 요약 | [`../Dau.DX.API_개발계획.md`](../Dau.DX.API_개발계획.md) | 50라인 요약본 (본 PRD 의 모태) |

---

**작성일**: 2026-05-08
**문서 수**: INDEX + 11개 = **12개 문서**, 각 500라인 이하
**다음 단계**: [01 프로젝트 개요 및 목표](01_프로젝트_개요_및_목표.md) 부터 순차 작성
