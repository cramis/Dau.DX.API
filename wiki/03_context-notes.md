> dev-01 본 개발 중 내린 결정과 근거 로그. 작업하며 계속 append 한다. 다음 세션이 재유도 없이 이어가기 위한 문서.

# 03. Context Notes — dev-01

> 새 결정·트레이드오프가 생길 때마다 맨 아래에 날짜와 함께 추가. 지우지 말 것(이력).

---

## 2026-05-31 — 본 개발 착수 결정 4종

PRD 작성 전 사용자 확인으로 잠근 결정.

### 1. 백엔드 스택 = Spring Boot + Java 21 + MyBatis + HikariCP
- **왜**. [`06_DB_모델링.md`](../doc/Dau.DX.API_개발계획/06_DB_모델링.md) 가 이미 HikariCP·ojdbc·Virtual Threads 를 전제로 작성됨(JVM 가정). SQL-to-REST 워크로드라 동적 SQL·결과셋 매핑이 핵심 → ORM(JPA)보다 MyBatis 가 자연스럽다. 사내 Java 자산 가정.
- **닫은 open-q**. A1, A2, A3.
- **대안 기각**. NestJS(TS 공유 이점 있으나 node-oracledb·멀티DB 풀 성숙도 부담), FastAPI(06 의 JVM 전제와 불일치).

### 2. 프런트엔드 = mockup Next.js 승격 + BFF
- **왜**. mockup 의 12화면·컴포넌트를 100% 재사용. 브라우저에 JWT 노출 안 하려고 Next route handler 를 BFF(프록시)로 두고 세션 쿠키(httpOnly)는 BFF 가 관리. `/api/mock/**` 는 제거.
- **대안 기각**. 순수 SPA + 직접 호출 — 더 단순하나 인증키/세션 노출 표면이 커짐.

### 3. dev-01 1차 범위 = P0 수직 슬라이스
- **왜**. [`05 §12`](../doc/Dau.DX.API_개발계획/05_api_연결목록.md) P0 정의. 端-端 1개(로그인 → 게이트웨이 호출 → 모니터링 확인)를 먼저 관통시켜 아키텍처를 실증하고, 나머지는 동일 패턴으로 확장. 전체 일괄은 리뷰·롤백 단위가 너무 커짐.
- **제외**. CRUD 대부분, import/export, 승인, 인시던트 → 후속 PR.

### 4. 문서 = wiki/ 폴더 신설
- **왜**. 기존 계획 문서(`doc/`)와 물리 분리. 본 개발 전용 위키 트리(README + PRD + checklist + context-notes). CLAUDE.md §7(Plan+Checklist+Context Notes) 충족.

---

## 추가 잠금 (PRD §2 에서 함께 닫음)

- **C1 cert-key = HMAC-SHA256** (장기 키, 평문 미저장, 앞 8자 식별저장). 06 의 `CRTFC_KEY_HASH`/`CRTFC_KEY_DISTI_TEXT` 컬럼 구조에 정합.
- **C3 비밀번호 = bcrypt cost 12**. 06 코멘트 명시.
- **C5 JWT = Access 15분 / Refresh 24시간**, Refresh 는 `DXAPI_REFRESH_TOKEN_L` revoke. A5(Redis 미사용) 정합.

> 위 7개(A1/A2/A3/B1/C1/C3/C5)는 [`open-questions.md`](../doc/Dau.DX.API_개발계획/open-questions.md) 에서 아직 `[열림]`. M5 에서 `[닫힘 → wiki/01]` 로 갱신 예정(체크리스트 M5).

---

## 미해결 / 다음 세션 주의

- **A4 ojdbc Virtual Threads pinning**. 1차는 플랫폼 스레드. VT 채택은 PoC 후. 처리량 리스크.
- **C7 시크릿**. 1차 로컬 설정값(`DB_ENC_PW`, HMAC 키). Vault 는 후속.
- **B2 사용자 DB 범위**. 1차 Oracle 만 실동작, PG/MySQL 은 Registry 인터페이스만 열어둠.
- **채번**. 시퀀스 대신 `MAX(seq)+1 WHERE id LIKE 'A<YYYYMMDD>%'` 코드 처리(06 §3.2 권장). 동시성 시 트랜잭션 격리 확인 필요.

---

## 2026-06-01 — M1 완료 (DDL 제외)

### 한 일
- `backend/` Spring Boot 3.5.14 + Java 21 스캐폴드(Spring Initializr starter.zip, Gradle Kotlin DSL, wrapper 포함).
- 의존성. web / validation / actuator / mybatis-spring-boot-starter 3.0.5 / ojdbc11 (HikariCP 는 mybatis-starter 경유).
- 공통. `ApiResponse`(record) / `ErrorCode`(05 §0 18종 + HttpStatus 매핑) / `ApiException` / `GlobalExceptionHandler` / `TraceIdFilter`(X-Trace-Id).
- ops. `OpsController`(/api/_ops/healthz, /version) + `VersionInfo`.
- 설정. `application.yml`(8080, actuator health/info, app.version·commit) + `application-local.yml`(Oracle, Hikari fail-timeout=-1).

### 환경
- **JDK 21 이 미설치였음** → winget `EclipseAdoptium.Temurin.21.JDK` 로 설치(2026-06-01).
- **`java` 가 PATH 에 없음**. 빌드 시 `JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot` 를 매번 세션에 지정해야 함. → [[backend-build-toolchain]] 참고.
- Docker·sqlplus 미설치. Oracle 인스턴스 아직 없음.

### 검증 결과
- `gradlew build` → BUILD SUCCESSFUL (compile + contextLoads 테스트 통과 = Oracle 없이 컨텍스트 로드).
- jar bootRun → `/api/_ops/healthz` `{ok:true,data:{status:UP}}`, `/version` build/commit/startedAt, 응답 헤더 `X-Trace-Id` 발급.
- `/actuator/health` → 503 (db DOWN). **예상대로** — Oracle 미기동. DB 지표 배선은 정상.

### 트러블슈팅 로그 (CLAUDE.md §10)
- 1차 빌드 실패. `ApiResponse` 를 record 로 만들었더니 컴포넌트명 `ok` 와 no-arg static `ok()` 가 accessor 와 충돌(`invalid accessor method in record`). → no-arg `ok()` 팩토리 제거(M1 미사용). `ok(data)`·`fail()` 은 arity 달라 무관. 향후 무인자 성공 응답 필요 시 `success()` 등 다른 이름 사용.

### 다음
- **M1 잔여**. Oracle 19c 인스턴스 확보 → `07_DBA_DDL.sql` 실행 + mockup 시드 INSERT → `/actuator/health` db UP 확인. Oracle 설치 방법(docker free / 사내 인스턴스) 사용자 결정 필요.
- 이후 **M2**(로그인/세션 + /me + BFF).
