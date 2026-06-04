# 05. API 명세서

> **문서 종류**: API 인터페이스 PRD
> **작성일**: 2026-05-08
> **상위 문서**: [`INDEX.md`](INDEX.md)

---

## 1. API 분류

| 분류 | 경로 | 인증 | 사용자 |
|---|---|---|---|
| **관리자 콘솔 API** | `/admin/**` | JWT (Bearer) | 로그인 사용자 (admin/user) |
| **외부 호출 게이트웨이** | `/api/**` | API Key + IP | 외부 시스템 |
| **운영 엔드포인트** | `/actuator/**` | 내부망 only | K8s probe, 모니터링 |
| **OpenAPI 스펙** | `/openapi.json`, `/docs/swagger-ui` | (선택) | 사용자 |

---

## 2. 공통 응답 형식

### 2.1 표준 응답 (관리자 콘솔)

```json
{
  "success": true,
  "data": { /* 실제 데이터 */ },
  "message": "작업 성공",
  "errorCode": null,
  "traceId": "abc-123-xyz"
}
```

### 2.2 에러 응답

```json
{
  "success": false,
  "data": null,
  "message": "잘못된 요청 파라미터",
  "errorCode": "VALIDATION_FAILED",
  "errors": [
    { "field": "userId", "message": "필수 입력" }
  ],
  "traceId": "abc-123-xyz"
}
```

### 2.3 게이트웨이 응답 (Accept: application/json)

```json
{
  "result": [
    { "user_id": "u001", "user_nm": "홍길동", "dept_nm": "전산팀" }
  ],
  "count": 1,
  "elapsed_ms": 45
}
```

### 2.4 게이트웨이 에러

```json
{
  "result": [],
  "error": {
    "code": "AUTH_KEY_INVALID",
    "message": "인증키가 유효하지 않습니다"
  }
}
```

---

## 3. 인증

### 3.1 관리자 콘솔 (JWT)

**로그인**
```
POST /admin/auth/login
Body: { "userId": "admin01", "password": "xxx" }
Response: {
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 900,
    "user": { "userId": "admin01", "userName": "관리자", "role": "admin" }
  }
}
```

**Refresh**
```
POST /admin/auth/refresh
Body: { "refreshToken": "eyJ..." }
Response: { accessToken, refreshToken (rotation), expiresIn }
```

**보호된 엔드포인트**
```
GET /admin/api
Header: Authorization: Bearer eyJ...
```

### 3.2 외부 호출 게이트웨이 (API Key)

```
GET /api/sample-user-info?id=u001
Header:
  certification-key: ABCD1234EFGH5678
  X-Forwarded-For: 10.0.0.5 (Ingress 가 자동 부여)
  Accept: application/json
```

> 4단 검증: cert-key → 허용 IP → 사용기간 → 매핑 API. 실패 시 401/403.

---

## 4. 관리자 콘솔 API

### 4.1 인증
| Method | Path | 설명 |
|---|---|---|
| POST | `/admin/auth/login` | 로그인, JWT 발급 |
| POST | `/admin/auth/refresh` | Access Token 갱신 |
| POST | `/admin/auth/logout` | 로그아웃 (refresh 토큰 폐기) |
| POST | `/admin/auth/forgot-password` | 비밀번호 재설정 메일 발송 |

### 4.2 사용자 (User)
| Method | Path | 설명 |
|---|---|---|
| GET | `/admin/users` | 사용자 목록 (admin) |
| GET | `/admin/users/{id}` | 사용자 상세 |
| POST | `/admin/users/signup` | 회원가입 신청 |
| GET | `/admin/users/check-id?id={id}` | ID 중복 확인 |
| PUT | `/admin/users/{id}` | 사용자 수정 |
| DELETE | `/admin/users/{id}` | 사용자 삭제 (admin) |
| POST | `/admin/users/{id}/approve` | 가입 승인 (admin) |
| POST | `/admin/users/{id}/reject` | 가입 반려 (admin) |
| GET | `/admin/users/me` | 본인 정보 |
| PUT | `/admin/users/me/password` | 비밀번호 변경 |

### 4.3 API 관리
| Method | Path | 설명 |
|---|---|---|
| GET | `/admin/apis?keyword=&group=&status=&page=&size=` | API 목록 (검색/페이징) |
| GET | `/admin/apis/{id}` | API 상세 |
| POST | `/admin/apis` | API 등록 |
| PUT | `/admin/apis/{id}` | API 수정 |
| DELETE | `/admin/apis/{id}` | API 삭제 |
| GET | `/admin/apis/check-path?path={path}` | 요청경로 중복 확인 |
| POST | `/admin/apis/validate-sql` | SQL 구문 검증 (EXPLAIN) |
| POST | `/admin/apis/{id}/test` | API 실행 테스트 (admin 임시 호출) |

**POST /admin/apis (등록 요청 예시)**
```json
{
  "apiName": "사용자정보조회",
  "apiGroup": "USER",
  "httpMethod": "GET",
  "requestPath": "sample-user-info",
  "status": "ACTIVE",
  "dataSourceId": "ds_001",
  "authRequired": true,
  "documentVisible": true,
  "sqlSource": "SELECT user_id, user_nm, dept_nm FROM v_user WHERE user_id = #{user_id}",
  "queryTimeout": 10,
  "params": [
    { "name": "user_id", "type": "string", "required": true, "defaultValue": null }
  ],
  "responseColumns": [
    { "name": "user_id",  "type": "string", "displayName": "사용자ID", "masking": null },
    { "name": "user_nm",  "type": "string", "displayName": "이름",     "masking": "name" },
    { "name": "dept_nm",  "type": "string", "displayName": "부서명",   "masking": null }
  ]
}
```

### 4.4 데이터소스
| Method | Path | 설명 |
|---|---|---|
| GET | `/admin/datasources` | 데이터소스 목록 |
| GET | `/admin/datasources/{id}` | 상세 |
| POST | `/admin/datasources` | 등록 (등록 즉시 풀 생성) |
| PUT | `/admin/datasources/{id}` | 수정 (graceful drain + hot-swap) |
| DELETE | `/admin/datasources/{id}` | 삭제 (사용 중 API 있으면 차단) |
| POST | `/admin/datasources/test-connection` | 연결 테스트 |
| GET | `/admin/datasources/{id}/pool-status` | 풀 상태 (active/idle/total) |

**POST /admin/datasources (요청 예시)**
```json
{
  "name": "Oracle19c-prod",
  "dbType": "ORACLE",
  "jdbcUrl": "jdbc:oracle:thin:@host:1521/XE",
  "username": "ezapi",
  "password": "xxx",
  "minPoolSize": 5,
  "maxPoolSize": 20,
  "queryTimeout": 10
}
```

### 4.5 연계시스템
| Method | Path | 설명 |
|---|---|---|
| GET | `/admin/ext-systems` | 연계시스템 목록 |
| GET | `/admin/ext-systems/{id}` | 상세 (인증키는 마스킹) |
| POST | `/admin/ext-systems` | 등록 (인증키 자동 발급) |
| PUT | `/admin/ext-systems/{id}` | 수정 |
| DELETE | `/admin/ext-systems/{id}` | 삭제 |
| POST | `/admin/ext-systems/{id}/regenerate-key` | 인증키 재발급 (기존 즉시 무효화) |
| POST | `/admin/ext-systems/{id}/apis` | API 매핑 추가 |
| DELETE | `/admin/ext-systems/{id}/apis/{apiId}` | API 매핑 제거 |

### 4.6 모니터링 (호출 이력)
| Method | Path | 설명 |
|---|---|---|
| GET | `/admin/monitoring/history?from=&to=&extSystemId=&apiId=&statusCode=&ip=&page=&size=` | 검색 |
| GET | `/admin/monitoring/history/{id}` | 상세 (전체 파라미터, 응답 일부) |
| GET | `/admin/monitoring/stats?from=&to=&interval=hour` | 시간대별 통계 |

### 4.7 승인
| Method | Path | 설명 |
|---|---|---|
| GET | `/admin/approvals/api?status=PENDING` | API 사용 승인 목록 |
| POST | `/admin/approvals/api/{id}/approve` | 승인 |
| POST | `/admin/approvals/api/{id}/reject` | 반려 (사유 포함) |
| GET | `/admin/approvals/user?status=PENDING` | 회원가입 승인 목록 |
| POST | `/admin/approvals/user/{id}/approve` | 승인 |
| POST | `/admin/approvals/user/{id}/reject` | 반려 |

### 4.8 OpenAPI / 문서
| Method | Path | 설명 |
|---|---|---|
| GET | `/openapi.json` | OpenAPI 3 스펙 (전체) |
| GET | `/openapi/{group}.json` | 그룹별 스펙 |
| GET | `/docs/swagger-ui` | Swagger UI (관리자용) |
| GET | `/admin/docs/tree` | API 문서 트리 데이터 (커스텀 뷰어용) |

---

## 5. 외부 호출 게이트웨이 API

### 5.1 호출 패턴

```
{Method} https://api.donga.ac.kr/api/{path}
Headers:
  certification-key: {API Key}
  Content-Type: application/json (또는 application/x-www-form-urlencoded)
  Accept: application/json (또는 application/xml)
Body 또는 Query:
  파라미터 (#{param} 으로 SQL 에 바인딩)
```

### 5.2 메서드별 동작

| HTTP | 등록 SQL | 응답 |
|---|---|---|
| GET | SELECT | result 배열 + count |
| POST | INSERT / CALL | 영향받은 행 수 또는 OUT 파라미터 |
| PUT | UPDATE | 영향받은 행 수 |
| DELETE | DELETE | 영향받은 행 수 |

### 5.3 검증 실패 응답

| HTTP | errorCode | 설명 |
|---|---|---|
| 401 | `AUTH_KEY_MISSING` | certification-key 헤더 없음 |
| 401 | `AUTH_KEY_INVALID` | 키 미등록 또는 위변조 |
| 403 | `IP_NOT_ALLOWED` | 허용 IP 아님 |
| 403 | `KEY_EXPIRED` | 사용기간 외 |
| 403 | `API_NOT_MAPPED` | 해당 연계시스템에 API 미매핑 |
| 404 | `API_NOT_FOUND` | 등록되지 않은 요청경로 |
| 405 | `METHOD_NOT_ALLOWED` | HTTP 메서드 불일치 |
| 408 | `QUERY_TIMEOUT` | 쿼리 타임아웃 초과 |
| 500 | `EXECUTION_ERROR` | DB 실행 오류 (상세 미노출) |

### 5.4 샘플 게이트웨이 (Mockup 시연용)

> Phase 1 Mockup 단계에서 동작시킬 5개 샘플. 자세한 데이터는 [07 Mockup 개발 계획](07_Mockup_개발_계획.md) §5 참조.

| API번호 | 메서드 | 요청경로 | 설명 |
|---|---|---|---|
| A20260508001 | GET | `/api/sample-user-info` | 사용자 정보 조회 (id 파라미터) |
| A20260508002 | GET | `/api/sample-grade-list` | 성적 목록 조회 (학번 파라미터) |
| A20260508003 | POST | `/api/sample-grade-save` | 성적 저장 |
| A20260508004 | GET | `/api/sample-dept-tree` | 부서 트리 조회 |
| A20260508005 | POST | `/api/sample-notification-send` | 알림 발송 |

각각 cert-key·IP 검증을 흉내내고, 응답 시간·이력을 메모리에 적재하여 모니터링 화면에 즉시 표시.

---

## 6. 운영 엔드포인트 (Spring Actuator)

| Path | 설명 | 접근 |
|---|---|---|
| `/actuator/health/liveness` | 프로세스 생존 | K8s liveness probe |
| `/actuator/health/readiness` | MetaDB + Redis 연결 확인 | K8s readiness probe |
| `/actuator/prometheus` | Prometheus 메트릭 | 사내 Prometheus scrape |
| `/actuator/info` | 빌드 정보 (git-sha, version) | 내부 |
| `/actuator/loggers` | 로그 레벨 조회/변경 | admin |

---

## 7. 에러 코드 표 (관리자 콘솔)

| 코드 | HTTP | 설명 |
|---|---|---|
| `VALIDATION_FAILED` | 400 | 요청 파라미터 검증 실패 |
| `AUTH_FAILED` | 401 | 로그인 실패 또는 토큰 만료 |
| `FORBIDDEN` | 403 | 권한 없음 |
| `NOT_FOUND` | 404 | 리소스 없음 |
| `DUPLICATE_PATH` | 409 | 요청경로 중복 |
| `DUPLICATE_USER_ID` | 409 | ID 중복 |
| `RESOURCE_IN_USE` | 409 | 사용 중인 리소스(데이터소스 등) 삭제 시도 |
| `SQL_VALIDATION_FAILED` | 400 | EXPLAIN PLAN 실패 |
| `INTERNAL_ERROR` | 500 | 서버 내부 오류 |

---

## 8. Rate Limit / 제한

| 대상 | 제한 |
|---|---|
| 외부 호출 게이트웨이 | 인증키당 100 RPS (default), Ingress + Filter 이중 |
| 관리자 콘솔 로그인 | IP 당 5회/분 |
| API 등록 | admin 당 10건/시 (남용 방지) |

---

## 9. 페이징 / 정렬 컨벤션

```
GET /admin/apis?page=0&size=20&sort=registeredAt,desc
Response:
{
  "data": {
    "content": [...],
    "page": 0,
    "size": 20,
    "totalElements": 152,
    "totalPages": 8
  }
}
```

---

## 10. 버전 관리

- 본 PRD 의 API 는 **v1** 으로 간주.
- 향후 호환성 깨지는 변경은 `/admin/v2/...` 로 분리.
- 외부 게이트웨이는 버전 분리하지 않음 (요청경로가 곧 식별자).

---

**다음 문서**: [06 데이터 모델 설계서](06_데이터_모델_설계서.md)
