> dev-01 1차(P0 수직 슬라이스) 작업 체크리스트. 작업하며 ☐ → ☑ 로 갱신한다.

# 02. dev-01 체크리스트 — P0 수직 슬라이스

대상 범위는 [`01_본개발_PRD.md §5`](01_본개발_PRD.md). 마일스톤 단위로 묶었다. 각 항목 끝의 **verify** 가 완료 판정 기준(CLAUDE.md §4).

---

## M1. 백엔드 스캐폴드 + MetaDB 연결

- [ ] `backend/` Spring Boot 3.x + Java 21 프로젝트 생성 (Gradle Kotlin DSL) → verify: `./gradlew bootRun` 부팅
- [ ] MyBatis + HikariCP + ojdbc 의존성 추가 → verify: 컨텍스트 로드 성공
- [ ] `application-local.yml` MetaDB(Oracle 19c) 연결 → verify: 부팅 시 커넥션 확보
- [ ] `ApiResponse<T>` / `ErrorCode` enum / `GlobalExceptionHandler` 공통 응답 → verify: 의도적 예외가 `{ok:false,message}` 로 직렬화
- [ ] `TraceIdFilter` (요청별 traceId 발급) → verify: 응답/로그에 traceId
- [ ] `GET /api/_ops/healthz`, `GET /api/_ops/version` → verify: 200 + 빌드 정보
- [ ] 로컬 MetaDB 에 [`07_DBA_DDL.sql`](../doc/Dau.DX.API_개발계획/07_DBA_DDL.sql) 실행 + mockup 시드 INSERT → verify: 14테이블 + 샘플 데이터 존재

## M2. 로그인 / 세션 + 본인 정보 + BFF

- [ ] `UserMapper` (USER_ID 조회, 실패카운트 갱신) → verify: 매퍼 통합 테스트
- [ ] bcrypt(cost 12) 비밀번호 검증 → verify: 시드 사용자 로그인 성공/실패
- [ ] `JwtProvider` (Access 15분 / Refresh 24시간) + `DXAPI_REFRESH_TOKEN_L` 저장 → verify: 토큰 발급·검증·revoke
- [ ] `POST /api/auth/login`, `POST /api/auth/logout` → verify: 계약(05 §1) 응답 형태
- [ ] `GET /api/users/me` (password 제외) → verify: 세션으로 본인 조회
- [ ] frontend: `mockup/` → `frontend/` 승격 (복사) → verify: `bun dev` 기동
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
