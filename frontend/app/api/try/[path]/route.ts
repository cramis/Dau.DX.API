// /docs Try-it 용 공개 게이트웨이 프록시 — X-Cert-Key·query/body 를 backend /api/sample/{path} 로 그대로 전달.
// 무인증(쿠키·Bearer 미첨부). 4단 검증·rate-limit·호출이력은 게이트웨이가 그대로 수행 = 실제 호출 재현. 03 PRD §6.
import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/backend";

type Ctx = { params: Promise<{ path: string }> };

async function forward(req: Request, method: "GET" | "POST", path: string) {
  const inUrl = new URL(req.url);
  const target = new URL(`${BACKEND_URL}/api/sample/${encodeURIComponent(path)}`);
  inUrl.searchParams.forEach((v, k) => target.searchParams.append(k, v));

  const headers: Record<string, string> = {};
  const certKey = req.headers.get("x-cert-key");
  if (certKey) headers["X-Cert-Key"] = certKey;
  // 브라우저 실 IP 전달 — 게이트웨이 IP 화이트리스트 검증이 호출자 기준으로 동작하도록.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) headers["X-Forwarded-For"] = xff;

  let body: string | undefined;
  if (method === "POST") {
    headers["Content-Type"] = "application/json";
    body = await req.text();
  }

  try {
    const res = await fetch(target, { method, headers, body, cache: "no-store" });
    const out = await res.json().catch(() => ({ ok: false, code: "INTERNAL_ERROR" }));
    return NextResponse.json(out, { status: res.status });
  } catch {
    return NextResponse.json(
      { ok: false, code: "BACKEND_UNREACHABLE", detail: "게이트웨이에 연결할 수 없습니다." },
      { status: 502 },
    );
  }
}

export async function GET(req: Request, { params }: Ctx) {
  const { path } = await params;
  return forward(req, "GET", path);
}

export async function POST(req: Request, { params }: Ctx) {
  const { path } = await params;
  return forward(req, "POST", path);
}
