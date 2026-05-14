# 05. API 연결 목록 (FE ↔ BE 분리 기준)

mockup(`mockup/app/api/**`) 의 모든 라우트를 분석해 추후 프론트엔드와 백엔드가 분리될 때 그대로 사용할 **HTTP 계약(contract)** 목록으로 정리한 문서다. 백엔드 팀의 구현 우선순위 산정과 FE 팀의 클라이언트(SDK) 설계의 1차 입력으로 사용한다.

---

## 0. 공통 규약

- **베이스 경로**. 운영 분리 후 관리/메타 API 는 `/api/**`, 외부 시스템이 호출하는 게이트웨이는 `/api/sample/**` 또는 `/api/gw/**` 로 둔다 (mockup 은 `/api/mock/**` + `/api/sample/**`).
- **인증 방식**.
  - 관리자/사용자 화면 호출 → 세션 쿠키 (mockup 은 `mock-jwt`, BE 는 JWT/세션).
  - 외부 시스템 게이트웨이 호출 → `X-Cert-Key` 헤더 + IP 화이트리스트.
- **공통 응답**.
  ```json
  { "ok": true,  "data": { ... } }
  { "ok": false, "message": "ERROR_CODE", "issues": { ... } }
  ```

  - 게이트웨이 응답은 추가로 `traceId` 를 포함한다.
- **에러 코드(샘플)**. `INVALID_INPUT`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `ID_EXISTS`, `PATH_EXISTS`, `NAME_EXISTS`, `INVALID_CREDENTIALS`, `USER_NOT_ACTIVE`, `INVALID_CERT_KEY`, `EXT_SYSTEM_INACTIVE`, `IP_NOT_ALLOWED`, `OUT_OF_PERIOD`, `API_NOT_MAPPED`, `API_NOT_FOUND`, `API_NOT_ACTIVE`, `MISSING_PARAM`, `INTERNAL_ERROR`.

---

## 1. 인증 / 세션 (`/api/auth/**`)

| Method | Path                        | 권한     | 요청               | 응답                   | 비고                                               |
| ------ | --------------------------- | -------- | ------------------ | ---------------------- | -------------------------------------------------- |
| POST   | `/api/auth/login`           | 비로그인 | `{ id, password }` | `{ user }` + 세션 쿠키 | 401 `INVALID_CREDENTIALS`, 403 `USER_NOT_ACTIVE`   |
| POST   | `/api/auth/logout`          | 로그인   | `-`                | `{ ok }`               | 세션 쿠키 만료                                     |
| POST   | `/api/auth/forgot-password` | 비로그인 | `{ id, email }`    | `{ ok }`               | mockup 은 단순 시뮬레이션. BE 는 메일 발송 큐 연동 |

---

## 2. 사용자 (본인) (`/api/users/me/**`)

| Method | Path                         | 권한     | 요청                                                    | 응답                     | 비고                                          |
| ------ | ---------------------------- | -------- | ------------------------------------------------------- | ------------------------ | --------------------------------------------- |
| GET    | `/api/users/me`              | 로그인   | `-`                                                     | `{ user }`               | password 필드 제외                            |
| PUT    | `/api/users/me`              | 로그인   | `{ name?, phone?, email?, dept?, tel? }`                | `{ user }`               | 본인만 수정 가능                              |
| PUT    | `/api/users/me/password`     | 로그인   | `{ currentPassword, newPassword }`                      | `{ ok }`                 | BE 는 해시 비교                               |
| POST   | `/api/users/signup`          | 비로그인 | `{ id, password, name, phone, email, org, dept, tel? }` | `{ ok }`                 | 신규는 PENDING 상태로 생성 → 관리자 승인 필요 |
| GET    | `/api/users/check-id?id=...` | 비로그인 | query                                                   | `{ available: boolean }` | 회원가입 폼 중복 확인                         |

---

## 3. 사용자 관리 (관리자) (`/api/users/**`)

| Method | Path                    | 권한  | 요청                             | 응답                | 비고                          |
| ------ | ----------------------- | ----- | -------------------------------- | ------------------- | ----------------------------- |
| GET    | `/api/users?q=&status=` | ADMIN | query                            | `{ items: User[] }` | 검색·상태 필터. password 제외 |
| GET    | `/api/users/{id}`       | ADMIN | `-`                              | `{ user }`          |                               |
| PUT    | `/api/users/{id}`       | ADMIN | `{ role?, status?, dept?, ... }` | `{ user }`          | 권한·상태 변경 포함           |
| DELETE | `/api/users/{id}`       | ADMIN | `-`                              | `{ ok }`            | soft delete 권장              |

---

## 4. API 정의 (`/api/apis/**`)

| Method | Path                         | 권한  | 요청                         | 응답                           | 비고                                           |
| ------ | ---------------------------- | ----- | ---------------------------- | ------------------------------ | ---------------------------------------------- |
| GET    | `/api/apis?q=`               | ADMIN | query                        | `{ items: ApiDef[] }`          | name/path/no/group 부분 일치                   |
| POST   | `/api/apis`                  | ADMIN | `ApiDef`(no 제외)            | `{ api }`                      | 409 `PATH_EXISTS`. no 는 `A+YYYYMMDD+seq` 자동 |
| GET    | `/api/apis/{id}`             | ADMIN | `-`                          | `{ api }`                      |                                                |
| PUT    | `/api/apis/{id}`             | ADMIN | `Partial<ApiDef>`            | `{ api }`                      |                                                |
| DELETE | `/api/apis/{id}`             | ADMIN | `-`                          | `{ ok }`                       | 매핑된 연계시스템 있으면 차단 검토             |
| GET    | `/api/apis/check-path?path=` | ADMIN | query                        | `{ available }`                | path 중복 확인                                 |
| POST   | `/api/apis/validate-sql`     | ADMIN | `{ dataSrcId, sql, params }` | `{ ok, columns?, error? }`     | BE 는 EXPLAIN 또는 dry-run                     |
| GET    | `/api/apis/export`           | ADMIN | `-`                          | xlsx/csv 다운로드              | 일괄 내보내기                                  |
| POST   | `/api/apis/import`           | ADMIN | multipart 파일               | `{ created, skipped, errors }` | 일괄 등록                                      |
| GET    | `/api/apis/import/template`  | ADMIN | `-`                          | xlsx 템플릿                    | 임포트 양식                                    |

---

## 5. 데이터 소스 (`/api/datasources/**`)

| Method | Path                               | 권한  | 요청                                      | 응답                           | 비고                         |
| ------ | ---------------------------------- | ----- | ----------------------------------------- | ------------------------------ | ---------------------------- |
| GET    | `/api/datasources`                 | ADMIN | `-`                                       | `{ items: DataSource[] }`      |                              |
| POST   | `/api/datasources`                 | ADMIN | `DataSource`(id 제외) + `dbPassword`      | `{ datasource }`               | id 는 `DS+YYYYMMDD+seq` 자동 |
| GET    | `/api/datasources/{id}`            | ADMIN | `-`                                       | `{ datasource }`               | password 제외                |
| PUT    | `/api/datasources/{id}`            | ADMIN | `Partial<DataSource>`                     | `{ datasource }`               |                              |
| DELETE | `/api/datasources/{id}`            | ADMIN | `-`                                       | `{ ok }`                       | 사용 중 API 있으면 차단      |
| POST   | `/api/datasources/test-connection` | ADMIN | `{ jdbcUrl, dbUser, dbPassword, dbType }` | `{ ok, elapsedMs, error? }`    | 실제 connect & ping          |
| GET    | `/api/datasources/export`          | ADMIN | `-`                                       | xlsx/csv                       |                              |
| POST   | `/api/datasources/import`          | ADMIN | multipart                                 | `{ created, skipped, errors }` |                              |
| GET    | `/api/datasources/import/template` | ADMIN | `-`                                       | xlsx 템플릿                    |                              |

---

## 6. 연계 시스템 (`/api/ext-systems/**`)

| Method | Path                                   | 권한  | 요청                                | 응답                           | 비고                                       |
| ------ | -------------------------------------- | ----- | ----------------------------------- | ------------------------------ | ------------------------------------------ |
| GET    | `/api/ext-systems`                     | ADMIN | `-`                                 | `{ items: ExtSystem[] }`       |                                            |
| POST   | `/api/ext-systems`                     | ADMIN | `ExtSystem`(id/certKey 제외)        | `{ extSystem, freshCertKey }`  | **인증키는 1회 노출** — 재조회 불가        |
| GET    | `/api/ext-systems/{id}`                | ADMIN | `-`                                 | `{ extSystem }`                | certKey 마스킹 응답                        |
| PUT    | `/api/ext-systems/{id}`                | ADMIN | `Partial<ExtSystem>` (certKey 제외) | `{ extSystem }`                | mappedApis, allowedIps, useBegin/useEnd 등 |
| DELETE | `/api/ext-systems/{id}`                | ADMIN | `-`                                 | `{ ok }`                       |                                            |
| POST   | `/api/ext-systems/{id}/regenerate-key` | ADMIN | `-`                                 | `{ freshCertKey }`             | 키 재발급(1회 노출)                        |
| GET    | `/api/ext-systems/export`              | ADMIN | `-`                                 | xlsx/csv                       | certKey 제외                               |
| POST   | `/api/ext-systems/import`              | ADMIN | multipart                           | `{ created, skipped, errors }` |                                            |
| GET    | `/api/ext-systems/import/template`     | ADMIN | `-`                                 | xlsx 템플릿                    |                                            |

---

## 7. 승인 (`/api/approvals/**`)

mockup 은 사용자 가입 / API 사용 두 종류로 분리해 둠.

| Method | Path                                | 권한  | 요청          | 응답                      | 비고                      |
| ------ | ----------------------------------- | ----- | ------------- | ------------------------- | ------------------------- |
| GET    | `/api/approvals/user?status=`       | ADMIN | query         | `{ items: Approval[] }`   | type=USER_SIGNUP          |
| POST   | `/api/approvals/user/{seq}/approve` | ADMIN | `-`           | `{ approval, user }`      | 사용자 → ACTIVE 전환      |
| POST   | `/api/approvals/user/{seq}/reject`  | ADMIN | `{ reason? }` | `{ approval }`            | 사용자 → REJECTED         |
| GET    | `/api/approvals/api?status=`        | ADMIN | query         | `{ items: Approval[] }`   | type=API_USAGE            |
| POST   | `/api/approvals/api/{seq}/approve`  | ADMIN | `-`           | `{ approval, extSystem }` | extSystem.mappedApis 추가 |
| POST   | `/api/approvals/api/{seq}/reject`   | ADMIN | `{ reason? }` | `{ approval }`            |                           |

(향후 통합형이 필요하면 `GET /api/approvals?type=USER_SIGNUP|API_USAGE` 로도 노출 가능)

---

## 8. 모니터링 (`/api/monitoring/**`)

| Method | Path                                                                       | 권한  | 요청          | 응답                         | 비고                          |
| ------ | -------------------------------------------------------------------------- | ----- | ------------- | ---------------------------- | ----------------------------- |
| GET    | `/api/monitoring/stats?windowMin=60`                                       | ADMIN | query (5~180) | `{ kpi, series, windowMin }` | KPI + 분당 200/4xx/5xx 시리즈 |
| GET    | `/api/monitoring/history?q=&statusCode=&apiNo=&extSysId=&from=&to=&limit=` | ADMIN | query         | `{ items: CallHistory[] }`   | 상세 호출 이력                |

추가 권장 (BE 단계).

- `GET /api/monitoring/incidents` — 자동 인시던트 감지 결과.
- `GET /api/monitoring/datasources/health` — pool 사용률·timeout 카운트(오라클 19c 모니터링 PRD 참고).

---

## 9. 운영 / 메타 (`/api/_ops/**`)

| Method | Path                | 권한          | 요청 | 응답                           | 비고                                                       |
| ------ | ------------------- | ------------- | ---- | ------------------------------ | ---------------------------------------------------------- |
| POST   | `/api/_ops/reset`   | (mockup 한정) | `-`  | `{ ok }`                       | mockup 의 `/api/mock/reset`. BE 분리 후 제거 또는 dev 전용 |
| GET    | `/api/_ops/healthz` | 비공개        | `-`  | `{ ok }`                       | LB 헬스체크                                                |
| GET    | `/api/_ops/version` | 비공개        | `-`  | `{ build, commit, startedAt }` | 배포 식별                                                  |

---

## 10. 게이트웨이 (외부 시스템 → 등록 API 호출)

> mockup 은 `/api/sample/{path}` 로 노출, BE 는 `ApiDef.path` + `ApiDef.method` 로 동적 라우팅한다.

- **공통 헤더**.
  - `X-Cert-Key` — extSystem.certKey. (mockup 은 미지정 시 익명 통과, BE 는 필수)
  - `X-Forwarded-For` / `X-Real-IP` — 클라이언트 IP (LB 단에서 신뢰)
- **검증 4단**.
  1. 인증키 매칭 (extSystem 존재 & status=ACTIVE)
  2. IP 화이트리스트 (CIDR/단일 IP)
  3. 이용 기간 (`useBegin ≤ now ≤ useEnd`)
  4. 매핑 API 포함 여부 (`apiNo ∈ extSystem.mappedApis`)
- **응답**. `{ ok, data?, code?, detail?, traceId }` + 호출 이력 자동 적재.

| Method     | Path                    | 권한            | 요청                      | 응답                                                       |
| ---------- | ----------------------- | --------------- | ------------------------- | ---------------------------------------------------------- |
| GET / POST | `/api/sample/{apiPath}` | 게이트웨이 검증 | `query` 또는 `body`(JSON) | `{ ok, data, traceId }` 또는 `{ ok:false, code, traceId }` |

mockup 시드 기준 현재 노출되는 샘플 5종.

| no           | method | path                       | dataSrc       | 설명              |
| ------------ | ------ | -------------------------- | ------------- | ----------------- |
| A20260509001 | GET    | `sample-user-info`         | DAU-CORE-PROD | 사용자 정보 조회  |
| A20260509002 | GET    | `sample-grade-list`        | DAU-CORE-PROD | 성적 목록         |
| A20260509003 | POST   | `sample-grade-save`        | DAU-CORE-PROD | 성적 저장         |
| A20260509004 | GET    | `sample-dept-tree`         | DAU-CORE-PROD | 부서 트리         |
| A20260509005 | POST   | `sample-notification-send` | DAU-CORE-PROD | 알림 발송 (DRAFT) |

---

## 11. 도메인 타입 (BE/FE 공유 모델)

`mockup/types/api.ts` 의 Zod 스키마를 1차 SoT 로 사용하고, BE 는 동일 형태의 OpenAPI/Pydantic/DTO 로 미러링한다.

- `User` (id, name, email, org, dept, phone, role: ADMIN|USER, status: PENDING|ACTIVE|REJECTED|INACTIVE, …)
- `DataSource` (id, name, dbType: ORACLE|POSTGRES|MYSQL, jdbcUrl, dbUser, poolMin/Max, queryTimeoutSec, useYn)
- `ApiDef` (no, name, group, method, path, status: DRAFT|ACTIVE|INACTIVE, dataSrcId, authRequired, docVisible, sql, params[], resps[])
- `ApiParam` (name, type: string|number|date|boolean, required, defaultValue?, desc?)
- `ApiResp` (col, type, displayName?, maskRule: none|name|phone|email|rrn|card|addr)
- `ExtSystem` (id, name, certKey, allowedIps[], useBegin, useEnd, mappedApis[], picgName?, picgEmail?, status)
- `CallHistory` (seq, calledAt, extSysId|null, apiNo|null, reqPath, method, clientIp, traceId, paramJson, statusCode, errorCode|null, elapsedMs)
- `Approval` (seq, type: USER_SIGNUP|API_USAGE, targetId, applicantId, reviewerId?, status: PENDING|APPROVED|REJECTED, reason?, appliedAt, processedAt?)

---

## 12. 우선순위 제안

- **P0 (분리 즉시 필요)**. 인증, 본인 정보, 게이트웨이(`/api/sample/**`) + 호출 이력 적재.
- **P1 (관리자 화면 가동)**. 사용자/데이터소스/API/연계시스템 CRUD, 승인.
- **P2 (운영 효율)**. import/export, 모니터링 stats/history, test-connection, validate-sql.
- **P3 (확장)**. 인시던트 자동 감지, 데이터소스 헬스(오라클 19c PRD), 키 회전 알림.
