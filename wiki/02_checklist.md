> dev-01 1차(P0 수직 슬라이스) 작업 체크리스트. 작업하며 ☐ → ☑ 로 갱신한다.

# 02. dev-01 체크리스트 — P0 수직 슬라이스

대상 범위는 [`01_본개발_PRD.md §5`](01_본개발_PRD.md). 마일스톤 단위로 묶었다. 각 항목 끝의 **verify** 가 완료 판정 기준(CLAUDE.md §4).

---

## M1. 백엔드 스캐폴드 + MetaDB 연결

> 상태(2026-06-01). 코드·빌드·런타임 검증 완료. DDL 실행+시드만 Oracle 인스턴스 대기.

- [x] `backend/` Spring Boot 3.5.14 + Java 21 프로젝트 생성 (Gradle Kotlin DSL) → verify: `gradlew build` BUILD SUCCESSFUL, jar bootRun 부팅 OK
- [x] MyBatis + HikariCP + ojdbc11 의존성 추가 → verify: contextLoads 테스트 통과 (Oracle 없이 컨텍스트 로드)
- [~] `application-local.yml` MetaDB(Oracle 19c) 연결 → 설정 완료. Hikari `initialization-fail-timeout=-1` 로 DB 미기동 부팅 OK. **DB UP 검증은 Oracle 대기** (`/actuator/health` db 지표 = DOWN 확인, 배선 정상)
- [x] `ApiResponse<T>` / `ErrorCode` enum / `GlobalExceptionHandler` 공통 응답 → verify: `{ok:true,data}` 직렬화 확인
- [x] `TraceIdFilter` (요청별 traceId 발급) → verify: 응답 헤더 `X-Trace-Id` 발급 확인
- [x] `GET /api/_ops/healthz`, `GET /api/_ops/version` → verify: 200 + `{status:UP}` / `{build,commit,startedAt}`
- [ ] 로컬 MetaDB 에 [`07_DBA_DDL.sql`](../doc/Dau.DX.API_개발계획/07_DBA_DDL.sql) 실행 + mockup 시드 INSERT → verify: 14테이블 + 샘플 데이터 존재 **(Oracle 인스턴스 필요 — 다음 작업)**

## M2. 로그인 / 세션 + 본인 정보 + BFF

> 상태(2026-06-01). 백엔드 코드+단위테스트+무DB 스모크 완료. 로그인 端-端은 Oracle 대기. frontend 승격/BFF/화면은 다음 작업.

### 백엔드 (Oracle 없이 검증 완료)
- [~] `UserMapper` (findById/touchLoginSuccess/incrementLoginFailure) + XML → 코드 완료. 통합테스트는 Oracle 대기
- [x] bcrypt(cost 12) 비밀번호 검증 → verify: `PasswordEncoderTest` 통과 ($2a$12$ + matches)
- [x] `JwtProvider` (Access 15분 / Refresh 24시간, jti) → verify: `JwtProviderTest` 4종(발급/파싱/만료/위조) 통과. `DXAPI_REFRESH_TOKEN_L` 저장은 매퍼 코드 완료, 영속검증 Oracle 대기
- [x] `AuthService` 로그인 분기 → verify: `AuthServiceTest` 4종(성공/오답/비활성/미존재) Mockito 통과
- [~] `POST /api/auth/login` `/logout` `/refresh` → 라우팅·검증·예외 스모크 통과(empty→400, me無토큰→401, creds→500 db down). 200 응답은 Oracle 대기
- [~] `GET /api/users/me` (password 제외) → 무토큰 401 검증. 본인 조회 200 은 Oracle 대기

### Oracle 확보 즉시 가동 세팅 (완료)
- [x] `backend/db/seed-codes.sql` (공통코드), `seed-meta.sql` (DS/API/연계/승인) → mockData 정합
- [x] `LocalDataSeeder` (사용자 3명 bcrypt 주입, `DXAPI_SEED_ENABLED` 게이트, DB 미연결 시 no-op)
- [x] `docker-compose.yml` (Oracle Free) + `backend/db/README.md` 런북(A:docker / B:사내 / C:검증)

### frontend (다음 작업 — Oracle 무관하게 진행 가능)
- [ ] `mockup/` → `frontend/` 승격 (복사) → verify: `bun dev` 기동
- [ ] BFF route handler: `/api/mock/**` 제거, Spring 프록시 + httpOnly 세션 쿠키 → verify: 브라우저에 토큰 미노출
- [ ] 화면 `(auth)/login`, `(admin)/me` 실제 연동 → verify: 로그인 → me 표시

## M3. 게이트웨이 4단 검증 + SQL 실행 + 마스킹

- [ ] `DataSourceRegistry` (dataSrcId별 HikariDataSource 동적 생성·캐시) → verify: 등록 DS 풀 확보
- [ ] `CertKeyVerifier` (HMAC-SHA256 → CRTFC_KEY_HASH 비교, ACTIVE) → verify: 단위 테스트 통과/거부
- [ ] `IpWhitelistChecker` (JSON CIDR 배열 매칭) → verify: CIDR 경계 케이스 단위 테스트
- [ ] 이용기간 + 매핑 API 검증 → verify: OUT_OF_PERIOD / API_NOT_MAPPED 분기
- [ ] `SqlExecutor` (#{param} 바인딩, 대상 DS 실행, literal 결합 차단) → verify: 샘플 SELECT 실행
- [ ] `MaskingApplier` (MASK_RULE_DVCD 컬럼별 마스킹) → verify: name/phone/email 마스킹
- [ ] `GET/POST /api/sample/{apiPath}` 동적 라우팅 → verify: 샘플 5종 중 `sample-user-info` 실제 응답
- [ ] 4단 실패별 ErrorCode + traceId 응답 → verify: 각 단계 거부 시 올바른 code

## M4. 호출 이력 적재 + 모니터링

- [ ] `CallHistoryQueue` (in-process BlockingQueue) enqueue → verify: 게이트웨이 응답 직전 적재
- [ ] `CallHistoryBatchWriter` (1초 또는 100건 배치 INSERT) → verify: 배치 INSERT 동작
- [ ] `CallHistoryMapper` → `DXAPI_CALL_HIST_L` (파티션) → verify: 당일 파티션 적재
- [ ] `GET /api/monitoring/stats` (KPI + 분당 시리즈) → verify: 계약(05 §8) 응답
- [ ] `GET /api/monitoring/history` (필터) → verify: 호출 목록 조회
- [ ] 화면 `(admin)/monitoring` 실제 연동 → verify: 게이트웨이 호출이 화면에 표시

## M5. 1차 통합 + 정리

- [ ] Testcontainers Oracle 통합 테스트: §0 端-端 시나리오 → verify: green
- [ ] mockup Playwright e2e 재사용(로그인·게이트웨이) → verify: green
- [ ] `03_context-notes.md` 최신화 → verify: 결정 로그 누락 없음
- [ ] open-questions.md 의 A1/A2/A3/B1/C1/C3/C5 상태 `[닫힘 → wiki/01]` 갱신 → verify: 반영
- [ ] dev-01 커밋 정리 + 빌드/테스트 통과 확인 → verify: `./gradlew build` + frontend lint

---

**진행 규칙**. 한 항목 완료 = verify 통과. M 단위 종료 시 커밋(CLAUDE.md §9) + context-notes append.
