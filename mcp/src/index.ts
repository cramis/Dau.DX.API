#!/usr/bin/env node
// Dau.DX.API AI 초안등록 MCP 서버 엔트리 — stdio transport + 도구 7종 등록.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DxapiClient } from "./client.js";
import { registerTools } from "./tools.js";

async function main(): Promise<void> {
  const client = DxapiClient.fromEnv(); // 자격증명 없으면 fail-fast

  const server = new McpServer({
    name: "dxapi-mcp",
    version: "0.1.0",
  });

  registerTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio 서버의 로그는 stderr 로만 — stdout 은 JSON-RPC 채널
  console.error(`[dxapi-mcp] ready — backend=${process.env.DXAPI_BASE_URL ?? "http://localhost:8080"}`);
}

main().catch((e) => {
  console.error(`[dxapi-mcp] fatal: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
