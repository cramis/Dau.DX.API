// API 일괄 import — 백엔드 /api/apis/import 프록시. dryRun 전달, 검증·트랜잭션·결과는 백엔드. admin 은 backendProxy 토큰으로 강제.
import { NextResponse } from "next/server";
import { backendProxy } from "@/lib/bff";

export async function POST(req: Request) {
  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";
  const body = await req.json().catch(() => ({}));
  const { status, body: res } = await backendProxy("/api/apis/import", {
    method: "POST",
    query: { dryRun: String(dryRun) },
    body,
  });
  return NextResponse.json(res ?? { ok: false, message: "INTERNAL_ERROR" }, { status });
}
