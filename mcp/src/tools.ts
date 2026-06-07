// MCP 도구 7종 — backend 관리 REST 1:1 래핑(02_AI초안등록_PRD §7). 비즈니스 로직 없음(드리프트 방지 R7).
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DxapiClient, DxapiError } from "./client.js";

// ApiParamDto / ApiRespDto (backend apidef DTO 미러)
const paramShape = z.object({
  name: z.string().describe("바인드 파라미터명 — SQL 의 #{name} 과 일치"),
  type: z.enum(["string", "number", "date", "boolean"]),
  required: z.boolean(),
  defaultValue: z.string().optional().describe("선택. 미전달 시 기본값"),
  desc: z.string().optional(),
  maskRule: z
    .enum(["none", "name", "phone", "email", "rrn", "card", "addr"])
    .optional()
    .describe("요청값이 호출이력에 적재될 때의 마스킹 규칙. 기본 none"),
});

const respShape = z.object({
  col: z.string().describe("SELECT 결과 컬럼명(소문자 권장 — 응답 JSON 키)"),
  type: z.string().describe("컬럼 타입 표기 (예: VARCHAR, NUMBER)"),
  displayName: z.string().optional(),
  maskRule: z
    .enum(["none", "name", "phone", "email", "rrn", "card", "addr"])
    .optional()
    .describe("응답 마스킹 규칙. PII 컬럼은 반드시 지정"),
});

export function registerTools(server: McpServer, client: DxapiClient): void {
  const tool = (
    name: string,
    description: string,
    inputSchema: z.ZodRawShape,
    run: (args: Record<string, unknown>) => Promise<unknown>,
  ) => {
    server.registerTool(name, { description, inputSchema }, async (args: Record<string, unknown>) => {
      try {
        const result = await run(args);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        // backend 오류 봉투를 그대로 노출 — AI 가 reason 보고 SQL 수정 루프 가능
        const msg =
          e instanceof DxapiError
            ? JSON.stringify({ error: e.message, status: e.status, issues: e.issues ?? null })
            : String(e);
        return { content: [{ type: "text" as const, text: msg }], isError: true };
      }
    });
  };

  tool(
    "list_datasources",
    "사용 가능한 데이터소스 목록(접속정보 제외). API 초안의 dataSrcId 선택에 사용.",
    {},
    () => client.request("GET", "/api/datasources"),
  );

  tool(
    "get_schema",
    "데이터소스의 스키마 메타 조회. table 미지정 = 테이블·뷰 목록(이름+코멘트), 지정 = 해당 테이블 컬럼 상세(이름·타입·nullable·코멘트). SQL 작성 전 반드시 호출해 실제 컬럼명을 확인할 것.",
    {
      dataSrcId: z.string().describe("데이터소스 ID (list_datasources 의 id)"),
      table: z.string().optional().describe("테이블명. 미지정 시 테이블 목록"),
    },
    (a) =>
      client.request(
        "GET",
        `/api/datasources/${encodeURIComponent(a.dataSrcId as string)}/schema` +
          (a.table ? `?table=${encodeURIComponent(a.table as string)}` : ""),
      ),
  );

  tool(
    "validate_sql",
    "SQL 사전 검증 — 정책(GET=SELECT/WITH, 非GET=+INSERT/UPDATE/MERGE/CALL, DELETE·DDL 상시 거부) + 대상 DB prepare(실행 없음, 테이블/컬럼 존재까지 확인). 등록 전 반드시 통과시킬 것.",
    {
      sql: z.string().describe("#{param} 바인드 표기 사용. 리터럴 결합 금지"),
      dataSrcId: z.string().describe("실검증 대상 데이터소스 ID"),
      method: z.enum(["GET", "POST", "PUT", "DELETE"]).describe("API 의 HTTP method — SQL 정책 분기"),
    },
    (a) =>
      client.request("POST", "/api/apis/validate-sql", {
        sql: a.sql,
        dataSrcId: a.dataSrcId,
        method: a.method,
      }),
  );

  tool(
    "check_path",
    "API 경로 중복 확인. {available:true} 면 사용 가능.",
    { path: z.string().describe("등록할 REQ_PATH (예: dept-student-count)") },
    (a) => client.request("GET", `/api/apis/check-path?path=${encodeURIComponent(a.path as string)}`),
  );

  tool(
    "draft_api",
    "API 정의를 승인대기 초안(DRAFT)으로 등록. 서버가 status 를 DRAFT 로 강제하며 활성화는 관리자만 가능. 등록 전 validate_sql·check_path 를 자동 선검증한다. 분당 생성 한도·미처리 초안 상한 있음.",
    {
      name: z.string().describe("API 명 (한글 가능)"),
      group: z.string().describe("API 그룹 코드 (예: STUDENT, COMMON)"),
      method: z.enum(["GET", "POST", "PUT", "DELETE"]),
      path: z.string().describe("외부 호출 경로 — /api/sample/{path}"),
      dataSrcId: z.string(),
      sql: z.string().describe("#{param} 바인드 표기. DELETE·DDL 불가"),
      desc: z.string().optional(),
      authRequired: z.boolean().optional().describe("기본 true"),
      docVisible: z.boolean().optional().describe("OpenAPI 문서 노출. 기본 true"),
      params: z.array(paramShape).optional().describe("요청 파라미터 정의 — SQL 의 #{} 와 1:1"),
      resps: z.array(respShape).optional().describe("응답 컬럼 정의 — PII 는 maskRule 필수"),
    },
    async (a) => {
      // 선검증 합성(backend 변경 0) — 실패 시 등록하지 않고 사유 반환
      const [sqlResult, pathResult] = await Promise.all([
        client.request<{ valid: boolean; message?: string }>("POST", "/api/apis/validate-sql", {
          sql: a.sql,
          dataSrcId: a.dataSrcId,
          method: a.method,
        }),
        client.request<{ available: boolean }>(
          "GET",
          `/api/apis/check-path?path=${encodeURIComponent(a.path as string)}`,
        ),
      ]);
      if (!sqlResult.valid) {
        return { registered: false, reason: `SQL 검증 실패: ${sqlResult.message ?? "unknown"}` };
      }
      if (!pathResult.available) {
        return { registered: false, reason: `경로 중복: ${a.path}` };
      }
      // status 필드는 의도적으로 미전송(이중 안전) — 서버가 AI role 에 DRAFT 강제
      const api = await client.request("POST", "/api/apis", {
        name: a.name,
        group: a.group,
        method: a.method,
        path: a.path,
        dataSrcId: a.dataSrcId,
        sql: a.sql,
        desc: a.desc,
        authRequired: a.authRequired,
        docVisible: a.docVisible,
        params: a.params,
        resps: a.resps,
      });
      return { registered: true, api, next: "관리자가 콘솔에서 검토 후 ACTIVE 전환하면 외부 호출 가능" };
    },
  );

  tool(
    "list_my_drafts",
    "이 AI 계정이 등록한 API 목록(서버가 등록자 기준 필터). 상태(DRAFT/ACTIVE) 포함.",
    { q: z.string().optional().describe("이름/경로/번호 부분 일치 검색") },
    (a) =>
      client.request("GET", "/api/apis" + (a.q ? `?q=${encodeURIComponent(a.q as string)}` : "")),
  );

  tool(
    "get_api_status",
    "등록한 API 의 현재 상태 조회(DRAFT→ACTIVE 전환 여부 확인). 자기 등록 건만 조회 가능.",
    { id: z.string().describe("API 번호 (예: A20260606001)") },
    (a) => client.request("GET", `/api/apis/${encodeURIComponent(a.id as string)}`),
  );
}
