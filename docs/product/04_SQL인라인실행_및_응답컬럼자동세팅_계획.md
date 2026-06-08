# 04. SQL 인라인 실행 + 응답 컬럼 자동세팅 — 설계 계획

> `03_API테스트실행_PRD.md` 후속. API 관리 화면의 SQL 작성 UX 개선 계획.
> 본 문서는 설계만 다룬다. 구현은 본 문서 승인 후 별도 진행.

## 1. 배경 / 목표

- API 관리(등록/수정) 화면에서 SQL 작성 시 **탭 전환 없이** 즉시 실행·결과를 확인한다.
- 실행 결과 컬럼으로 **응답 컬럼이 비어 있으면 자동으로 채운다**(입력 수고 절감).

### 현재 상태

- `ApiForm.tsx` 는 5탭(기본 / SQL / 입력 파라미터 / 응답 컬럼 / 테스트 실행).
- SQL 실행은 **별도 "테스트 실행" 탭**에만 있어, 작성 중 확인하려면 탭을 옮겨야 한다.
- 실행 결과는 **JSON 덤프**만 보여준다(`TryItPanel.tsx:185-199`). 컬럼/행 테이블 없음.
- 응답 컬럼은 **전수 수동 입력**. 자동 추출 기능 없음.

### 확정 결정

1. 인라인 실행 UI → **SQL 탭 안에 통합**(에디터 아래 파라미터 + 실행 + 결과).
2. 응답 컬럼 자동세팅 → **비었을 때만 자동**(이미 입력돼 있으면 미동작).
3. 자동세팅 컬럼명 케이스 → **대문자 변환**(프론트 `toUpperCase()`). 백엔드 무수정.

## 2. 현 구조 (재사용 자산)

| 자산 | 위치 | 용도 |
|------|------|------|
| 5탭 폼 / `useFieldArray(params, resps)` | `components/ApiForm.tsx:41-100` | 폼 상태, 동적 행 |
| SQL 에디터 | `components/SqlEditor.tsx` (`ApiForm.tsx:449-465`) | Monaco, controlled |
| Try-it 실행 패널 | `components/TryItPanel.tsx` | 파라미터 입력폼 자동생성 + execute + 결과 렌더 |
| 테스트 탭 execute 콜백 | `ApiForm.tsx:717-738` | 폼값(method/sql/dataSrcId/params/resps)으로 test-run 호출 |
| BFF 프록시 | `app/api/mock/apis/test-run/route.ts` → `lib/bff.ts:backendProxy` | `/api/apis/test-run` 중계, 인증헤더 |
| 결과 DTO | 백엔드 `TestRunResult` | `rows:List<Map>`, `rowCount`, `elapsedMs`, `limited`, `rolledBack`, `affected` |
| 테이블 패턴 | `LiveLogTable.tsx:136` (`w-tbl`) | 결과 테이블 렌더에 재사용 |

### 백엔드 계약 / 제약 (무수정 전제)

- `POST /api/apis/test-run` (ADMIN, 분당 30회). 요청: `method, sql, dataSrcId, params?, resps?, maxRows?`.
- 결과 `rows` 의 **컬럼 키는 전부 소문자**(`SqlExecutor.mask()` 정규화).
- **결과 0행이면 컬럼명을 알 수 없다** → 자동세팅 불가(1행 이상 필요).

## 3. 설계

### 3-A. SQL 탭 인라인 실행

- SQL 탭(`ApiForm.tsx:442-496`)의 에디터/검증 버튼 **아래에 실행 블록**을 추가한다.
- **중복 방지** — 기존 "테스트 실행" 탭의 `TryItPanel` 블록을 공용 컴포넌트(예 `SqlRunBlock`)로 추출해 **SQL 탭·테스트 탭 양쪽에서 재사용**한다(테스트 탭은 그대로 유지).
  - props: `method / params(meta) / sql / dataSrcId / resps` 소스 = `form.watch(...)`, `execute` 콜백은 기존 것 재사용(`ApiForm.tsx:724-737`).
- **결과 미리보기 강화** — JSON 덤프에 더해 `data.rows` 를 **컬럼 헤더 + 행 테이블**(`w-tbl`)로 렌더한다. JSON 토글 유지.

### 3-B. 응답 컬럼 자동세팅 (비었을 때만)

- 트리거: 실행 **성공 && `data.rows.length > 0`**.
- "비었음" 판정: `resps.fields` 가 빈 행 1개뿐(모든 `col` 공백). 초기값 `[{col:"",...}]` 기준.
- 동작.

  ```ts
  const cols = Object.keys(rows[0]).map(c => c.toUpperCase());
  resps.replace(cols.map(c => ({
    col: c,
    type: inferType(rows, c),   // number → "NUMBER", else "VARCHAR" (선택)
    displayName: "",
    maskRule: "none",
  })));
  ```

  - 이미 채워져 있으면 **미동작**.
- 0행: 자동세팅 안내 메시지 표시("결과 0행 — 컬럼 자동세팅하려면 1행 이상 반환 필요").

## 4. 한계 / 주의

- 결과 0행 → 자동세팅 불가(백엔드가 빈 결과에서 컬럼 미반환).
- 대문자 변환은 Oracle 관행 기준. PG/MySQL 소문자 컬럼이면 안 맞을 수 있으나, 자동세팅은 **초안 보조**이며 사용자가 수정 가능.
- 마스킹 규칙은 자동 추론 안 함 → `none` 기본, 사용자가 지정.
- 자동세팅은 화면 폼 상태만 변경(저장 전). 저장해야 영구 반영.

## 5. 구현 시 변경 파일 (참고)

- `frontend/components/ApiForm.tsx` — SQL 탭에 실행 블록, `resps.replace(...)` 자동세팅 로직.
- `frontend/components/TryItPanel.tsx` 또는 신규 `SqlRunBlock` — 결과 테이블 렌더 추가.
- (선택) 컬럼 추출 / 타입 추론 유틸.
- **백엔드 변경 없음.**

## 6. 검증 (구현 후)

- `/api-list/new` SQL 탭 → `code-info` SQL + `claCd=APS011` 입력 → 실행 → 결과 테이블 표시.
- `resps` 빈 상태 → `CD, CD_NM, CLA_CD, SORT_SEQ`(대문자) 자동 채움 확인.
- `resps` 이미 입력됨 → 자동세팅 미동작 확인.
- 0행 결과 → 안내 메시지 확인.
