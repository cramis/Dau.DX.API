> 외부 연계 개발자를 위한 게이트웨이 호출 가이드. 엔드포인트와 X-Cert-Key 헤더, 서버의 검증 순서, 요청·응답 형식, 에러코드표, GET/POST curl 예시, 레이트리밋을 정리한다.

# 11. 외부 API 호출 가이드

[← 목차로](README.md) · 대상: 외부 연계 개발자

---

## 호출 준비물

| 필요한 것 | 받는 곳 |
|---|---|
| 인증키(평문) | 관리자가 [연계시스템](06_연계시스템.md) 등록 시 1회 발급·전달 |
| 호출할 API 경로·파라미터 | [공개 API 문서](10_API문서_공개페이지.md) `/docs` |
| 허용된 출발지 IP·이용 기간 | 관리자가 연계시스템에 설정 |

## 엔드포인트

```
GET  /api/sample/{API경로}        # 입력값은 쿼리스트링
POST /api/sample/{API경로}        # 입력값은 JSON 본문
```

- `{API경로}` = 관리자가 등록한 경로(예 `sample-user-info`).
- 기본 주소(개발) `http://localhost:8080`. 운영 도메인은 별도 안내.

## 인증 헤더

```
X-Cert-Key: <발급받은_인증키>
```

- 헤더 이름은 정확히 **`X-Cert-Key`** 다.
- 값은 받은 키 전체를 그대로 넣는다(앞뒤 가공 금지).
- 인증이 필요 없는 공개 API는 헤더 없이 호출할 수 있다(관리자 설정에 따름).

출발지 IP는 `X-Forwarded-For` → `X-Real-IP` → 접속 주소 순으로 판별된다. 프록시 뒤에 있다면 `X-Forwarded-For` 가 올바로 전달되는지 확인한다.

## 요청 예시

**GET** — 쿼리스트링으로 파라미터 전달.

```bash
curl -H 'X-Cert-Key: AKAD0001-XXXXXXXX-XXXXXXXX-XXXXXXXX' \
  'http://localhost:8080/api/sample/sample-user-info?id=user01'
```

**POST** — JSON 본문으로 전달.

```bash
curl -X POST \
  -H 'X-Cert-Key: AKAD0001-XXXXXXXX-XXXXXXXX-XXXXXXXX' \
  -H 'Content-Type: application/json' \
  -d '{"id":"user01","year":"2026"}' \
  'http://localhost:8080/api/sample/sample-grade-list'
```

## 서버 처리 순서

호출이 들어오면 아래 순서로 검증한 뒤 SQL을 실행한다. 어느 단계든 실패하면 그 지점의 에러로 즉시 응답한다.

```
1. 라우팅      경로+메서드로 API 탐색      → 없으면 API_NOT_FOUND
2. 활성        API 상태 ACTIVE 여부        → 아니면 API_NOT_ACTIVE
   (인증 필요 API면 3~7 진행)
3. 인증키      X-Cert-Key 해시 일치        → 없거나 불일치 INVALID_CERT_KEY
4. 활성 시스템 연계시스템 ACTIVE 여부       → 아니면 EXT_SYSTEM_INACTIVE
5. IP          출발지 IP 허용 목록(CIDR)   → 아니면 IP_NOT_ALLOWED
6. 기간        이용 기간 내                → 아니면 OUT_OF_PERIOD
7. 매핑        이 API가 매핑됐는지         → 아니면 API_NOT_MAPPED
8. 레이트리밋  분당 한도 이내              → 초과 RATE_LIMITED
9. 필수 파라미터 누락 없는지               → 누락 MISSING_PARAM
10. SQL 실행 + 응답 마스킹                 → 내부 오류 INTERNAL_ERROR
```

## 응답 형식

응답 본문은 항상 동일한 봉투를 쓴다(값이 없는 필드는 생략됨).

```jsonc
// 성공 (HTTP 200)
{
  "ok": true,
  "data": [ { "컬럼": "값", "...": "..." } ],
  "traceId": "<추적 식별자>"
}

// 실패 (HTTP 4xx/5xx)
{
  "ok": false,
  "code": "<에러코드>",
  "detail": "<부가 설명, 없을 수 있음>",
  "traceId": "<추적 식별자>"
}
```

| 필드 | 설명 |
|---|---|
| `ok` | 성공 여부 |
| `data` | 결과 행 배열(성공 시) |
| `code` | 에러코드 이름(실패 시) |
| `detail` | 부가 설명(예 IP 차단 시 `client ip ...`, 파라미터 누락 시 누락 이름) |
| `traceId` | 호출 추적 번호. 문제 문의 시 이 값을 함께 전달하면 관리자가 정확히 그 호출을 찾는다 |

> 응답 데이터의 개인정보(이름·전화·이메일·주민번호·카드·주소 등)는 API에 지정된 마스킹 규칙에 따라 가려진 채 내려갈 수 있다.

## 에러코드표

| 코드 | HTTP | 의미 | 대처 |
|---|---|---|---|
| `INVALID_CERT_KEY` | 401 | 인증키 없음·틀림·미등록 | X-Cert-Key 확인, 분실 시 재발급 요청 |
| `EXT_SYSTEM_INACTIVE` | 403 | 연계시스템이 비활성 | 관리자에게 활성화 요청 |
| `IP_NOT_ALLOWED` | 403 | 출발지 IP 미허용 | 관리자에게 IP 추가 요청 |
| `OUT_OF_PERIOD` | 403 | 이용 기간 아님 | 관리자에게 기간 연장 요청 |
| `API_NOT_MAPPED` | 403 | 이 API가 매핑 안 됨 | 관리자에게 매핑(또는 사용 신청) 요청 |
| `API_NOT_FOUND` | 404 | 경로 미등록 | 경로 철자·문서 확인 |
| `API_NOT_ACTIVE` | 403 | API가 DRAFT/INACTIVE | 관리자에게 활성화 요청 |
| `MISSING_PARAM` | 400 | 필수 파라미터 누락 | `detail` 의 누락 이름 채워 재요청 |
| `RATE_LIMITED` | 429 | 분당 호출 한도 초과 | 호출 빈도 줄이거나 한도 상향 요청 |
| `INTERNAL_ERROR` | 500 | 서버 내부 오류 | 잠시 후 재시도, 지속 시 `traceId` 와 함께 문의 |

## 레이트리밋

분당 호출 한도가 있다. 연계시스템별로 별도 설정이 없으면 전역 기본값(분당 600회)이 적용된다. 초과하면 SQL 실행 전에 `429 RATE_LIMITED` 로 차단된다.

---

## 관련 문서

- [10. API 문서 공개 페이지](10_API문서_공개페이지.md) — 호출할 API 찾기
- [06. 연계시스템](06_연계시스템.md) — 인증키·IP·기간·매핑(관리자)
- [08. 모니터링](08_모니터링.md) — 관리자는 여기서 호출을 확인
