// 데이터소스 일괄 import — 백엔드 /api/datasources/import 프록시. 신규 insert 는 dbPassword 필수(백엔드 검증).
import { NextResponse } from "next/server";
import { backendProxy } from "@/lib/bff";

export async function POST(req: Request) {
  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";
  const body = await req.json().catch(() => ({}));
  const { status, body: res } = await backendProxy("/api/datasources/import", {
    method: "POST",
    query: { dryRun: String(dryRun) },
    body,
  });
  return NextResponse.json(res ?? { ok: false, message: "INTERNAL_ERROR" }, { status });
}
