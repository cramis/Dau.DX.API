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
| datasources | `mock/datasources*` | ⬜ |
| ext-systems | `mock/ext-systems*` | ⬜ |
| apis | `mock/apis*` | ⬜ |
| approvals | `mock/approvals/*` | ⬜ |
| monitoring | `mock/monitoring/*` | ⬜ |

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
