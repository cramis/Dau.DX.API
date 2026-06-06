// MCP 서버 stdio 스모크 — initialize → tools/list(7종 확인) → check_path 1회 호출(backend 연동 확인).
// 사용: node smoke.mjs  (env: DXAPI_BASE_URL/DXAPI_AI_USER/DXAPI_AI_PASSWORD)
import { spawn } from "node:child_process";

const child = spawn(process.execPath, ["dist/index.js"], {
  env: {
    ...process.env,
    DXAPI_AI_USER: process.env.DXAPI_AI_USER ?? "ai-mcp01",
    DXAPI_AI_PASSWORD: process.env.DXAPI_AI_PASSWORD ?? "ai-mcp01!",
  },
  stdio: ["pipe", "pipe", "inherit"],
});

let buf = "";
const pending = new Map();
child.stdout.on("data", (d) => {
  buf += d.toString();
  let nl;
  while ((nl = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    const msg = JSON.parse(line);
    if (msg.id !== undefined && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  }
});

let nextId = 1;
function rpc(method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, resolve);
    setTimeout(() => reject(new Error(`timeout: ${method}`)), 90000); // DB 무응답 시 백엔드 커넥션 타임아웃(30s+)까지 대기
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}
function notify(method, params) {
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
}

try {
  const init = await rpc("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "smoke", version: "0.0.0" },
  });
  console.log(`initialize: server=${init.result.serverInfo.name} v${init.result.serverInfo.version}`);
  notify("notifications/initialized", {});

  const tools = await rpc("tools/list", {});
  const names = tools.result.tools.map((t) => t.name).sort();
  console.log(`tools/list: ${names.length}종 — ${names.join(", ")}`);
  const expected = [
    "check_path", "draft_api", "get_api_status", "get_schema",
    "list_datasources", "list_my_drafts", "validate_sql",
  ];
  const ok = JSON.stringify(names) === JSON.stringify(expected);
  console.log(ok ? "TOOLSET OK" : `TOOLSET MISMATCH (기대: ${expected.join(", ")})`);

  const call = await rpc("tools/call", { name: "check_path", arguments: { path: "smoke-test-path" } });
  console.log(`check_path: isError=${call.result.isError ?? false} → ${call.result.content[0].text.slice(0, 200)}`);
} catch (e) {
  console.error(`SMOKE FAIL: ${e.message}`);
  process.exitCode = 1;
} finally {
  child.kill();
}
