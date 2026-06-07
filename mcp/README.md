# dxapi-mcp — AI 초안등록 MCP 서버

Dau.DX.API 게이트웨이의 관리 REST 를 **stdio MCP 도구 7종**으로 래핑한다. AI(Claude 등)가 대화만으로 "스키마 파악 → SQL 작성 → 검증 → **승인대기 초안(DRAFT) 등록**"을 수행한다. **활성화는 사람(관리자)만** — 서버가 role=AI 의 등록을 DRAFT 로 강제한다. 설계 = [`docs/product/02_AI초안등록_PRD.md`](../docs/product/02_AI초안등록_PRD.md).

## 도구 7종

| 도구 | 하는 일 | backend REST |
|---|---|---|
| `list_datasources` | DS 목록(접속정보 제외) | GET /api/datasources |
| `get_schema` | 테이블 목록 / 컬럼 상세(코멘트 포함) | GET /api/datasources/{id}/schema |
| `validate_sql` | SQL 정책 + prepare 실검증(무실행) | POST /api/apis/validate-sql |
| `check_path` | 경로 중복 확인 | GET /api/apis/check-path |
| `draft_api` | 선검증 후 **DRAFT 등록** (status 미전송 — 서버 강제와 이중 안전) | POST /api/apis |
| `list_my_drafts` | 자기 등록 건 목록 | GET /api/apis (서버가 REGID 필터) |
| `get_api_status` | 초안 상태 확인(DRAFT→ACTIVE) | GET /api/apis/{id} |

## 사전 요건

1. backend 가동 (`:8080`) — AI-M1 반영본.
2. **AI 서비스계정** 존재 — role=AI, 상태 ACTIVE. 로컬/dev = `LocalDataSeeder` 시드(`ai-mcp01`/`ai-mcp01!`), 운영 = `07_DBA_DDL.sql` 시드 절(Vault 비번).
3. Node.js 20+ (전역 `fetch` 사용).

## 설치·빌드

```powershell
cd mcp
npm install
npm run build     # → dist/
node smoke.mjs    # 스모크: initialize → tools/list 7종 → check_path 1회
```

## Claude Code 연결 (.mcp.json)

**repo 루트에 `.mcp.json` 포함돼 있음**(dev 자격증명 — 운영 키 사용 금지). Claude Code 를 repo 에서 재시작하면 자동 연결된다. 단, `mcp/dist/` 는 커밋되지 않으므로 **최초 1회 빌드 필요**: `cd mcp && npm install && npm run build`.

내용은 아래와 동일.

```json
{
  "mcpServers": {
    "dxapi": {
      "command": "node",
      "args": ["mcp/dist/index.js"],
      "env": {
        "DXAPI_BASE_URL": "http://localhost:8080",
        "DXAPI_AI_USER": "ai-mcp01",
        "DXAPI_AI_PASSWORD": "<AI 계정 비밀번호>"
      }
    }
  }
}
```

⚠️ **자격증명은 env 로만 주입** — repo 커밋 금지(운영 비번은 Vault, open-q K1). 잘못된 자격증명으로 반복 기동하지 말 것 — **로그인 5회 실패 시 계정 자동 잠금**(서버 브루트포스 방어). 클라이언트는 재로그인을 1회만 시도하도록 설계돼 있다.

## 토큰 수명주기 (src/client.ts)

- 첫 도구 호출 시 로그인 → access(15분)/refresh(24h) 보관.
- 만료 30초 전 자동 refresh(회전 대응).
- 401 수신 시 2초 백오프 후 재로그인 **1회만** → 재실패 시 오류 반환(무한루프 금지).
- backend 오류 봉투(`{ok:false, message, issues}`)는 도구 오류로 그대로 노출 — AI 가 사유 보고 SQL 수정 루프 가능.

## 사용 흐름 (AI 관점)

1. `list_datasources` → dataSrcId 선택.
2. `get_schema(dataSrcId)` → 테이블 목록, `get_schema(dataSrcId, table)` → 컬럼·코멘트.
3. SQL 작성(`#{param}` 바인드) → `validate_sql` 로 통과 확인.
4. `check_path` → `draft_api` 등록. 응답의 `api.no` 보관.
5. 관리자 승인 후 `get_api_status` 로 ACTIVE 확인.

## 차단·한도 (서버측)

- 등록은 항상 DRAFT. 활성화(PUT)·삭제·타인 건 조회 = 403.
- 생성 분당 한도(기본 10, `app.ai.create-per-min`), 미처리 DRAFT 상한(기본 50, `app.ai.max-open-drafts`).
- 관리자 콘솔에서 AI 계정 INACTIVE 전환 = 즉시 킬스위치.
