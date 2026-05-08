# 07. Mockup 개발 계획 (Phase 1)

> **문서 종류**: Mockup-First Phase 1 가이드
> **작성일**: 2026-05-08
> **상위 문서**: [`INDEX.md`](INDEX.md)
> **선행**: [`04 화면 명세서`](04_화면_명세서.md), [`05 API 명세서`](05_API_명세서.md)

---

## 1. Mockup 단계 목표

### 1.1 무엇을 달성하는가
- 11개 화면을 **Next.js 단독으로** 동작하도록 시연 (백엔드 코드 0줄)
- 5개 샘플 API 게이트웨이가 **실제로 호출·검증·응답·이력기록** 까지 흉내내도록 구현
- 사용자가 화면을 클릭·입력하며 **실제 운영 흐름을 체험** 할 수 있도록 함
- 디자인·플로우·UX 를 **반복 수정** 하면서 확정안을 도출

### 1.2 무엇을 안 하는가
- DB 연결 (Oracle 19c 미연동)
- 실제 인증·암호화 (UI 시연 수준의 검증만)
- 실제 SQL 실행
- 실제 이메일 발송
- K8s 배포 (로컬 개발만)

### 1.3 종료 조건 (Mockup 확정)
- [ ] 11개 화면 모두 정상 클릭/입력/네비게이션 가능
- [ ] 5개 샘플 API 가 cert-key·IP·매핑 검증을 흉내내며 응답
- [ ] 호출 이력이 모니터링 화면에 실시간 표시
- [ ] 사용자(PO/이해관계자) 가 "이 모습이면 좋다" 라고 합의

---

## 2. 폴더 구조

```
mockup/                            # 신규 Git repo `dau.dx.api` 의 mockup 폴더
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── layout.tsx
│   ├── (admin)/
│   │   ├── api-list/
│   │   │   ├── page.tsx           # 목록
│   │   │   ├── new/page.tsx       # 등록
│   │   │   ├── [id]/page.tsx      # 수정
│   │   │   └── components/
│   │   ├── datasource/
│   │   ├── ext-system/
│   │   ├── monitoring/
│   │   ├── approval/
│   │   │   ├── api/page.tsx
│   │   │   └── user/page.tsx
│   │   ├── users/
│   │   ├── me/
│   │   └── layout.tsx             # admin 레이아웃 (사이드바)
│   ├── docs/
│   │   └── page.tsx               # API 문서 뷰어
│   ├── api/
│   │   ├── mock/                  # Mock 관리자 콘솔 API (Server Action 백엔드 흉내)
│   │   │   ├── auth/route.ts
│   │   │   ├── apis/route.ts
│   │   │   ├── datasources/route.ts
│   │   │   ├── ext-systems/route.ts
│   │   │   ├── monitoring/route.ts
│   │   │   ├── users/route.ts
│   │   │   └── approvals/route.ts
│   │   └── sample/                # 샘플 게이트웨이 5개
│   │       ├── sample-user-info/route.ts
│   │       ├── sample-grade-list/route.ts
│   │       ├── sample-grade-save/route.ts
│   │       ├── sample-dept-tree/route.ts
│   │       └── sample-notification-send/route.ts
│   ├── layout.tsx
│   ├── page.tsx                   # 홈/리다이렉트
│   └── globals.css
├── components/
│   ├── ui/                        # shadcn/ui 컴포넌트
│   ├── DataTable.tsx
│   ├── SqlEditor.tsx              # Monaco wrapper
│   ├── ApiForm.tsx
│   ├── MonitoringChart.tsx
│   └── Sidebar.tsx
├── lib/
│   ├── mockData.ts                # 메모리 데이터 (사용자/API/연계시스템/...)
│   ├── mockGateway.ts             # 게이트웨이 검증 로직 (cert-key, IP, 매핑)
│   ├── mockHistory.ts             # 호출 이력 인메모리 저장
│   ├── api.ts                     # fetch wrapper (Phase 3 에서 백엔드로 교체)
│   └── utils.ts
├── hooks/
│   ├── useMockApi.ts
│   └── useMockHistory.ts
├── types/
│   └── api.ts                     # Zod schemas + types
├── middleware.ts                  # 인증 가드 (mock JWT)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 3. Mock 데이터 설계 (`lib/mockData.ts`)

### 3.1 초기 데이터

```typescript
// lib/mockData.ts
export const mockUsers = [
  { userId: 'admin01', userName: '관리자', role: 'ADMIN', status: 'ACTIVE',
    email: 'admin@donga.ac.kr', org: '동아대학교', dept: 'IT지원팀' },
  { userId: 'user01', userName: '홍길동', role: 'USER', status: 'ACTIVE',
    email: 'user01@donga.ac.kr', org: '동아대학교', dept: '학사팀' },
  { userId: 'pending01', userName: '신청자', role: 'USER', status: 'PENDING',
    email: 'pending@example.com', org: '외부기관', dept: '연구팀' },
];

export const mockDataSources = [
  { dsId: 'DS20260508001', name: 'Oracle19c-prod', dbType: 'ORACLE',
    jdbcUrl: 'jdbc:oracle:thin:@host:1521/XE', minPool: 5, maxPool: 20,
    queryTimeout: 10, useYn: 'Y' },
  { dsId: 'DS20260508002', name: 'Oracle19c-dev', dbType: 'ORACLE',
    jdbcUrl: 'jdbc:oracle:thin:@dev:1521/XE', minPool: 2, maxPool: 10,
    queryTimeout: 10, useYn: 'Y' },
];

export const mockExtSystems = [
  { extSysId: 'E20260508001', name: '학사정보시스템',
    certKeyPrefix: 'AKAD0001', allowedIps: ['10.0.0.5', '10.0.0.6'],
    useBegin: '2026-01-01T00:00:00', useEnd: '2027-12-31T23:59:59',
    status: 'ACTIVE', mappedApis: ['A20260508001', 'A20260508002'] },
  { extSysId: 'E20260508002', name: '도서관시스템',
    certKeyPrefix: 'LIB00001', allowedIps: ['10.0.0.10'],
    useBegin: '2026-01-01T00:00:00', useEnd: '2027-06-30T23:59:59',
    status: 'ACTIVE', mappedApis: ['A20260508001'] },
];

export const mockApis = [
  { apiNo: 'A20260508001', apiName: '사용자정보조회', group: 'USER',
    method: 'GET', requestPath: 'sample-user-info', status: 'ACTIVE',
    dsId: 'DS20260508001', authRequired: true, documentVisible: true,
    sqlSource: 'SELECT user_id, user_nm, dept_nm FROM v_user WHERE user_id = #{user_id}',
    params: [{ name: 'user_id', type: 'string', required: true }],
    responseColumns: [
      { name: 'user_id', displayName: '사용자ID', masking: null },
      { name: 'user_nm', displayName: '이름',     masking: 'name' },
      { name: 'dept_nm', displayName: '부서명',   masking: null },
    ]},
  // ... 4개 더
];

export const mockCertKeys = {
  'AKAD0001-XXXX-YYYY-ZZZZ': 'E20260508001',  // 학사
  'LIB00001-AAAA-BBBB-CCCC': 'E20260508002',  // 도서관
  'demo-key-001':            'E20260508001',  // Mockup 시연용 데모 키
};
```

### 3.2 Mock 데이터 영속성
- 기본은 **인메모리** (서버 재시작 시 초기화).
- 옵션: `lib/persist.ts` 로 `localStorage` 또는 `app/api/mock/_db.json` 파일 입출력 (선택적).

---

## 4. Mock 관리자 콘솔 API (Route Handlers)

### 4.1 인증 (`app/api/mock/auth/route.ts`)

```typescript
// app/api/mock/auth/login/route.ts
import { NextResponse } from 'next/server';
import { mockUsers } from '@/lib/mockData';

export async function POST(req: Request) {
  const { userId, password } = await req.json();
  const user = mockUsers.find(u => u.userId === userId);
  if (!user || password !== 'password123') {  // mockup: 단일 비밀번호
    return NextResponse.json(
      { success: false, message: '아이디 또는 비밀번호가 일치하지 않습니다.', errorCode: 'AUTH_FAILED' },
      { status: 401 }
    );
  }
  // mock JWT (실제 서명 없음)
  const accessToken = btoa(JSON.stringify({ userId, role: user.role, exp: Date.now() + 900_000 }));
  return NextResponse.json({
    success: true,
    data: { accessToken, refreshToken: 'mock-refresh', expiresIn: 900, user }
  });
}
```

### 4.2 API CRUD (`app/api/mock/apis/route.ts`)
- `GET` → mockApis 반환 (검색/페이징 흉내)
- `POST` → 입력 검증 + mockApis 에 push + 채번
- `PUT/DELETE` → mockApis 업데이트/삭제

### 4.3 데이터소스 CRUD
- `POST /admin/datasources/test-connection` → 항상 200 + `connected: true` 1초 지연

---

## 5. 샘플 API 게이트웨이 5개

> **목적**: cert-key·IP·매핑 검증을 흉내내고, 응답·이력 기록까지 시연.

### 5.1 공통 로직 (`lib/mockGateway.ts`)

```typescript
// 4단 검증 + 이력 적재
export function validateGatewayCall(req: Request, requestPath: string) {
  const certKey = req.headers.get('certification-key');
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';

  // 1. cert-key
  const extSysId = mockCertKeys[certKey ?? ''];
  if (!extSysId) return { ok: false, code: 'AUTH_KEY_INVALID', status: 401 };

  // 2. IP
  const sys = mockExtSystems.find(s => s.extSysId === extSysId)!;
  if (!sys.allowedIps.includes(clientIp) && clientIp !== '127.0.0.1') {
    return { ok: false, code: 'IP_NOT_ALLOWED', status: 403 };
  }

  // 3. 사용기간
  const now = new Date();
  if (now < new Date(sys.useBegin) || now > new Date(sys.useEnd)) {
    return { ok: false, code: 'KEY_EXPIRED', status: 403 };
  }

  // 4. API 매핑
  const api = mockApis.find(a => a.requestPath === requestPath);
  if (!api) return { ok: false, code: 'API_NOT_FOUND', status: 404 };
  if (!sys.mappedApis.includes(api.apiNo)) {
    return { ok: false, code: 'API_NOT_MAPPED', status: 403 };
  }

  return { ok: true, api, extSysId, clientIp };
}

export function recordHistory(entry: HistoryEntry) {
  mockHistory.unshift(entry);  // 최신 먼저
  if (mockHistory.length > 1000) mockHistory.pop();  // 메모리 보호
}
```

### 5.2 샘플 1 — 사용자 정보 조회 (`/api/sample/sample-user-info`)

```typescript
// app/api/sample/sample-user-info/route.ts
export async function GET(req: Request) {
  const start = Date.now();
  const v = validateGatewayCall(req, 'sample-user-info');
  if (!v.ok) {
    recordHistory({ ts: new Date().toISOString(), path: 'sample-user-info',
      method: 'GET', clientIp: 'unknown', status: v.status, errorCode: v.code,
      elapsedMs: Date.now() - start });
    return NextResponse.json({ result: [], error: { code: v.code } }, { status: v.status });
  }

  const url = new URL(req.url);
  const userId = url.searchParams.get('id') ?? '';
  // mock 응답 데이터
  const result = userId === 'u001' ? [{ user_id: 'u001', user_nm: '홍**', dept_nm: '학사팀' }] : [];

  recordHistory({ ts: new Date().toISOString(), extSysId: v.extSysId,
    apiNo: v.api.apiNo, path: 'sample-user-info', method: 'GET',
    clientIp: v.clientIp, status: 200, elapsedMs: Date.now() - start });

  return NextResponse.json({ result, count: result.length, elapsed_ms: Date.now() - start });
}
```

### 5.3 샘플 2~5 (동일 패턴)
- `sample-grade-list` (GET) — 학번으로 성적 목록
- `sample-grade-save` (POST) — 성적 저장 (메모리에 적재)
- `sample-dept-tree` (GET) — 부서 트리 (재귀 데이터)
- `sample-notification-send` (POST) — 알림 발송 (콘솔 출력)

### 5.4 시연 시 사용 명령

```bash
# 정상 호출
curl -H "certification-key: demo-key-001" \
  "http://localhost:3000/api/sample/sample-user-info?id=u001"
# → {"result":[{"user_id":"u001","user_nm":"홍**","dept_nm":"학사팀"}],"count":1}

# 인증 실패
curl "http://localhost:3000/api/sample/sample-user-info?id=u001"
# → 401 {"result":[],"error":{"code":"AUTH_KEY_INVALID"}}
```

---

## 6. 화면 구현 순서 (1주 가이드)

| Day | 화면 / 작업 | 우선도 |
|---|---|---|
| 1 | 프로젝트 부트스트랩, shadcn/ui 셋업, 레이아웃, 사이드바, 인증 가드(mock) | P0 |
| 2 | 로그인, 회원가입, 본인정보 | P0 |
| 3 | API 목록 + DataTable, API 등록 폼 (탭 5개), Monaco SQL Editor | P0 |
| 4 | 데이터소스 CRUD, 연계시스템 CRUD (인증키 발급/재발급) | P0 |
| 5 | 모니터링 화면 + 차트 + 자동 새로고침, 호출 이력 인메모리 적재 | P0 |
| 6 | API 문서 뷰어 (트리/상세/curl 예시), 승인 화면 2개, 사용자 관리 | P0 |
| 7 | **샘플 게이트웨이 5개 동작**, e2e 시나리오 5개, 디자인 다듬기 | P0 |

---

## 7. e2e 시나리오 (Playwright)

> 화면 변경 시 회귀 검증용. Phase 3 에서도 그대로 사용.

| ID | 시나리오 |
|---|---|
| E1 | 로그인 → API 목록 → API 등록 → 저장 → 목록에 노출 |
| E2 | 데이터소스 등록 → 연결 테스트 → 저장 → 목록에 노출 |
| E3 | 연계시스템 등록 → 인증키 발급 → API 매핑 → 저장 |
| E4 | 외부 호출 시뮬레이션 (curl) → 모니터링 화면에 즉시 표시 |
| E5 | API 문서 뷰어에서 등록한 API 가 검색 → 상세 표시 |

---

## 8. 디자인 토큰 / 컴포넌트 라이브러리

- **Tailwind CSS 4** + **shadcn/ui** 기반.
- 디자인 토큰 (`globals.css`):
  ```css
  :root {
    --primary: 221 83% 53%;       /* Blue */
    --success: 142 71% 45%;
    --warning: 38 92% 50%;
    --danger:  0 72% 51%;
    --border:  220 13% 91%;
  }
  ```
- 핵심 컴포넌트: `Button`, `Input`, `Select`, `Dialog`, `Toast`, `Tabs`, `DataTable`.

---

## 9. Mock-to-Real 전환 가이드 (Phase 3 준비)

> Mockup 단계에서 작성한 코드 중 어느 부분이 정식 frontend 로 포팅 가능한가.

| 영역 | 포팅 여부 | 비고 |
|---|---|---|
| 화면 컴포넌트 (`(admin)/...`, `docs/...`) | ✅ 거의 그대로 | 디자인 토큰·플로우 확정 시 |
| `components/ui/*` (shadcn) | ✅ 그대로 | |
| `app/api/mock/**` | ❌ 폐기 | 정식은 backend 호출로 대체 |
| `app/api/sample/**` | ❌ 폐기 | 정식은 backend `/api/**` 가 처리 |
| `lib/mockData.ts` | ❌ 폐기 | DB 가 진실의 원천 |
| `lib/api.ts` (fetch wrapper) | ✅ URL 만 교체 | `app/api/mock/*` → `https://backend...` |
| Zod schemas (`types/`) | ✅ 그대로 | 백엔드 응답 구조 동일 |
| Playwright e2e | ✅ 그대로 | 핵심 시나리오 회귀 검증 |

---

## 10. 운영 (개발 환경)

> 패키지 매니저 정책: 로컬 개발은 **Bun**, CI/배포 빌드는 **npm**.
> 상세는 [03 §5.1 프론트엔드 패키지 매니저 정책](03_시스템_아키텍처_설계서.md#51-프론트엔드-패키지-매니저-정책-bunnpm-분리) 참조.

### 10.1 로컬 개발 (Bun)
```bash
cd mockup
bun install
bun run dev          # http://localhost:3000
bun run test:e2e     # Playwright
bun run lint
```

### 10.2 의존성 추가 시 절차
```bash
bun add <pkg>            # 또는 bun add -d <pkg>
npm install              # package-lock.json 동기화 (필수)
git add package.json package-lock.json bun.lock
```

### 10.3 CI/Docker 빌드 검증 (선택, 로컬에서 npm 경로 확인)
```bash
npm ci                   # 락파일 기반 재현 설치
npm run build
```

---

## 11. Mockup 단계 끝낼 때 정리

- [ ] 디자인 토큰·컴포넌트 카탈로그 정리 (`docs/design-tokens.md`)
- [ ] 확정된 화면 캡처 + 사용자 승인 기록
- [ ] e2e 시나리오 5개 모두 PASS
- [ ] Phase 3 frontend 부트스트랩 시 포팅할 항목 체크리스트 작성

---

**다음 문서**: [08 본 개발 계획](08_본_개발_계획.md)
