<!-- e2e 스펙 분류·실행 가이드. 실 백엔드(dev Oracle) 대상 유지 스펙 vs mockup 시대 레거시. -->

# e2e (Playwright)

전제 — frontend dev(`:3000`) + 백엔드(`:8080`, dev Oracle) **둘 다 가동**. `playwright.config.ts` 는 외부 서버 reuse(자동 기동 안 함). 브라우저: `bunx playwright install chromium` 1회.

## 유지 스펙 (실 백엔드 대상, green)

| 스펙 | 범위 |
|---|---|
| `day1-smoke.spec.ts` | 로그인(admin01·user01)·RBAC·사이드바 네비·로그아웃·미인증 redirect. **읽기/인증만** → 실 백엔드서 그대로 통과(8/8) |
| `real-backend.spec.ts` | 각 화면이 **실 dev Oracle 데이터** 표시(사용자 3·데이터소스·API 5·모니터링). 읽기전용·멱등(공유 DB 무오염) |

실행:
```bash
bunx playwright test e2e/day1-smoke.spec.ts e2e/real-backend.spec.ts
```

## 레거시 (mockup 시대, 실 백엔드선 미유지)

`day2`~`day6` 은 mockup(in-memory) 시대 작성. BFF 이관 후 실 백엔드선 **그대로 통과하지 않음**. 사유.

- **mock-reset 격리 소멸** — `beforeEach` 의 `POST /api/mock/reset` 은 in-memory mockData 만 리셋. 실 Oracle 데이터는 안 돌아감 → 변형 테스트가 비멱등·공유 DB 오염.
- **셀프서비스 = mock 전용** — 회원가입/비밀번호 변경/비번찾기(day2 일부)는 백엔드 엔드포인트 없음(내부 운영=관리자 등록 모델, 미구현). 실 로그인과 불일치 → 실패.
- **실 백엔드 정합** — 예: 매핑된 API 삭제는 실 백엔드가 `IN_USE` 정상 차단(day3 삭제 테스트의 전제와 다름).

→ 실 백엔드 회귀는 **유지 스펙 + 백엔드 `GatewayIntegrationIT`**(게이트웨이 4단·마스킹·SQL정책, API 레벨)로 커버. 변형/관리 CRUD e2e 가 필요하면 **테스트 데이터 격리**(전용 스키마/트랜잭션 롤백 또는 Testcontainers)를 먼저 도입 후 day3~6 재작성.

## 주의
- 변형 e2e 를 실 dev DB 에 돌리면 데이터 오염. 한글 데이터 정정 시 shell `-d` 금지(인코딩 깨짐) — node fetch/파일 사용.
