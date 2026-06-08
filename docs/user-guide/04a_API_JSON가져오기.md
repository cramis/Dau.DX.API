> API 관리 화면의 "JSON 가져오기"(일괄 등록/수정) 사용 가이드. envelope 구조·필드·허용값·upsert·검증 흐름과 복사해 쓰는 샘플 5종. 개발자·AI 에이전트가 바로 유효한 JSON을 만들어 등록하도록 돕는다.

# 04a. API JSON 가져오기 (일괄 등록·수정)

[← 목차로](README.md) · [04. API 관리](04_API관리.md)

> 외부 개발자·AI에게 "게이트웨이 등록용 JSON만 만들면 된다"를 전달할 자기완결 규격서는 → [04b. API 정의 JSON 작성 가이드(외부 배포용)](04b_API정의_JSON_작성가이드.md).

---

## 이 기능은 무엇

API 관리 화면(`/api-list`)에서 **JSON 한 덩어리로 여러 API를 한 번에 등록·수정**하는 기능이다. 5단계 마법사가 "한 건씩 손으로" 만드는 방식이라면, JSON 가져오기는 "여러 건을 파일로" 올리는 방식이다.

| 방식                                                     | 적합한 때                                                      |
| -------------------------------------------------------- | -------------------------------------------------------------- |
| [5단계 마법사](04_API관리.md#신규-api-등록-5단계-마법사) | 한두 건을 화면에서 직접 만들 때                                |
| **JSON 가져오기**(이 문서)                               | 여러 건을 한꺼번에, 또는 다른 환경에서 만든 API 정의를 옮길 때 |

핵심 성질 세 가지.

- **upsert** — 한 JSON 안에서 신규 등록과 기존 수정을 섞을 수 있다(`no` 필드 유무로 구분).
- **검증 우선·전부 아니면 전무(all-or-nothing)** — 한 건이라도 검증에 실패하면 **아무것도 저장되지 않는다**. 부분 저장은 없다.
- **dry-run(미리보기)** — 실제 저장 전에 "이렇게 들어간다"를 먼저 확인할 수 있다.

> 권한: 관리자(ADMIN)만 사용한다. (AI 서비스계정은 이 일괄 import 대신 MCP 도구로 한 건씩 DRAFT를 등록한다 — 아래 [AI 에이전트용](#ai-에이전트용-작성-팁) 참고.)

---

## 사용 흐름 (화면)

1. `/api-list` 우상단 **JSON 가져오기** 버튼 → 입력 창이 열린다.
2. **템플릿 내려받기**로 예시 JSON(`apis-template.json`)을 받아 형태를 잡는다(선택).
3. JSON을 작성/붙여넣는다.
4. **[검증]** — 실제 저장 없이 점검만 한다(dry-run). 행별로 신규/수정/실패가 표로 나온다.
5. 결과가 모두 통과(실패 0건)면 **[적용]** — 실제로 저장된다.
6. 저장 후 목록이 새로고침된다.

> 검증을 통과하지 못한 행이 하나라도 있으면 [적용]을 눌러도 저장되지 않는다. 먼저 모든 행을 통과시킨다.

---

## JSON 구조 한눈에

최상위는 **envelope**(봉투), 그 안의 `items` 배열에 API를 하나씩 담는다.

```jsonc
{
  "version": 1, // 고정값 1 (필수)
  "kind": "api", // 고정값 "api" (필수)
  "items": [
    // API 목록 (필수, 최소 1개)
    {
      /* API 1건 */
    },
    {
      /* API 1건 */
    },
  ],
}
```

### items[] — API 한 건의 필드

| 필드           | 타입    | 필수     | 기본값  | 설명                                                                                                                                      |
| -------------- | ------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `no`           | string  | 선택     | —       | **있으면 수정, 없으면 신규**. 신규는 서버가 `A+YYYYMMDD+3자리`로 자동 채번(예 `A20260608001`)                                             |
| `name`         | string  | **필수** | —       | API 이름. 1~100자                                                                                                                         |
| `group`        | string  | **필수** | —       | 그룹 코드(분류). 1~50자 (예 `USER`, `GRADE`)                                                                                              |
| `method`       | string  | **필수** | —       | `GET` · `POST` · `PUT` · `DELETE` 중 하나                                                                                                 |
| `path`         | string  | **필수** | —       | 호출 경로. **전역 유니크**. 영소문자로 시작, 영소문자·숫자·하이픈만 1~64자(`^[a-z][a-z0-9-]{0,63}$`). 슬래시 없음 (예 `sample-user-info`) |
| `dataSrcId`    | string  | **필수** | —       | SQL을 실행할 데이터소스 ID. **이미 등록된 것**이어야 한다([05. 데이터소스](05_데이터소스.md))                                             |
| `sql`          | string  | **필수** | —       | 실행할 SQL. 파라미터는 `#{이름}`으로 바인딩. SQL 안전 정책 통과 필요(아래)                                                                |
| `status`       | string  | 선택     | `DRAFT` | `DRAFT` · `ACTIVE` · `INACTIVE` 중 하나. DRAFT는 외부 호출 차단(검토 상태)                                                                |
| `authRequired` | boolean | 선택     | `true`  | 호출 시 인증키 필요 여부                                                                                                                  |
| `docVisible`   | boolean | 선택     | `true`  | 공개 문서(`/docs`) 노출 여부                                                                                                              |
| `desc`         | string  | 선택     | —       | 설명                                                                                                                                      |
| `params`       | 배열    | 선택     | —       | 입력 파라미터(아래). `#{...}` 와 1:1로 맞춘다                                                                                             |
| `resps`        | 배열    | 선택     | —       | 응답 컬럼(아래). **1개 이상 권장**(응답 형태 정의)                                                                                        |

### params[] — 입력 파라미터

| 필드           | 타입    | 필수     | 기본값  | 설명                                             |
| -------------- | ------- | -------- | ------- | ------------------------------------------------ |
| `name`         | string  | **필수** | —       | 파라미터 이름. SQL의 `#{이름}` 과 동일해야 한다  |
| `type`         | string  | **필수** | —       | `string` · `number` · `date` · `boolean` 중 하나 |
| `required`     | boolean | 선택     | `false` | 호출 시 필수 여부                                |
| `defaultValue` | string  | 선택     | —       | 미입력 시 사용할 값                              |
| `desc`         | string  | 선택     | —       | 설명                                             |
| `maskRule`     | string  | 선택     | `none`  | 호출 이력에 남길 때 가릴 규칙(아래 7종)          |

### resps[] — 응답 컬럼

| 필드          | 타입   | 필수     | 기본값 | 설명                              |
| ------------- | ------ | -------- | ------ | --------------------------------- |
| `col`         | string | **필수** | —      | SQL 결과의 컬럼명                 |
| `type`        | string | **필수** | —      | 컬럼 타입(예 `VARCHAR`, `NUMBER`) |
| `displayName` | string | 선택     | —      | 화면 표시명                       |
| `maskRule`    | string | 선택     | `none` | 응답에서 가릴 규칙(아래 7종)      |

### 마스킹 규칙(maskRule) 7종

`none`(없음) · `name`(이름) · `phone`(전화) · `email`(이메일) · `rrn`(주민번호) · `card`(카드) · `addr`(주소).

개인정보(PII) 컬럼·파라미터에 지정하면 **응답과 호출 이력 양쪽에서 자동으로 가려진다**. 이름·전화·이메일·주민번호·카드·주소 컬럼이 있으면 반드시 지정한다.

---

## upsert — 신규와 수정 구분

| `no` 필드                | 동작                                                                       |
| ------------------------ | -------------------------------------------------------------------------- |
| 없음                     | **신규 등록**. 서버가 새 번호 채번                                         |
| 있고, 기존 API와 일치    | **수정**. 해당 API를 이 내용으로 통째 교체(파라미터·응답 포함 전체 재적재) |
| 있으나, 기존에 없는 번호 | **신규로 처리**되며 서버가 **새 번호를 채번**한다(보낸 `no`는 무시)        |

> 수정은 부분 수정이 아니라 **전체 교체**다. 바꾸지 않을 필드도 모두 포함해야 한다. 가장 안전한 방법은 **JSON 내보내기로 현재 정의를 받아 → 필요한 부분만 고쳐 → 다시 가져오기**(round-trip)다.

---

## 검증 규칙 (자주 막히는 것)

[적용] 전에 [검증]에서 아래를 점검한다. 하나라도 걸리면 그 행은 실패로 표시되고, 실패가 하나라도 있으면 전체가 저장되지 않는다.

- **필수 누락** — `name` · `group` · `path` · `sql` 중 빈 값 → `INVALID_INPUT` ("… 필수").
- **path 중복** — 같은 JSON 안에서 중복(`payload 내 path 중복`)되거나, 이미 등록된 API와 겹치면 → `PATH_EXISTS`.
- **없는 데이터소스** — `dataSrcId`가 등록돼 있지 않으면 → `INVALID_INPUT` ("미존재 dataSrcId: …"). 데이터소스를 먼저 등록한다.
- **허용값 위반** — `method` · `status` · 파라미터 `type` · `maskRule` 가 허용 목록 밖이면 → `INVALID_INPUT`.
- **SQL 안전 정책** — `GET`은 읽기 전용(SELECT)만 허용. `POST/PUT`은 쓰기 허용. **DELETE·DDL(CREATE/DROP/ALTER 등)·다중문은 메서드와 무관하게 항상 거부** → `INVALID_INPUT` ("SQL: …").

---

## 결과 리포트 읽는 법

[검증]·[적용] 모두 같은 형태의 리포트를 돌려준다.

```jsonc
{
  "ok": true, // 실패 0건일 때만 true
  "dryRun": true, // 검증(true) / 적용(false)
  "summary": { "inserted": 1, "updated": 1, "failed": 0, "total": 2 },
  "results": [
    { "index": 0, "no": "A20260608001", "action": "inserted", "ok": true },
    { "index": 1, "no": "A20260509001", "action": "updated", "ok": true },
    // 실패 예:
    {
      "index": 2,
      "no": null,
      "ok": false,
      "error": "PATH_EXISTS",
      "detail": "...",
    },
  ],
}
```

- `index` — `items` 배열에서 몇 번째 행인지(0부터).
- `action` — `inserted`(신규) / `updated`(수정). 신규의 `no`에는 채번된 새 번호가 들어온다.
- `error` / `detail` — 실패한 행의 사유. `detail`을 보고 해당 행을 고친다.

---

## 샘플 (복사해서 쓰기)

> 아래 `dataSrcId`는 데모 시드 기준(`DS20260509001` = DAU-CORE-PROD 등)이다. 실제로는 본인 환경에 등록된 데이터소스 ID로 바꾼다.

### 1) 가장 단순한 신규 1건

```json
{
  "version": 1,
  "kind": "api",
  "items": [
    {
      "name": "사용자 정보 조회",
      "group": "USER",
      "method": "GET",
      "path": "user-info",
      "dataSrcId": "DS20260509001",
      "sql": "SELECT user_id, user_nm, dept_nm FROM v_user WHERE user_id = #{id}",
      "params": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": "사용자 ID"
        }
      ],
      "resps": [
        {
          "col": "user_id",
          "type": "VARCHAR",
          "displayName": "사용자ID",
          "maskRule": "none"
        },
        {
          "col": "user_nm",
          "type": "VARCHAR",
          "displayName": "사용자명",
          "maskRule": "name"
        },
        {
          "col": "dept_nm",
          "type": "VARCHAR",
          "displayName": "부서명",
          "maskRule": "none"
        }
      ]
    }
  ]
}
```

`status`·`authRequired`·`docVisible`를 생략했으므로 각각 `DRAFT`·`true`·`true`로 들어간다. 등록 후 외부 호출이 되게 하려면 `status`를 `ACTIVE`로 바꾼다.

### 2) 여러 건 + 개인정보 마스킹

```json
{
  "version": 1,
  "kind": "api",
  "items": [
    {
      "name": "성적 목록 조회",
      "group": "GRADE",
      "method": "GET",
      "path": "grade-list",
      "status": "ACTIVE",
      "dataSrcId": "DS20260509001",
      "sql": "SELECT subject, grade, semester FROM v_grade WHERE user_id = #{id}",
      "params": [{ "name": "id", "type": "string", "required": true }],
      "resps": [
        { "col": "subject", "type": "VARCHAR", "displayName": "과목" },
        { "col": "grade", "type": "VARCHAR", "displayName": "성적" },
        { "col": "semester", "type": "VARCHAR", "displayName": "학기" }
      ]
    },
    {
      "name": "연락처 조회",
      "group": "USER",
      "method": "GET",
      "path": "user-contact",
      "status": "ACTIVE",
      "dataSrcId": "DS20260509001",
      "sql": "SELECT user_nm, hp_no, email FROM v_user WHERE user_id = #{id}",
      "params": [{ "name": "id", "type": "string", "required": true }],
      "resps": [
        {
          "col": "user_nm",
          "type": "VARCHAR",
          "displayName": "이름",
          "maskRule": "name"
        },
        {
          "col": "hp_no",
          "type": "VARCHAR",
          "displayName": "휴대폰",
          "maskRule": "phone"
        },
        {
          "col": "email",
          "type": "VARCHAR",
          "displayName": "이메일",
          "maskRule": "email"
        }
      ]
    }
  ]
}
```

### 3) 기존 API 수정 (`no` 지정)

```json
{
  "version": 1,
  "kind": "api",
  "items": [
    {
      "no": "A20260509001",
      "name": "사용자 정보 조회",
      "group": "USER",
      "method": "GET",
      "path": "sample-user-info",
      "status": "ACTIVE",
      "dataSrcId": "DS20260509001",
      "authRequired": true,
      "docVisible": true,
      "sql": "SELECT user_id, user_nm, dept_nm, dept_cd FROM v_user WHERE user_id = #{id}",
      "params": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "desc": "사용자 ID"
        }
      ],
      "resps": [
        {
          "col": "user_id",
          "type": "VARCHAR",
          "displayName": "사용자ID",
          "maskRule": "none"
        },
        {
          "col": "user_nm",
          "type": "VARCHAR",
          "displayName": "사용자명",
          "maskRule": "name"
        },
        {
          "col": "dept_nm",
          "type": "VARCHAR",
          "displayName": "부서명",
          "maskRule": "none"
        },
        {
          "col": "dept_cd",
          "type": "VARCHAR",
          "displayName": "부서코드",
          "maskRule": "none"
        }
      ]
    }
  ]
}
```

> 수정은 전체 교체다. 위 예처럼 기존 정의를 그대로 두고 **바꿀 부분(여기서는 `dept_cd` 응답 추가)만** 반영한 전체 JSON을 보낸다.

### 4) 쓰기 API (POST)

```json
{
  "version": 1,
  "kind": "api",
  "items": [
    {
      "name": "성적 저장",
      "group": "GRADE",
      "method": "POST",
      "path": "grade-save",
      "status": "DRAFT",
      "dataSrcId": "DS20260509001",
      "sql": "INSERT INTO grade (user_id, subject, grade) VALUES (#{id}, #{subject}, #{grade})",
      "params": [
        { "name": "id", "type": "string", "required": true },
        { "name": "subject", "type": "string", "required": true },
        { "name": "grade", "type": "string", "required": true }
      ],
      "resps": [{ "col": "saved", "type": "NUMBER", "displayName": "저장건수" }]
    }
  ]
}
```

> 쓰기 SQL은 외부에 그대로 열리면 위험하므로 `DRAFT`로 등록하고, 마법사 4단계의 [테스트 실행](04_API관리.md#4단계--테스트-실행)으로 동작을 확인한 뒤 `ACTIVE`로 승인하는 흐름을 권장한다.

### 5) 최소 필드만 (params/resps 생략)

```json
{
  "version": 1,
  "kind": "api",
  "items": [
    {
      "name": "부서 트리 조회",
      "group": "DEPT",
      "method": "GET",
      "path": "dept-tree",
      "dataSrcId": "DS20260509001",
      "sql": "SELECT id, name, parent_id FROM v_dept"
    }
  ]
}
```

파라미터가 없는 SQL이면 `params`를 생략해도 된다. 다만 응답 형태를 명확히 하려면 `resps`는 채우는 것이 좋다.

---

## AI 에이전트용 작성 팁

이 가이드의 JSON 구조는 AI 에이전트가 API 정의를 생성·검토할 때도 그대로 쓴다. 다만 **등록 경로가 다르다**.

- **관리자**는 화면의 JSON 가져오기(이 문서)로 일괄 등록한다.
- **AI 서비스계정(`ai-mcp01`)**은 MCP 도구로 **한 건씩 DRAFT만** 등록한다(`draft_api`). 활성화(ACTIVE)는 사람만 한다. → [`mcp/README.md`](../../mcp/README.md), [`product/02_AI초안등록_PRD.md`](../product/02_AI초안등록_PRD.md).

AI가 유효한 정의를 만들기 위한 순서.

1. `list_datasources`로 쓸 `dataSrcId`를 고른다(없는 ID를 쓰면 `INVALID_INPUT`).
2. `get_schema`로 테이블·컬럼·코멘트를 확인하고 SQL을 작성한다(`#{param}` 바인딩).
3. `validate_sql`로 SQL 안전 정책을 통과시킨다(GET=읽기 전용, DELETE·DDL·다중문 금지).
4. `check_path`로 `path` 중복을 피한다(영소문자 시작, 영소문자·숫자·하이픈 1~64자).
5. 응답 컬럼 중 개인정보가 있으면 `maskRule`을 지정한다.

> 일괄 JSON을 AI가 만들 때도 동일 규칙을 따른다. 만든 뒤에는 반드시 **[검증](dry-run)**으로 행별 결과를 확인하고, 실패 `detail`을 보고 고친 다음 [적용]한다.

---

## (참고) API로 직접 호출

화면 대신 API로 보낼 수도 있다. 관리자 인증이 필요하다.

```
POST /api/apis/import?dryRun=1   # 검증만 (저장 안 함)
POST /api/apis/import?dryRun=0   # 실제 적용
Content-Type: application/json
Body: { "version": 1, "kind": "api", "items": [ ... ] }
```

`dryRun=1`이면 검증만, 그 외 값(`0` 등)이면 적용이다. 응답은 위 [결과 리포트](#결과-리포트-읽는-법)와 동일하다.

---

## 에러코드

| 코드             | 뜻                                                                | 대처                               |
| ---------------- | ----------------------------------------------------------------- | ---------------------------------- |
| `INVALID_INPUT`  | envelope 형식·필수 누락·허용값 위반·없는 데이터소스·SQL 정책 위반 | `detail` 메시지대로 해당 행 수정   |
| `PATH_EXISTS`    | `path` 가 기존 API 또는 같은 JSON 안에서 중복                     | `path`를 유니크하게 변경           |
| `NOT_FOUND`      | (수정 시) 지정한 `no` 의 API 없음                                 | 신규로 등록하거나 올바른 `no` 사용 |
| `INTERNAL_ERROR` | 적용 중 서버 오류(전체 롤백됨)                                    | 재시도, 지속 시 로그 확인          |

---

## 관련 문서

- [04. API 관리](04_API관리.md) — 한 건씩 만드는 5단계 마법사, 수정·삭제, AI 초안 승인 체크리스트
- [05. 데이터소스](05_데이터소스.md) — `dataSrcId`로 가리키는 DB 연결 등록
- [11. 외부 API 호출 가이드](11_외부_API호출_가이드.md) — 등록한 API를 실제로 호출
