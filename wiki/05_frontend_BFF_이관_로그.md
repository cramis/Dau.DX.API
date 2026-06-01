> frontend 화면을 실제 백엔드(Spring)로 연결하는 BFF 이관 작업 진행 로그. 단계별 변경·검증·문제·수정을 시간순 기록. 문제 발생 시 이 로그를 역추적해 바로잡는다.

# 05. frontend BFF 이관 로그

## 목적·배경

백엔드 6도메인(users·datasources·ext-systems·apis·approvals·monitoring)은 구현 완료 + dev Oracle 端-端 검증됨. 그러나 frontend 화면은 auth(login/logout) 외 전부 `/api/mock/**` route handler 의 in-memory mock(`lib/mockData`)을 본다. 본 작업은 각 mock route 핸들러 본문을 **실 백엔드 프록시로 교체**해 화면이 실 DB 를 보게 한다.

- 화면(page.tsx)이 호출하는 URL(`/api/mock/...`)은 **유지** → 화면 코드 변경 최소화.
- 응답 래퍼 차이(백엔드 `{ok,data}` ↔ 화면 기대 `{ok,items/user/...}`)는 각 route 가 흡수.
- 공통 헬퍼 `lib/bff.ts` `backendProxy(path, init)` = access 쿠키를 Bearer 로 첨부해 백엔드 호출 + `{status, body}` 반환.

## 패턴 (확정)

기존 `app/api/auth/login/route.ts` 가 BFF 프록시 패턴 확립(BACKEND_URL fetch + httpOnly 쿠키). 이를 일반화:

```ts
const { status, body } = await backendProxy("/api/users", { query: { q, status } });
if (!body?.ok) return NextResponse.json({ ok: false, message: body?.message ?? "ERROR" }, { status });
return NextResponse.json({ ok: true, items: (body.data as { items: unknown[] }).items });
```

## 알려진 한계 / 범위 밖 (의도)

- **토큰 refresh-on-401 미구현.** access 쿠키(15분) 만료 시 재발급 안 함 — 기존 `getCurrentUser` 도 동일. 데모 세션 짧아 수용. 별도 커밋으로 후속 가능. refresh 쿠키(24h)는 현재 미사용.
- **셀프서비스 엔드포인트는 백엔드에 없음** → mock 유지: `/me` PUT(프로필 자가수정), `users/me/password`, `users/signup`, `users/check-id`, `auth/forgot-password`.
- **P2 기능 백엔드 없음** → mock 유지: import/export, test-connection, validate-sql.

---

## 진행 현황

| 도메인 | mock route | 상태 |
|---|---|---|
| 공통 헬퍼 `lib/bff.ts` | — | ✅ |
| users | `mock/users`, `mock/users/[id]` | ✅ 端-端 검증 |
| datasources | `mock/datasources*` | ✅ 端-端 검증 |
| ext-systems | `mock/ext-systems*` | ✅ 端-端 검증 |
| apis | `mock/apis*` | ⬜ |
| approvals | `mock/approvals/*` | ✅ 검증(가드 端-端) |
| monitoring | `mock/monitoring/*` | ✅ 端-端 검증 |

---

## 로그 (시간순)

### 2026-06-01 — 착수 + 공통 헬퍼

- 백엔드 엔드포인트 ↔ FE mock route ↔ 화면 소비 형태 전수 매핑.
- `lib/bff.ts` `backendProxy` 생성. access 쿠키 Bearer 첨부, query/body 직렬화, 백엔드 unreachable → 502.
- 본 로그 파일 신설.

### 2026-06-01 — users 도메인 이관 ✅

**변경 파일**
- `app/api/mock/users/route.ts` — GET 목록 → `backendProxy("/api/users", {query:{q,status}})`, `data.items` → `{ok,items}`. 기존 admin 체크·password 마스킹은 백엔드가 수행하므로 제거.
- `app/api/mock/users/[id]/route.ts` — GET 단건 → `/api/users/{id}`, `data`→`{ok,user}`. PATCH `{status}` → 백엔드 **PUT** `{status}` 로 변환, `data`→`{ok,user}`. 백엔드 메시지(CANNOT_UPDATE_SELF 등) 그대로 전달.
- `mock/users/me` GET 은 기존 `getCurrentUser`(이미 백엔드 호출) 유지 → 변경 없음. me PUT·me/password 는 백엔드 없음 → mock 유지.

**계약 정합**: BE `UserResponse` ↔ FE `User` 필드 완전 일치. password 미전송.

**검증 (실 dev Oracle, frontend :3000 BFF 경유)**
- 정적: `tsc --noEmit` 0에러, 변경파일 eslint 0경고.
- 端-端: BFF 로그인(admin01) 200 → `/api/mock/users` 실 3건 목록 `{ok,items}`. self-guard PATCH admin01 → **409 CANNOT_UPDATE_SELF**. PATCH user01→INACTIVE 200(영속 확인) → 단건 GET INACTIVE 확인 → revert ACTIVE 200.

**문제·수정**
- PowerShell cwd 가 `frontend` 로 고정돼 `Set-Location backend` 실패 → 백엔드 부팅 절대경로(`C:\...\backend`)로 해결. (회피법: 백엔드 기동 시 절대경로 사용.)

### 2026-06-01 — datasources 도메인 이관 ✅

**변경 파일**
- `app/api/mock/datasources/route.ts` — GET 목록 / POST 등록 → `/api/datasources` 프록시. `data.items`→items, `data`→dataSource(201).
- `app/api/mock/datasources/[id]/route.ts` — GET/PUT/DELETE → `/api/datasources/{id}` 프록시. 삭제 성공 `{ok:true}`.
- **계약 갭 처리(중요)**: 백엔드 `DataSourceCreateRequest.dbPassword` 가 **@NotBlank 필수**인데 기존 FE 폼·스키마엔 비번 필드가 없었음(mock 은 불필요). 그대로 프록시 시 등록 400.
  - `lib/schemas/datasource.ts` — baseFields 에 `dbPassword: z.string().optional()` 추가.
  - `components/DataSourceForm.tsx` — DB 비밀번호 입력 필드 추가. **등록 시 필수**(수동 검사), **수정 시 선택**(공란이면 payload 에서 제외 → 백엔드가 기존 비번 유지). page 핸들러 타입 변경 불필요.

**계약 정합**: BE `DataSourceResponse` ↔ FE `DataSource` 필드 일치(비번 미응답). 에러코드 `NAME_EXISTS`/`IN_USE` = page 문자열 분기와 일치. (단 `IN_USE` 의 상세 API명 `detail` 은 ApiResponse 에 없어 page 가 일반 메시지로 fallback — 무해.)

**검증 (실 dev Oracle, BFF 경유)**
- 정적: `tsc` 0에러, eslint 0경고.
- 端-端: 목록(실 시드 2건) → 등록(`dbPassword` 포함, **채번 DS20260601001**) → 단건 → 수정(비번 공란→유지) → **IN_USE 삭제차단 409**(DS20260509001 매핑됨) → 테스트 DS 삭제 200 → 재조회 404. 테스트 데이터 정리 완료.

**주의 / 후속**
- list 프록시에 `q` 쿼리 전달하나 백엔드 list 는 무파라미터 → 무시됨. 검색은 화면 client-side 필터가 담당(기존 동작 유지).
- JsonEditModal 의 PUT(비번 없는 전체 JSON)도 백엔드가 비번 미제공=유지로 처리 → 정상.

### 2026-06-01 — monitoring 도메인 이관 ✅

**변경 파일**
- `app/api/mock/monitoring/stats/route.ts` — `/api/monitoring/stats?windowMin` 프록시. 백엔드 `StatsResult` 가 mockup statsSnapshot 과 동필드(windowMin 포함) → `{ok,...data}` 평탄화.
- `app/api/mock/monitoring/history/route.ts` — `/api/monitoring/history` 프록시(q/statusCode/apiNo/extSysId/from/to/limit 전달). `data.items`→items.

**계약 정합**: BE `StatsResult`·`CallHistory` read-model 이 FE 타입과 완전 일치(설계 시 mockup 미러링 명시). 소비처(monitoring page·LiveStatsCard·LiveLogTable·logs)가 모두 동일 응답형태 사용 → 형태 보존으로 무수정 호환.

**검증 (실 dev Oracle, BFF 경유)**
- 정적: `tsc` 0에러, eslint 0경고.
- 端-端: stats(windowMin=30) 평탄화 12필드 + series len30. history 실 call_hist(seq 3/2, 키 12개 완전일치). stats total=0 은 30분 윈도우 밖(과거 호출은 history 에 표시) → 정상.

**주의**
- monitoring page 는 이름 표시용으로 `/api/mock/ext-systems`·`/api/mock/apis` 도 호출(아직 mock). 실 call_hist 의 extSysId/apiNo 와 mock 목록 id 가 어긋나면 이름 대신 raw id 표시 가능. 두 도메인 이관 후 해소.

### 2026-06-01 — approvals 도메인 이관 ✅

**변경 파일 (6개)**
- `mock/approvals/user/route.ts`, `mock/approvals/api/route.ts` — 목록 → `/api/approvals/{user|api}` 프록시(optional status), `data.items`→items.
- `mock/approvals/{user|api}/[seq]/approve/route.ts` — 무body POST 프록시. 부수효과(USER→ACTIVE / API→연계 mappedApis 추가)는 백엔드 수행.
- `mock/approvals/{user|api}/[seq]/reject/route.ts` — reason(선택) 전달 POST 프록시.

**계약 정합**: BE `ApprovalResponse` ↔ FE `Approval` 완전 일치. 화면은 approve/reject 시 `res.ok` 만 확인 → 백엔드 응답 축약(`{approval}` only, 05 의 `{approval,user/extSystem}` 대비)이 화면에 무영향(처리 후 refresh).

**검증 (실 dev Oracle, BFF 경유)**
- 정적: `tsc` 0에러, eslint 0경고.
- 端-端: user/api 목록 실데이터(seq1 USER_SIGNUP, seq2 API_USAGE). approve already-APPROVED → **409 ALREADY_PROCESSED**. reject + reason → 409. 미존재 seq → 404. 라우팅·body 전달·에러 매핑 확인.

**한계**
- dev 데이터에 PENDING 승인이 없어(이전 세션서 모두 처리됨) **해피패스 승인 부수효과는 라이브 미실행**. 백엔드 부수효과는 이전 세션 端-端 검증됨(context-notes), BFF 는 users-PATCH 와 동일 얇은 프록시 → 확신. 신규 가입 흐름(signup 백엔드 없음) 도입 시 재검 권장.

### 2026-06-01 — ext-systems 도메인 이관 ✅

**변경 파일 (3개)**
- `mock/ext-systems/route.ts` — 목록/등록 → `/api/ext-systems` 프록시. 등록 응답 백엔드 `{extSystem,freshCertKey}` 평탄화(화면이 `data.freshCertKey` 로 인증키 1회 노출).
- `mock/ext-systems/[id]/route.ts` — GET/PUT/DELETE 프록시. certKey 는 regenerate 로만 갱신(update 요청에 미포함).
- `mock/ext-systems/[id]/regenerate-key/route.ts` — 백엔드 `{freshCertKey}` → `{ok,freshCertKey}`.

**계약 정합**: BE `ExtSystemResponse` 에 `picgTel` 추가 필드(FE 타입 없음 — 무해). certKey 는 목록/단건 마스킹(`AKAD****-****`), create/regenerate 만 평문 1회. 인증키는 요청에 없음(서버 생성). NAME_EXISTS 매핑 일치.

**검증 (실 dev Oracle, BFF 경유)**
- 정적: `tsc` 0에러, eslint 0경고.
- 端-端: 목록(실 E20260509001, 마스킹키) → 등록(**채번 E20260601001**, 평문키 노출 + 객체엔 마스킹) → 단건(allowedIps 배열·datetime) → 키재발급(새 키) → 수정(IP full-replace·status) → 삭제 200→404. 게이트웨이 데모용 E20260509001 무손상.

**문제·수정 (날짜 형식 — 코드변경 불필요로 결론)**
- 첫 스모크서 `useBegin:"2026-06-01"`(date-only) 전송 → 백엔드 `LocalDateTime.parse` 실패 `INVALID_INPUT "일시 형식"`. 백엔드는 ISO LocalDateTime(`...T00:00:00`) 기대.
- **원인은 테스트 페이로드 오류**. 실제 `ExtSystemForm` 은 이미 `withBoundary()` 로 date→`T00:00:00`(begin)/`T23:59:59`(end) 변환 후 전송, `ymd()` 로 edit 표시 slice. 폼 정확형식으로 재스모크 → 전부 통과. **BFF 정규화 불필요**.
- 교훈: 스모크는 화면 폼이 실제 보내는 형태로 검증할 것(raw 추정 금지).
