#!/usr/bin/env node
// Dau.DX.API AI 초안등록 MCP 서버 엔트리.
// - 기본: stdio transport (Claude Code 등 로컬 MCP 클라이언트가 직접 실행)
// - MCP_TRANSPORT=http: Streamable HTTP transport (Kubernetes 서비스 노출용)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { Request, Response } from "express";
import { DxapiClient } from "./client.js";
import { registerTools } from "./tools.js";

function createServer(): McpServer {
  const client = DxapiClient.fromEnv(); // 자격증명 없으면 fail-fast
  const server = new McpServer({
    name: "dxapi-mcp",
    version: "0.1.0",
  });
  registerTools(server, client);
  return server;
}

async function startStdio(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio 서버의 로그는 stderr 로만 — stdout 은 JSON-RPC 채널
  console.error(`[dxapi-mcp] stdio ready — backend=${process.env.DXAPI_BASE_URL ?? "http://localhost:8080"}`);
}

async function startHttp(): Promise<void> {
  const app = createMcpExpressApp({ host: "0.0.0.0" });
  const port = Number(process.env.PORT ?? "3000");

  app.get("/healthz", (_req: Request, res: Response) => {
    res.status(200).json({ ok: true, name: "dxapi-mcp" });
  });

  app.post("/mcp", async (req: Request, res: Response) => {
    const bearerToken = process.env.MCP_BEARER_TOKEN;
    if (bearerToken) {
      const auth = req.header("authorization") ?? "";
      if (auth !== `Bearer ${bearerToken}`) {
        res.status(401).json({
          jsonrpc: "2.0",
          error: { code: -32001, message: "Unauthorized" },
          id: null,
        });
        return;
      }
    }

    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      // Stateless mode: each HTTP request owns its transport/server instance.
      sessionIdGenerator: undefined,
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on("close", () => {
        transport.close();
        server.close();
      });
    } catch (e) {
      console.error(`[dxapi-mcp] http request failed: ${e instanceof Error ? e.message : String(e)}`);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  app.get("/mcp", (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed. Use POST /mcp." },
      id: null,
    });
  });

  app.delete("/mcp", (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    });
  });

  app.listen(port, (error?: Error) => {
    if (error) {
      console.error(`[dxapi-mcp] http listen failed: ${error.message}`);
      process.exit(1);
    }
    console.error(
      `[dxapi-mcp] http ready — port=${port} endpoint=/mcp auth=${process.env.MCP_BEARER_TOKEN ? "bearer" : "none"} backend=${process.env.DXAPI_BASE_URL ?? "http://localhost:8080"}`,
    );
  });
}

async function main(): Promise<void> {
  if ((process.env.MCP_TRANSPORT ?? "stdio").toLowerCase() === "http") {
    await startHttp();
  } else {
    await startStdio();
  }
}

main().catch((e) => {
  console.error(`[dxapi-mcp] fatal: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
