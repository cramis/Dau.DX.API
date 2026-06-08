> 게이트웨이 API 외부 노출 설계. backend 를 내부에 감추고 공개 호스트 하나에서 HTTPRoute 경로 분기로 /api/sample·/openapi 만 노출한다. 옵션 비교·채택 근거·매니페스트 변경·보안 고려·검증 절차.

# 07. API 외부 노출 설계 — 단일 호스트 + 경로 분기

**작성일**: 2026-06-08 · **상태**: 채택(매니페스트 반영, 클러스터 apply 대기)

---

## 1. 문제

K8s 배포(2026-06 초기 구성)에서 backend 가 **자체 공개 호스트로 통째 노출**되어 있었다.

- `dau-dx-api.192.168.50.163.nip.io` → HTTPRoute → backend svc **전체**.
- 외부 연계용 게이트웨이(`/api/sample/*`)뿐 아니라 **관리 API(`/api/apis`·`/api/users`·`/api/datasources`·`/api/auth`…)까지 인터넷에서 도달 가능**.
- 관리 API 는 JWT 보호가 있지만, 인증 우회·취약점·브루트포스의 공격 표면이 불필요하게 넓다. 운영 방침은 "백엔드는 내부에 감추고 프론트엔드만 외부 노출".

단, 제품의 본질(축B)상 **외부 연계 시스템은 게이트웨이 API 를 호출할 수 있어야 한다** — 전부 감추면 제품이 성립하지 않는다. 따라서 질문은 "노출하느냐"가 아니라 "**어떤 표면만, 어떤 경로로 노출하느냐**".

## 2. 요구

1. backend 의 관리 API 는 외부에서 도달 불가(클러스터 내부 전용).
2. 외부 연계 시스템은 `X-Cert-Key` 로 게이트웨이(`/api/sample/{path}`)를 호출 가능.
3. 공개 API 문서(`/docs` 화면, `/openapi.json` 명세)와 호출 예시 URL 이 실제 호출 가능한 주소와 일치.
4. 운영 도메인 전환 시 변경 지점 최소화.

## 3. 옵션 비교

| | ① 단일 호스트 + 경로 분기 | ② 별도 API 호스트 | ③ frontend Node 프록시 |
|---|---|---|---|
| 방식 | 공개 호스트 1개. HTTPRoute 경로 매칭으로 `/api/sample`·`/openapi` 만 backend, 나머지 frontend | `api.<도메인>` 전용 호스트 + 경로 화이트리스트 | frontend 에 catch-all 라우트로 backend 중계 |
| 관리 API 차단 | ✅ 경로 미매칭 = frontend 404 | ✅ 동일 | ✅ (프록시 안 하면 차단) |
| 인프라 변경 | HTTPRoute 2파일 | HTTPRoute + 도메인·인증서 1세트 추가 | 없음 |
| 연계 트래픽 경로 | LB→backend 직행 | LB→backend 직행 | LB→**Node(frontend)**→backend |
| 성능/가용성 | 게이트웨이 성능 그대로 | 동일 + 웹/연계 분리 | Node 한 홉 추가. **frontend 다운 = API 다운** |
| XFF/클라이언트 IP | 프록시 계층 1개(nginx-gateway) | 동일 | frontend 가 XFF 위변조 책임 추가 부담 |
| URL | 1개 — 문서·운영 단순 | 2개 — 트래픽 분리 명확, 도메인 2개 관리 | 1개 |
| 탈락 사유 | — (채택) | 도메인·인증서 추가 관리 대비 현 규모에서 이득 작음. 필요해지면 ①에서 hostname 만 추가해 전환 용이 | m2m 트래픽이 UI 서버에 의존 — 가용성·성능·보안 책임 모두 악화 |

**채택 = ①.** frontend 의 mockup 잔재 `app/api/sample/*` 5개 라우트는 같은 prefix 지만, HTTPRoute 가 인프라 레벨에서 backend 로 먼저 분기하므로 외부에서 가려진다(무해 — 별건 정리 대상).

## 4. 채택 설계

```
외부 연계 ── https://<공개호스트>/api/sample/*  ──┐
브라우저  ── https://<공개호스트>/*             ──┤
                                                 ▼
                 [shared-gw(nginx-gateway) HTTPRoute 경로 분기]
                   /api/sample/* , /openapi*  → backend svc  (dau-dx-api:80)
                   그 외 전부                  → frontend svc (dau-dx-api-frontend:80)

  backend·MetaDB·대상DB = 클러스터 내부 전용. frontend(BFF)는 내부 DNS 로 backend 호출.
```

**원칙 = 기본 차단·명시 허용.** 외부 노출 표면 화이트리스트.

| 경로 | 대상 | 이유 |
|---|---|---|
| `/api/sample/*` | backend | 게이트웨이 본체 — 4단 검증·레이트리밋·이력이 자체 방어 |
| `/openapi*` | backend | 공개 명세(`/openapi.json`·`/openapi/{group}.json`). SQL 비노출·docVisible 필터 적용됨 |
| 그 외 전부 | frontend | 관리 API 포함 — 외부 미노출 |

- 동일 hostname 에 HTTPRoute 가 여러 개면 **구체적(긴) 경로 매칭이 우선**(Gateway API 명세) → frontend 의 catch-all(`/`)과 공존.
- `/api/docs/apis`(공개 문서 목록)는 frontend 서버 컴포넌트가 내부 DNS 로 호출하므로 외부 노출 불필요.
- HTTP→HTTPS redirect 는 frontend 의 기존 redirect 라우트(동일 hostname)가 처리.

### 매니페스트 변경 (반영됨)

1. `backend/deploy/kustomize/base/httproute.yaml` — backend 전용 호스트(redirect+https) 2건 삭제 → 공개 호스트에 경로 매칭 라우트 `dau-dx-api-gateway-paths` 1건.
2. `backend/deploy/kustomize/base/deployment.yaml` — `DXAPI_PUBLIC_BASE_URL` 을 공개 호스트로. `openapi.json` 의 `servers[0].url` 과 `/docs` curl 예시가 이 값을 따른다.

## 5. 보안 고려

- **XFF 신뢰.** 클러스터 확인 결과 nginx-gateway 는 `X-Forwarded-For` 를 `$proxy_add_x_forwarded_for` 방식으로 append 한다. 따라서 클라이언트가 앞에 위조 XFF 를 넣어도 backend 는 **마지막 항목(게이트웨이가 관측한 접속 IP)** 을 사용하도록 변경했다. `/docs` Try-it 프록시도 동일하게 마지막 IP 만 backend 로 전달한다.
- **localhost 무조건 허용.** `IpWhitelistChecker.isAllowed` 는 `127.0.0.1`/`::1` 을 항상 허용한다. 클러스터에서 backend 에 도달하는 패킷의 source 는 보통 게이트웨이 Pod IP 라 해당 없지만, 사이드카·hostNetwork 구성 변경 시 의미가 달라질 수 있음을 기억.
- **심층 방어.** 관리 API 의 1차 방어 = 노출 표면 제거(본 설계), 2차 = JWT + `requireAdmin`. 게이트웨이의 방어 = 4단 검증 + 레이트리밋 + 마스킹 + 이력.
- **frontend Try-it 프록시**(`/api/try/{path}`)는 인입 XFF 의 마지막 IP 만 전달해 backend 정책과 맞춘다.

## 6. 운영 도메인 전환

실 도메인(예: `dx.donga.ac.kr`) 적용 시 변경 지점 3곳.

1. `frontend/deploy/.../httproute.yaml` hostnames.
2. `backend/deploy/.../httproute.yaml`(gateway-paths) hostnames.
3. `backend/deploy/.../deployment.yaml` `DXAPI_PUBLIC_BASE_URL`.

EzAPI 이관(기존안 F·G)의 URL 하위호환이 필요해지면, 같은 방식으로 구 EzAPI 경로 prefix 를 backend(호환 어댑터)로 분기하는 라우트를 추가하면 된다.

## 7. 검증

**커밋 시점(로컬).**
- `kubectl kustomize backend/deploy/kustomize/overlays/dev` 렌더링 정상(YAML 유효·hostname·경로 확인).
- 구 호스트 `dau-dx-api.192.168.50.163.nip.io` 참조 잔존 0건.
- 로컬 dev 회귀 없음 — `:8080/api/sample/ai-user-list` 직접 호출 200 (매니페스트는 로컬 구동과 무관).

**클러스터 반영 후 기대 결과.**
1. `https://<공개호스트>/api/sample/ai-user-list` + `X-Cert-Key` → 200 (게이트웨이 도달).
2. `https://<공개호스트>/openapi.json` → 200, `servers[0].url` = 공개 호스트.
3. `https://<공개호스트>/api/apis` → frontend 404 (backend 미도달 — 관리 API 차단 확인).
4. 구 backend 호스트 `dau-dx-api.192.168...` → 불통(라우트 삭제).
5. IP 화이트리스트 걸린 연계로 호출 → 실 클라이언트 IP 로 판정되는지(XFF 동작) 확인.

---

**관련 문서.** 전체 비전 아키텍처 = [`../reference/기존안/03_시스템_아키텍처_설계서.md`](../reference/기존안/03_시스템_아키텍처_설계서.md) · 외부 호출 사용법 = [`../user-guide/11_외부_API호출_가이드.md`](../user-guide/11_외부_API호출_가이드.md) · 보안 설계 = [`06_보안강화_설계.md`](06_보안강화_설계.md).

**최종 갱신**: 2026-06-08 (최초 작성 — 채택·매니페스트 반영)
