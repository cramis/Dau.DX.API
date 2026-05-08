# 10. CI/CD 및 운영 가이드

> **문서 종류**: 배포·운영 PRD
> **작성일**: 2026-05-08
> **상위 문서**: [`INDEX.md`](INDEX.md)
> **참조**: [`../기술스택_재개발_추천.md`](../기술스택_재개발_추천.md) §6~§10

---

## 1. CI/CD 파이프라인

### 1.1 전체 흐름
```
[Developer] git push to Gitea
     ↓
[Gitea] webhook
     ↓
[Gitea Actions]
     ① 빌드 (gradle / npm)
     ② 단위 테스트
     ③ 컨테이너 빌드 (BuildKit) → Harbor 푸시
     ④ Trivy 스캔 (실패 시 abort)
     ⑤ Cosign 서명
     ⑥ ezapi-gitops repo 의 image tag bump (kustomize edit set image)
     ↓
[Argo CD] gitops repo 감시 → diff 감지 → sync
     ↓
[Kubernetes] Deployment rolling update
     ↓
[관측성] Prometheus 메트릭 변화 + Loki 로그
```

### 1.2 두 개 Repo 전략

| Repo | 책임 |
|---|---|
| **dau.dx.api** | 앱 코드(frontend, backend), Helm chart, Dockerfile, Gitea Actions workflow |
| **dau.dx.api-gitops** | Argo CD 매니페스트, 환경별 overlay, ExternalSecret CR |

---

## 2. Gitea Actions Workflow

### 2.1 백엔드 CI (`.gitea/workflows/backend-ci.yaml`)

```yaml
name: backend-ci
on:
  push:
    branches: [main, develop]
    paths: ['backend/**']
  pull_request:
    paths: ['backend/**']

jobs:
  build:
    runs-on: self-hosted
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: 'temurin', java-version: '21' }
      - name: Cache Gradle
        uses: actions/cache@v4
        with:
          path: ~/.gradle/caches
          key: gradle-${{ hashFiles('backend/**/*.gradle*') }}
      - run: ./gradlew test
      - run: ./gradlew bootJar
      - if: github.event_name == 'push'
        name: Build & Push Image
        env:
          HARBOR_USER: ${{ secrets.HARBOR_USER }}
          HARBOR_PASS: ${{ secrets.HARBOR_PASS }}
        run: |
          IMAGE=harbor.donga.ac.kr/dau-dx-api/backend
          TAG=${{ github.ref_name == 'main' && 'stg' || 'dev' }}-${GITHUB_SHA::8}
          echo "$HARBOR_PASS" | docker login harbor.donga.ac.kr -u "$HARBOR_USER" --password-stdin
          docker buildx build \
            --cache-from=type=registry,ref=$IMAGE:cache \
            --cache-to=type=registry,ref=$IMAGE:cache,mode=max \
            -t $IMAGE:$TAG --push .
          echo "TAG=$TAG" >> $GITHUB_ENV
      - if: github.event_name == 'push'
        name: Trivy Scan
        run: |
          trivy image --severity HIGH,CRITICAL --exit-code 1 \
            harbor.donga.ac.kr/dau-dx-api/backend:${{ env.TAG }}
      - if: github.event_name == 'push'
        name: Cosign Sign
        env: { COSIGN_KEY: ${{ secrets.COSIGN_KEY }} }
        run: cosign sign --key env://COSIGN_KEY harbor.donga.ac.kr/dau-dx-api/backend:${{ env.TAG }}
      - if: github.event_name == 'push'
        name: Update GitOps
        env: { GITOPS_TOKEN: ${{ secrets.GITOPS_TOKEN }} }
        run: |
          ENV=${{ github.ref_name == 'main' && 'stg' || 'dev' }}
          git clone https://oauth2:$GITOPS_TOKEN@gitea.donga.ac.kr/ops/dau-dx-api-gitops.git
          cd dau-dx-api-gitops/apps/dau-dx-api/overlays/$ENV
          kustomize edit set image backend=harbor.donga.ac.kr/dau-dx-api/backend:${{ env.TAG }}
          git add . && git commit -m "ci: bump backend image to ${{ env.TAG }}"
          git push
```

### 2.2 프론트엔드 CI (`.gitea/workflows/frontend-ci.yaml`)
유사 구조. `npm ci`, `npm run lint`, `npm run test:e2e`, 빌드, 푸시.

> ⚠ **패키지 매니저 정책**: CI/Docker 빌드는 **npm 만** 사용한다(`npm ci` → `package-lock.json` 기반 재현 설치). 로컬 개발은 Bun 을 쓰지만, CI 러너에는 Bun 을 설치하지 않는다. 근거·세부 절차는 [03 §5.1 프론트엔드 패키지 매니저 정책](03_시스템_아키텍처_설계서.md#51-프론트엔드-패키지-매니저-정책-bunnpm-분리) 참조.

```yaml
# 발췌 — 핵심 단계
- uses: actions/setup-node@v4
  with: { node-version: '20', cache: 'npm', cache-dependency-path: frontend/package-lock.json }
- run: npm ci
  working-directory: frontend
- run: npm run lint && npm run test:e2e && npm run build
  working-directory: frontend
```

### 2.3 PR 검증 (`.gitea/workflows/pr-checks.yaml`)
- lint, 단위 테스트만 (이미지 빌드 없음)
- 변경 path 별 분기 (frontend/backend)

---

## 3. Harbor (이미지 레지스트리)

### 3.1 프로젝트 구조
```
harbor.donga.ac.kr/
└── dau-dx-api/                     # 프로젝트 (private)
    ├── backend                     # 이미지 repo
    ├── frontend                    # 이미지 repo
    └── (mockup)                    # Phase 1 시연용 (선택)
```

### 3.2 정책
- **취약점 스캔**: Trivy 자동 (push 시), High/Critical 발견 시 표시
- **서명**: Cosign 키 등록, 미서명 이미지 pull 차단
- **태그 보존**: 최근 30개 + `prod-*` 태그 영구
- **자동 정리**: stg-* 태그 30일 후 삭제, dev-* 7일 후
- **RBAC**: dev 그룹 push, prod 그룹 pull only

### 3.3 이미지 태그 규칙
| 태그 | 용도 | 예시 |
|---|---|---|
| `dev-{git-sha-8}` | dev 환경 | `dev-abc12345` |
| `stg-{git-sha-8}` | stg 환경 | `stg-abc12345` |
| `prod-{semver}-{git-sha-8}` | prod 환경 | `prod-1.0.0-abc12345` |

---

## 4. Argo CD (GitOps)

### 4.1 ezapi-gitops repo 구조
```
dau-dx-api-gitops/
├── argocd/
│   ├── projects/
│   │   └── dau-dx-api-project.yaml          # AppProject
│   └── apps/
│       ├── dau-dx-api-dev.yaml              # Application
│       ├── dau-dx-api-stg.yaml
│       └── dau-dx-api-prod.yaml
├── apps/
│   └── dau-dx-api/
│       ├── base/
│       │   └── kustomization.yaml           # Helm chart 참조
│       └── overlays/
│           ├── dev/
│           │   ├── kustomization.yaml
│           │   ├── values.yaml              # Helm values
│           │   ├── configmap-patch.yaml
│           │   └── external-secret.yaml
│           ├── stg/
│           └── prod/
└── README.md
```

### 4.2 Application CR (예: dev)
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: dau-dx-api-dev
  namespace: argocd
spec:
  project: dau-dx-api
  source:
    repoURL: https://gitea.donga.ac.kr/ops/dau-dx-api-gitops.git
    targetRevision: main
    path: apps/dau-dx-api/overlays/dev
  destination:
    server: https://kubernetes.default.svc
    namespace: dau-dx-api-dev
  syncPolicy:
    automated: { prune: true, selfHeal: true }
    syncOptions: ['CreateNamespace=true', 'ApplyOutOfSyncOnly=true']
    retry:
      limit: 5
      backoff: { duration: 10s, factor: 2, maxDuration: 5m }
```

### 4.3 환경별 sync 정책

| 환경 | automated.prune | automated.selfHeal | 승인 |
|---|---|---|---|
| dev | true | true | 자동 |
| stg | true | true | 자동 |
| **prod** | **false** | **false** | **수동 sync (Argo CD UI)** |

### 4.4 롤백
```bash
cd dau-dx-api-gitops
git log apps/dau-dx-api/overlays/prod
git revert {bad-commit-sha}
git push
# Argo CD 가 자동으로 이전 태그로 sync
```

---

## 5. Kubernetes 매니페스트 (Helm)

### 5.1 Helm Chart 위치 (앱 repo)
```
dau.dx.api/deploy/helm/dau-dx-api/
├── Chart.yaml
├── values.yaml
├── values-dev.yaml
├── values-stg.yaml
├── values-prod.yaml
└── templates/
    ├── backend-deployment.yaml
    ├── backend-service.yaml
    ├── backend-hpa.yaml
    ├── backend-pdb.yaml
    ├── frontend-deployment.yaml
    ├── frontend-service.yaml
    ├── ingress.yaml
    ├── configmap.yaml
    ├── networkpolicy.yaml
    ├── servicemonitor.yaml
    ├── kyverno-imageverify.yaml         # ★ Cosign 서명 검증 정책 (§5.4)
    └── _helpers.tpl
```

### 5.2 values.yaml (요약)
```yaml
backend:
  image: { repository: harbor.donga.ac.kr/dau-dx-api/backend, tag: dev-abc12345 }
  replicaCount: 2
  resources:
    requests: { cpu: 200m, memory: 512Mi }
    limits:   { cpu: 1000m, memory: 1Gi }
  env:
    SPRING_PROFILES_ACTIVE: prod
    SERVER_PORT: '8080'
  envFrom:
    - secretRef: { name: dau-dx-api-secrets }
  probes:
    liveness:  { path: /actuator/health/liveness,  initialDelaySeconds: 10, periodSeconds: 10 }
    readiness: { path: /actuator/health/readiness, initialDelaySeconds: 5,  periodSeconds: 5 }
  hpa:
    minReplicas: 2
    maxReplicas: 10
    targetCPU: 70
  pdb:
    minAvailable: 1
  terminationGracePeriodSeconds: 60

frontend:
  image: { repository: harbor.donga.ac.kr/dau-dx-api/frontend, tag: dev-abc12345 }
  replicaCount: 2
  env:
    BACKEND_BASE_URL: http://backend:8080
    NEXT_PUBLIC_API_BASE_URL: https://dxapi.donga.ac.kr
  resources:
    requests: { cpu: 100m, memory: 256Mi }
    limits:   { cpu: 500m,  memory: 512Mi }

redis:
  enabled: true   # 또는 외부 Redis 사용 시 false

ingress:
  className: nginx
  hosts:
    - host: dxapi.donga.ac.kr
      paths:
        - { path: /api, backend: backend }
        - { path: /actuator, backend: backend }
        - { path: /, backend: frontend }
  tls:
    - { hosts: [dxapi.donga.ac.kr], secretName: dxapi-tls }

networkPolicy:
  enabled: true
```

### 5.3 환경별 overlay (Kustomize)
- `dev/values.yaml`: `replicaCount: 1`, `BACKEND_BASE_URL: dev`
- `stg/values.yaml`: `replicaCount: 2`, 운영 복제 DB ([09 §5.4 PII 마스킹 적용](09_보안_및_인증_설계서.md#54-stg-환경-복제-시-pii-마스킹-운영--stg))
- `prod/values.yaml`: `replicaCount: 3`, prod DB, Sentry 활성

### 5.4 Cosign 이미지 검증 (Kyverno)

CI 의 Cosign **서명** 만으로는 부족하다. K8s 측에서 미서명 이미지 배포를 **거부** 해야 한다(09 §11.2 와 일치). Kyverno ClusterPolicy 로 강제.

```yaml
# deploy/helm/dau-dx-api/templates/kyverno-imageverify.yaml
apiVersion: kyverno.io/v2beta1
kind: ClusterPolicy
metadata:
  name: dau-dx-api-image-verify
spec:
  validationFailureAction: Enforce          # prod/stg = Enforce, dev = Audit
  webhookTimeoutSeconds: 30
  rules:
    - name: verify-cosign-signature
      match:
        any:
          - resources:
              kinds: [Pod]
              namespaces: [dau-dx-api-stg, dau-dx-api-prod]
      verifyImages:
        - imageReferences:
            - "harbor.donga.ac.kr/dau-dx-api/*"
          attestors:
            - count: 1
              entries:
                - keys:
                    publicKeys: |-
                      -----BEGIN PUBLIC KEY-----
                      {{ .Values.cosign.publicKey }}
                      -----END PUBLIC KEY-----
          mutateDigest: true                  # tag → digest 고정
          required: true
```

**환경별 enforcement**.
- dev: `validationFailureAction: Audit` — 위반 시 알람만
- stg: `Enforce` — 미서명 이미지 거부, 사전 검증 게이트
- prod: `Enforce` — 거부 + Slack #dau-dx-api-incident 알람

**검증 시점**.
- ClusterPolicy 적용 후 의도적 미서명 이미지 push → admission denial 확인 (M5 도입)
- 분기 DR 시나리오 C 에서 정책 동작 재검증 ([§10.3](#103-dr-훈련-분기-1회))

---

## 6. 환경 분리

### 6.1 네임스페이스 / 도메인

| 환경 | 네임스페이스 | 도메인 | DB | Argo CD sync |
|---|---|---|---|---|
| dev | `dau-dx-api-dev` | `dev.dxapi.donga.ac.kr` | dev MetaDB | 자동 |
| stg | `dau-dx-api-stg` | `stg.dxapi.donga.ac.kr` | stg MetaDB (운영 복제) | 자동 |
| prod | `dau-dx-api-prod` | `dxapi.donga.ac.kr` | prod MetaDB | 수동 |

### 6.2 환경별 차이

| 항목 | dev | stg | prod |
|---|---|---|---|
| Replica (BE) | 1 | 2 | 3 (HPA 2~10) |
| HPA 활성 | ❌ | ✅ | ✅ |
| Vault 경로 | `dau-dx-api/dev/*` | `dau-dx-api/stg/*` | `dau-dx-api/prod/*` |
| Sentry | off | on | on |
| 외부 호출 게이트웨이 | mock 데이터소스 | 운영 복제 (**[09 §5.4 PII 마스킹 적용 후 적재 필수](09_보안_및_인증_설계서.md#54-stg-환경-복제-시-pii-마스킹-운영--stg)**) | 실 운영 |
| 로그 레벨 | DEBUG | INFO | INFO |
| Cosign 이미지 검증 | warn | enforce | enforce ([§5.4 Kyverno](#54-cosign-이미지-검증-kyverno)) |

---

## 7. 시크릿 관리

### 7.1 ExternalSecret 예시 (overlay 별)
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: dau-dx-api-secrets
  namespace: dau-dx-api-prod
spec:
  refreshInterval: 1h
  secretStoreRef: { name: vault-backend, kind: ClusterSecretStore }
  target: { name: dau-dx-api-secrets }
  data:
    - secretKey: META_DB_URL
      remoteRef: { key: dau-dx-api/prod/meta-db, property: url }
    - secretKey: META_DB_USER
      remoteRef: { key: dau-dx-api/prod/meta-db, property: username }
    - secretKey: META_DB_PASSWORD
      remoteRef: { key: dau-dx-api/prod/meta-db, property: password }
    - secretKey: JWT_SIGNING_KEY
      remoteRef: { key: dau-dx-api/prod/jwt, property: signing-key }
    - secretKey: REDIS_PASSWORD
      remoteRef: { key: dau-dx-api/prod/redis, property: password }
    - secretKey: API_KEY_HMAC_SEED
      remoteRef: { key: dau-dx-api/prod/api-key, property: hmac-seed }
```

### 7.2 시크릿 회전
- 주기: 분기 1회
- 절차: Vault 에서 rotate → ESO refresh → Pod restart (rolling)

---

## 8. 관측성 (Observability)

### 8.1 메트릭 (Prometheus)
- Pod 의 `/actuator/prometheus` 를 ServiceMonitor 로 scrape
- 본 시스템 커스텀 메트릭 (Micrometer)

| 메트릭 | 라벨 | 설명 |
|---|---|---|
| `dxapi_request_total` | api_id, status, method | API 호출 횟수 |
| `dxapi_request_duration_seconds` | api_id (histogram) | 응답 지연 |
| `dxapi_datasource_pool_active` | ds_id | 풀 사용 중 |
| `dxapi_datasource_pool_idle` | ds_id | 풀 idle |
| `dxapi_datasource_up` | ds_id | 풀 헬스 |
| `dxapi_auth_fail_total` | reason | 인증 실패 사유별 |
| `dxapi_async_log_queue_depth` | - | 호출 이력 큐 적체 |
| `dxapi_sql_validation_fail_total` | type | SQL 등록 실패 |

### 8.2 로그 (Loki)
- stdout JSON, Promtail/Fluent Bit 수집
- 필수 필드: `timestamp`, `level`, `logger`, `traceId`, `userId`, `message`

```json
{
  "timestamp": "2026-05-09T10:00:01.234Z",
  "level": "INFO",
  "logger": "dau.dx.api.feature.gateway.GatewayController",
  "traceId": "abc-123",
  "userId": "anonymous",
  "extSysId": "E20260508001",
  "apiNo": "A20260508001",
  "message": "API call success",
  "elapsedMs": 45
}
```

### 8.3 트레이싱 (Tempo / Jaeger)
- OTel Java Agent (Spring Boot), OTel Node SDK (Next.js)
- W3C Trace Context 자동 전파
- Frontend → Backend → DB 까지 한 trace 로 연결

### 8.4 Grafana 대시보드 (필수)
- Dashboard 1: 게이트웨이 RPS / Latency / Error rate
- Dashboard 2: 데이터소스 풀 상태
- Dashboard 3: 인증 실패 모니터링
- Dashboard 4: 호출 이력 큐 적체

### 8.5 알람 (Alertmanager)

| 알람 | 조건 | 채널 |
|---|---|---|
| HighErrorRate | 5xx > 1% (5분 평균) | Slack #dau-dx-api-alert |
| HighLatency | p95 > 1s (5분) | Slack |
| DataSourceDown | `dxapi_datasource_up == 0` | Slack + PagerDuty (prod) |
| QueueBackpressure | `dxapi_async_log_queue_depth > 5000` | Slack |
| AuthFailSpike | `dxapi_auth_fail_total` 증가 > 100/분 | Slack + 이메일 |
| PodRestartLoop | Pod restart > 3 / 30분 | Slack + PagerDuty |

---

## 9. 운영 절차 (Runbook)

### 9.1 정기 작업
- **일일**: Argo CD 동기화 상태 확인, 알람 리뷰
- **주간**: Harbor 취약점 리포트 검토, 의존성 업데이트
- **월간**: 백업 복원 훈련, 장애 시뮬레이션
- **분기**: 시크릿 회전, 모의 침투 테스트

### 9.2 prod 배포 절차
1. dev 에서 검증 (자동 sync 후 24h 관찰)
2. stg 에서 검증 (자동 sync 후 e2e + 부하 테스트 PASS)
3. prod GitOps repo PR 생성 (image tag bump)
4. PR 리뷰 (DevOps + 운영 책임자 2명)
5. main 머지
6. Argo CD UI 에서 수동 sync (hash 확인)
7. 5분 동안 메트릭 관찰
8. 문제 시 git revert → 자동 롤백

### 9.3 데이터소스 비밀번호 변경
1. Vault 에서 신규 비밀번호 작성
2. ESO refresh 또는 Secret 재생성
3. 백엔드 환경변수 갱신 후 Pod restart (rolling)
4. 풀 재생성 검증

### 9.4 장애 대응 (예시)
**증상**: 5xx 급증
1. Grafana 에서 어떤 API 인지 확인
2. Loki 에서 traceId 추적
3. 데이터소스 문제이면 풀 상태 확인
4. 필요 시 해당 데이터소스 비활성화 (Argo CD 외 운영 콘솔)
5. 사후 RCA 작성

---

## 10. 백업 / 복구 / 재해복구(DR)

### 10.1 백업 매트릭스

| 대상 | 주기 | 보존 | 도구 |
|---|---|---|---|
| MetaDB (Oracle 19c) | 매일 1회 풀백업 + 시간별 아카이브 로그 + **Active Data Guard Standby** | 7일 풀 + 30일 아카이브 + Standby 실시간 | Oracle RMAN + ADG |
| Vault | 매일 Raft snapshot + 멀티 노드 클러스터 | 7일 | Raft snapshot |
| GitOps repo | git history 자체 + 외부 미러 1개 | 영구 | Gitea backup |
| Harbor 이미지 | 보존 정책 (§3.2) + 재해 시 외부 레지스트리 mirror | 30일 ~ 영구 | Harbor replication |
| K8s etcd | 매일 snapshot (사내 K8s 운영팀) | 7일 | etcdctl snapshot |

### 10.2 RTO / RPO 목표 (NFR3.6)

| 시나리오 | RTO 목표 | RPO 목표 | 검증 절차 |
|---|---|---|---|
| Pod 단일 장애 | < 30초 | 0 | HPA + Liveness probe (자동) |
| Backend Deployment 전체 장애 | ≤ 5분 | 0 (스테이트리스) | rolling restart 또는 이전 태그로 git revert |
| **MetaDB primary 장애** | **≤ 5분** | **≤ 1분** | **ADG fail-over 분기 1회 훈련 (R18)** |
| K8s 클러스터 전체 장애 | ≤ 4시간 | ≤ 1분 | DR 사이트 cold start (수동) |
| Vault 장애 | ≤ 30분 | 0 | Raft 클러스터 quorum 복구, ESO 는 캐시로 일시 운영 |

### 10.3 DR 훈련 (분기 1회)

**시나리오 A — MetaDB primary 강제 fail-over**
1. 사전 통보: stg 환경 + 분기 1회, 30분 윈도우
2. ADG primary 의 listener 차단 → Standby 가 primary 로 승격
3. DXAPI Pod 의 connection drain 후 신규 primary 로 재연결 확인
4. 측정: 다운타임, 풀 재생성 시간, 첫 쿼리 성공 시각
5. RPO/RTO 임계 미달 시 R18 매트릭스에 회귀 등록

**시나리오 B — Vault Raft quorum 손실**
1. Vault 노드 1개 의도적 종료
2. ESO 캐시로 신규 Pod 부팅 가능 여부 확인 (refreshInterval 1h)
3. Vault 복구 후 새 시크릿 회전 동작 검증

**시나리오 C — Cosign 키 분실 가정**
1. Vault 의 Cosign 서명 키 비활성화
2. Kyverno ImageVerify 가 prod 배포를 차단하는지 확인 (§5.4)
3. 신규 키 발급 + 재서명 절차 리허설

---

## 11. 운영 인수인계 체크리스트

- [ ] Gitea 두 repo 의 push/admin 권한 매핑
- [ ] Harbor 프로젝트 RBAC 매핑
- [ ] Argo CD 프로젝트 권한 매핑
- [ ] Vault 정책 + ESO ClusterSecretStore 셋업
- [ ] K8s 네임스페이스 + ServiceAccount + RBAC
- [ ] Grafana 대시보드 4개 import
- [ ] Alertmanager 룰 + 채널 등록
- [ ] DNS 매핑 (3개 도메인)
- [ ] cert-manager 인증서 자동 갱신 동작 확인
- [ ] 운영 런북 (본 문서 §9) 인수
- [ ] 장애 대응 시뮬레이션 1회

---

**다음 문서**: [11 마일스톤 및 위험 관리](11_마일스톤_및_위험관리.md)
