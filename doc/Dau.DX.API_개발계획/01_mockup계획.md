# 01. Mockup 개발 계획

> Phase 1 메인 가이드. Next.js 단독으로 12개 화면 + 5개 샘플 게이트웨이를 시연한다. **백엔드 코드 0줄**. Mock 데이터는 메모리에만.

---

## 1. 목표

- 12개 화면이 **클릭 가능**한 상태 — 사용자가 흐름을 직접 확인하고 피드백을 준다.
- 5개 샘플 게이트웨이가 **요청을 받아 Mock 데이터를 반환** — 외부 호출 인터페이스를 확정한다.
- e2e 시나리오 5개가 PASS — Phase 3 정식 frontend 로 그대로 포팅 가능.

**하지 않는 것**.
- 실제 DB 연결, JWT 서버, bcrypt 해시, 호출 이력 영속화, 배포 — 모두 Phase 2 이후.

---

## 2. 폴더 구조

```
mockup/
├── app/
│   ├── (auth)/                       # 로그인 / 회원가입 / 비밀번호 찾기
│   ├── (admin)/                      # 관리자 콘솔 (사이드바 레이아웃)
│   │   ├── api-list/
│   │   ├── datasource/
│   │   ├── ext-system/
│   │   ├── monitoring/
│   │   ├── approvals/                # api / user 서브라우트
│   │   ├── users/
│   │   └── me/
│   ├── docs/                         # API 문서 뷰어 (선택적 비로그인)
│   ├── api/
│   │   ├── mock/                     # 관리자 콘솔용 Mock API (Route Handler)
│   │   └── sample/                   # 5개 샘플 게이트웨이
│   ├── layout.tsx
│   └── globals.css                   # 디자인 토큰
├── components/
│   ├── ui/                           # shadcn/ui
│   ├── DataTable.tsx
│   ├── SqlEditor.tsx                 # Monaco wrapper
│   ├── ApiForm.tsx
│   ├── MonitoringChart.tsx
│   └── Sidebar.tsx
├── lib/
│   ├── mockData.ts                   # 메모리 데이터 + 시드
│   ├── mockGateway.ts                # 5개 샘플 GW 공통 로직 (Mock 4단 검증)
│   ├── mockHistory.ts                # 인메모리 호출 이력 큐
│   └── api.ts                        # fetch wrapper
├── types/
│   └── api.ts                        # Zod schemas
├── e2e/                              # Playwright 시나리오 5개
├── middleware.ts                     # mock JWT 가드
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── package-lock.json                 # 락파일은 일단 생성만 (CI 정책은 Phase 2)
├── bun.lock
└── CHANGELOG.md                      # 화면·인터페이스 변경 추적
```

---

## 3. 부트스트랩 (Bun)

```bash
cd dau.dx.api
bunx create-next-app@latest mockup --typescript --tailwind --eslint --app
cd mockup
bunx shadcn@latest init
bun add zod react-hook-form @hookform/resolvers
bun add -d @playwright/test
```

**일상 명령**.
```bash
bun install
bun run dev          # http://localhost:3000
bun run test:e2e     # Playwright
bun run lint
```

> 락파일 정책(npm vs bun) 은 [`open-questions.md`](open-questions.md) 의 항목. Mockup 단계에서는 둘 다 생성해 두기만 한다.

---

## 4. Mock 데이터 (`lib/mockData.ts`)

메모리 객체로만 보관. 새로고침하면 시드 상태로 리셋.

```typescript
// 사용자 등록 외부 시스템(연계시스템)을 관리하는 Mock 저장소
export const mockData = {
  users: [
    { id: 'admin01', name: '관리자', role: 'ADMIN', status: 'ACTIVE' },
    { id: 'user01',  name: '홍길동',  role: 'USER',  status: 'ACTIVE' },
  ],
  apis: [
    { no: 'A20260509001', name: '사용자정보조회', group: 'USER', method: 'GET',
      path: 'sample-user-info', dataSrcId: 'DS001', status: 'ACTIVE',
      sql: 'SELECT user_id, user_nm FROM v_user WHERE user_id = #{id}' },
    // ... 4건 더
  ],
  dataSources: [
    { id: 'DS001', name: 'Oracle19c-prod', type: 'ORACLE',
      jdbcUrl: 'jdbc:oracle:thin:@host:1521:SID', poolMin: 5, poolMax: 20 },
  ],
  extSystems: [
    { id: 'E20260509001', name: '학사정보시스템',
      certKey: 'AKAD0001-XXXX-YYYY-ZZZZ',
      allowedIps: ['10.0.0.0/24'],
      useBegin: '2026-01-01', useEnd: '2026-12-31',
      mappedApis: ['A20260509001'] },
  ],
  callHistory: [] as any[],
  approvals: [] as any[],
};
```

---

## 5. 샘플 게이트웨이 5개

> **목적**: 외부 호출 인터페이스(URL/헤더/응답 형태) 를 사용자와 합의. 실제 보안 검증은 Mock.

### 5.1 공통 동작 (`lib/mockGateway.ts`)

```typescript
// Mock 4단 검증 — 단계 정의는 임시. 실제 알고리즘은 Phase 2 결정 (open-questions §3).
export function mockVerify(req: Request) {
  const key  = req.headers.get('certification-key');
  const ip   = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const path = new URL(req.url).pathname.replace(/^\/api\//, '');

  const sys = mockData.extSystems.find(s => s.certKey === key);
  if (!sys)                                return reject(401, 'AUTH_KEY_INVALID');
  if (!matchIp(sys.allowedIps, ip))         return reject(403, 'IP_NOT_ALLOWED');
  if (!withinPeriod(sys.useBegin, sys.useEnd)) return reject(403, 'KEY_EXPIRED');
  if (!sys.mappedApis.includes(findApiNo(path))) return reject(403, 'API_NOT_MAPPED');
  return { ok: true, sys };
}
```

### 5.2 5개 샘플 (각 `app/api/sample/<path>/route.ts`)

| # | 경로 | 메서드 | 응답 형태 (Mock) |
|---|---|---|---|
| 1 | `/api/sample-user-info` | GET | `{ user_id, user_nm, dept_nm }` |
| 2 | `/api/sample-grade-list` | GET | `[{ subject, grade, semester }, ...]` |
| 3 | `/api/sample-grade-save` | POST | `{ saved: N }` |
| 4 | `/api/sample-dept-tree` | GET | `[{ id, name, children: [...] }]` |
| 5 | `/api/sample-notification-send` | POST | `{ messageId, sentAt }` |

> 응답 마스킹 룰(name/phone/email 등) 은 화면에서 노출되는 일부만 대충 흉내. 정확한 정규식은 Phase 2.

---

## 6. 화면 구현 순서 (1주 가이드)

| 일 | 작업 |
|---|---|
| 1 | 부트스트랩, shadcn/ui 셋업, 레이아웃, 사이드바, Mock JWT 가드 |
| 2 | 로그인 / 회원가입 / 비밀번호 찾기 / 본인 정보 |
| 3 | API 목록 + 등록/수정 (Monaco Editor 포함) |
| 4 | 데이터소스 / 연계시스템 |
| 5 | 모니터링 + API 문서 + 승인 2종 + 사용자 관리 |
| 6 | e2e 시나리오 5개 작성 |
| 7 | 사용자 1차 데모 + 피드백 반영 |

---

## 7. e2e 시나리오 (Playwright)

| # | 시나리오 |
|---|---|
| 1 | 관리자 로그인 → API 목록 → 신규 등록 → 저장 후 목록에 표시 |
| 2 | 관리자가 데이터소스 등록 → 연결 테스트 버튼 → 성공 응답 |
| 3 | 관리자가 연계시스템 등록 + API 매핑 → 인증키 표시 → 재발급 |
| 4 | 외부 호출 시뮬레이션 (Playwright `request` 로 `/api/sample-user-info` 호출) → 200 응답 → 모니터링 화면 즉시 반영 |
| 5 | 사용자가 API 사용 신청 → 관리자가 승인 화면에서 승인 → 사용자 측 매핑 자동 추가 |

---

## 8. Mockup 단계 종료 조건

- [ ] 12개 화면 모두 클릭/입력/네비게이션 가능
- [ ] 5개 샘플 게이트웨이 인터페이스가 사용자 합의 완료
- [ ] e2e 5개 모두 PASS
- [ ] 디자인 토큰 / 자주 쓰는 컴포넌트 카탈로그 정리 (`docs/design-tokens.md`)
- [ ] **사용자 사인오프** (PO 서명)
- [ ] [`open-questions.md`](open-questions.md) 의 `Phase 2 즉시 답해야 함` 항목들이 합의됨

종료 후 → Phase 2 진입. 백엔드/DB 결정부터 시작.

---

## 9. 변경 관리

- 화면·인터페이스 변경은 `mockup/CHANGELOG.md` 에 기록.
- 변경 빈도: 1주 1회 사용자 데모 → 다음 주 반영.
- 4주 초과 시 PO 가 "현재 안" 채택 결정.

---

**다음**: [`02_화면명세.md`](02_화면명세.md)
