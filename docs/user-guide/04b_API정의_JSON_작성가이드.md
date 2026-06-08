> 외부 배포용. Dau.DX.API 게이트웨이에 API를 등록하기 위한 "API 정의 JSON" 작성 규격서. 게이트웨이 내부를 분석할 필요 없이, 이 문서 하나로 유효한 JSON 파일을 만들어 전달하면 된다. 필드·허용값·규칙·복사용 샘플 포함.

# Dau.DX.API 게이트웨이 — API 등록용 JSON 작성 가이드 (외부 배포용)

> ## 🎯 이 문서의 목적 (먼저 읽기)
>
> **당신의 할 일은 단 하나 — API를 등록할 JSON 파일 한 개를 만드는 것이다.**
>
> - 이 JSON은 **Dau.DX.API 게이트웨이**라는 별도 시스템에 "이런 API를 만들어 달라"고 전달하기 위한 **주문서**다.
> - 게이트웨이의 소스 코드나 내부 구조를 **분석할 필요가 전혀 없다.** 이 문서에 적힌 형식만 따르면 된다.
> - 산출물은 **`.json` 파일 하나**다. 그 이상도 이하도 아니다.
>
> AI 에이전트라면: 이 작업은 "외부 게이트웨이에 등록할 API 정의서(JSON)를 생성"하는 것이다. 어떤 코드베이스도 열거나 역공학하지 말 것. 아래 규격대로 JSON 텍스트만 출력하면 된다.

---

## 1. 배경 — 이게 뭐 하는 물건인가

Dau.DX.API는 **내부 데이터베이스의 데이터를 표준 REST API로 노출해 주는 게이트웨이**다. 코드를 짜지 않고, **"어떤 SQL을 어떤 경로로 노출할지"를 JSON으로 기술**해 등록하면 API가 만들어진다.

그래서 당신이 만들 JSON은 결국 이 질문들에 답하는 문서다.

- 이 API의 **이름과 호출 경로**는?
- 어떤 **데이터베이스(데이터소스)** 에서?
- 어떤 **SQL** 을 실행해서?
- 어떤 **입력 파라미터**를 받고, 어떤 **응답 컬럼**을 돌려줄지?
- 개인정보가 있으면 어떻게 **가릴지(마스킹)**?

만든 JSON 파일은 게이트웨이 **관리자에게 전달**한다. 관리자가 관리 콘솔의 "JSON 가져오기"로 등록한다(당신이 직접 등록 권한을 가진 경우는 [6. 전달·등록](#6-전달등록) 참고).

---

## 2. JSON 전체 모양

최상위는 **봉투(envelope)**, 그 안 `items` 배열에 API를 하나씩 담는다. 한 파일에 여러 API를 넣을 수 있다.

```jsonc
{
  "version": 1, // 고정값 1
  "kind": "api", // 고정값 "api"
  "items": [
    {
      /* API 1건 */
    },
    {
      /* API 1건 */
    },
  ],
}
```

---

## 3. 필드 규격

### 3.1 API 한 건 (`items[]`)

| 필드           | 타입    | 필수     | 기본값  | 설명                                                                                                                              |
| -------------- | ------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `name`         | string  | **필수** | —       | API 이름. 1~100자                                                                                                                 |
| `group`        | string  | **필수** | —       | 분류 그룹 코드. 1~50자 (예 `USER`, `GRADE`)                                                                                       |
| `method`       | string  | **필수** | —       | `GET` · `POST` · `PUT` · `DELETE` 중 하나                                                                                         |
| `path`         | string  | **필수** | —       | 호출 경로. **다른 API와 겹치면 안 된다(유니크)**. 영소문자로 시작, 영소문자·숫자·하이픈만 1~64자. 슬래시 없음 (예 `student-info`) |
| `dataSrcId`    | string  | **필수** | —       | SQL을 실행할 데이터소스 ID. **게이트웨이에 이미 등록된 것**이어야 한다(값은 관리자에게 받는다)                                    |
| `sql`          | string  | **필수** | —       | 실행할 SQL. 입력값은 `#{이름}` 으로 표기. 안전 규칙 통과 필요([5. SQL 규칙](#5-sql-규칙))                                         |
| `status`       | string  | 선택     | `DRAFT` | `DRAFT`(검토·비공개) · `ACTIVE`(운영·호출 가능) · `INACTIVE`(중지)                                                                |
| `authRequired` | boolean | 선택     | `true`  | 호출 시 인증키 필요 여부                                                                                                          |
| `docVisible`   | boolean | 선택     | `true`  | 공개 API 문서에 노출 여부                                                                                                         |
| `desc`         | string  | 선택     | —       | 설명                                                                                                                              |
| `params`       | 배열    | 선택     | —       | 입력 파라미터 목록([3.2](#32-입력-파라미터-params))                                                                               |
| `resps`        | 배열    | 선택     | —       | 응답 컬럼 목록([3.3](#33-응답-컬럼-resps)). 1개 이상 권장                                                                         |

> `no` 라는 식별자 필드는 **새 API를 만들 때는 넣지 않는다.** 번호는 게이트웨이가 자동으로 매긴다. (기존 API를 고치는 경우에만 쓰며, 그 번호는 관리자/내보내기로 확인한다.)

### 3.2 입력 파라미터 (`params[]`)

| 필드           | 타입    | 필수     | 기본값  | 설명                                                 |
| -------------- | ------- | -------- | ------- | ---------------------------------------------------- |
| `name`         | string  | **필수** | —       | 파라미터 이름. SQL의 `#{이름}` 과 정확히 같아야 한다 |
| `type`         | string  | **필수** | —       | `string` · `number` · `date` · `boolean` 중 하나     |
| `required`     | boolean | 선택     | `false` | 호출 시 반드시 필요한지                              |
| `defaultValue` | string  | 선택     | —       | 미입력 시 사용할 기본값                              |
| `desc`         | string  | 선택     | —       | 설명                                                 |
| `maskRule`     | string  | 선택     | `none`  | 호출 기록에 남길 때 가릴 규칙([4](#4-마스킹-규칙))   |

### 3.3 응답 컬럼 (`resps[]`)

| 필드          | 타입   | 필수     | 기본값 | 설명                                    |
| ------------- | ------ | -------- | ------ | --------------------------------------- |
| `col`         | string | **필수** | —      | SQL 결과의 컬럼명                       |
| `type`        | string | **필수** | —      | 컬럼 타입(예 `VARCHAR`, `NUMBER`)       |
| `displayName` | string | 선택     | —      | 표시용 이름                             |
| `maskRule`    | string | 선택     | `none` | 응답에서 가릴 규칙([4](#4-마스킹-규칙)) |

---

## 4. 마스킹 규칙

개인정보(PII)를 자동으로 가리는 규칙이다. 응답과 호출 기록 양쪽에 적용된다.

| 값      | 뜻                |
| ------- | ----------------- |
| `none`  | 가리지 않음(기본) |
| `name`  | 이름              |
| `phone` | 전화번호          |
| `email` | 이메일            |
| `rrn`   | 주민등록번호      |
| `card`  | 카드번호          |
| `addr`  | 주소              |

> 이름·전화·이메일·주민번호·카드·주소가 응답에 포함되면 **반드시 알맞은 마스킹을 지정한다.** 개인정보 보호의 핵심 단계다.

---

## 5. SQL 규칙

- 입력값은 문자열 이어붙이기가 아니라 **`#{파라미터이름}`** 으로 바인딩한다. (예: `... WHERE student_id = #{id}`)
- `#{...}` 에 쓴 이름은 `params` 의 `name` 과 1:1로 맞춘다.
- **`GET` 은 조회(SELECT)만** 가능하다.
- 쓰기(INSERT/UPDATE)는 `POST` 또는 `PUT` 으로 한다.
- **`DELETE`·DDL(CREATE/DROP/ALTER 등)·여러 문장(세미콜론으로 이어 붙인 다중문)은 메서드와 상관없이 항상 거부**된다.

---

## 6. 전달·등록

1. 위 규격대로 JSON 파일을 만든다(예: `my-apis.json`).
2. 게이트웨이 **관리자에게 파일을 전달**한다. 관리자가 관리 콘솔에서 "JSON 가져오기"로 등록한다.
3. 등록은 **검증을 먼저 거친다(미리보기)**. 한 건이라도 형식·규칙에 어긋나면 **아무것도 등록되지 않는다**(전부 아니면 전무). 사유가 함께 안내되니, 그에 맞춰 JSON을 고쳐 다시 전달한다.
4. 등록 직후 상태가 `DRAFT` 면 외부에서 아직 호출되지 않는다. 관리자가 내용을 확인하고 `ACTIVE` 로 바꿔야 실제로 열린다.

> 등록용 인터페이스에 직접 접근 권한을 받은 경우: 같은 JSON을 게이트웨이의 API 일괄 등록 엔드포인트로 보낼 수 있다(관리자 인증 필요). 자세한 방법과 결과 리포트 해석은 관리자에게 문의한다.

---

## 7. 자주 막히는 것 (등록이 거부되는 흔한 사유)

| 증상            | 원인                                                       | 해결                                    |
| --------------- | ---------------------------------------------------------- | --------------------------------------- |
| `path` 충돌     | 같은 파일 안에서 중복, 또는 이미 있는 API와 같은 경로      | `path` 를 고유하게 바꾼다               |
| 데이터소스 없음 | `dataSrcId` 가 게이트웨이에 등록돼 있지 않음               | 관리자에게 올바른 `dataSrcId` 를 받는다 |
| 필수 누락       | `name`·`group`·`path`·`sql` 중 빈 값                       | 빠진 필수 필드를 채운다                 |
| 허용값 위반     | `method`·`status`·파라미터 `type`·`maskRule` 가 목록 밖 값 | 위 규격의 허용값으로 맞춘다             |
| SQL 거부        | DELETE·DDL·다중문, 또는 GET인데 쓰기 SQL                   | 조회는 GET+SELECT, 쓰기는 POST/PUT으로  |

---

## 8. 복사해서 쓰는 샘플

> `dataSrcId` 는 예시값이다. **반드시 관리자에게 받은 실제 ID로 바꿔서** 사용한다.

### 8.1 가장 단순한 조회 API 한 건

```json
{
  "version": 1,
  "kind": "api",
  "items": [
    {
      "name": "학생 정보 조회",
      "group": "STUDENT",
      "method": "GET",
      "path": "student-info",
      "dataSrcId": "DS-EXAMPLE-001",
      "sql": "SELECT student_id, student_nm, dept_nm FROM v_student WHERE student_id = #{id}",
      "params": [
        { "name": "id", "type": "string", "required": true, "desc": "학번" }
      ],
      "resps": [
        {
          "col": "student_id",
          "type": "VARCHAR",
          "displayName": "학번",
          "maskRule": "none"
        },
        {
          "col": "student_nm",
          "type": "VARCHAR",
          "displayName": "이름",
          "maskRule": "name"
        },
        {
          "col": "dept_nm",
          "type": "VARCHAR",
          "displayName": "학과",
          "maskRule": "none"
        }
      ]
    }
  ]
}
```

### 8.2 개인정보 마스킹 포함

```json
{
  "version": 1,
  "kind": "api",
  "items": [
    {
      "name": "연락처 조회",
      "group": "STUDENT",
      "method": "GET",
      "path": "student-contact",
      "status": "ACTIVE",
      "dataSrcId": "DS-EXAMPLE-001",
      "sql": "SELECT student_nm, hp_no, email FROM v_student WHERE student_id = #{id}",
      "params": [{ "name": "id", "type": "string", "required": true }],
      "resps": [
        {
          "col": "student_nm",
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

### 8.3 여러 건을 한 파일에

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
      "dataSrcId": "DS-EXAMPLE-001",
      "sql": "SELECT subject, grade, semester FROM v_grade WHERE student_id = #{id}",
      "params": [{ "name": "id", "type": "string", "required": true }],
      "resps": [
        { "col": "subject", "type": "VARCHAR", "displayName": "과목" },
        { "col": "grade", "type": "VARCHAR", "displayName": "성적" },
        { "col": "semester", "type": "VARCHAR", "displayName": "학기" }
      ]
    },
    {
      "name": "부서 트리 조회",
      "group": "DEPT",
      "method": "GET",
      "path": "dept-tree",
      "dataSrcId": "DS-EXAMPLE-001",
      "sql": "SELECT id, name, parent_id FROM v_dept"
    }
  ]
}
```

---

## 9. 작성 체크리스트 (전달 전 확인)

- [ ] 최상위에 `version: 1`, `kind: "api"`, `items` 배열이 있다.
- [ ] 각 API에 `name`·`group`·`method`·`path`·`dataSrcId`·`sql` 이 모두 있다.
- [ ] `path` 가 영소문자로 시작하고, 파일 안/기존 API와 겹치지 않는다.
- [ ] `dataSrcId` 는 관리자에게 받은 실제 값이다.
- [ ] SQL의 `#{...}` 이름과 `params[].name` 이 1:1로 일치한다.
- [ ] `method` 와 SQL 종류가 맞다(GET=조회, 쓰기=POST/PUT, DELETE·DDL·다중문 없음).
- [ ] 개인정보 컬럼/파라미터에 `maskRule` 을 지정했다.
- [ ] JSON 문법이 유효하다(쉼표·따옴표·괄호).

이 체크리스트를 통과하면, 그 JSON 파일이 곧 산출물이다. 게이트웨이 관리자에게 전달한다.
