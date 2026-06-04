// 연계시스템 일괄 import — 백엔드 /api/ext-systems/import 프록시. 신규 insert 는 인증키 자동발급(백엔드).
import { NextResponse } from "next/server";
import { backendProxy } from "@/lib/bff";

export async function POST(req: Request) {
  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";
  const body = await req.json().catch(() => ({}));
  const { status, body: res } = await backendProxy("/api/ext-systems/import", {
    method: "POST",
    query: { dryRun: String(dryRun) },
    body,
  });
  return NextResponse.json(res ?? { ok: false, message: "INTERNAL_ERROR" }, { status });
}
