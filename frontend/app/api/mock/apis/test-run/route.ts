// API 테스트 실행 — 백엔드 /api/apis/test-run 프록시(ADMIN). 봉투(ok/data/message/issues) 그대로 중계.
import { NextResponse } from "next/server";
import { backendProxy } from "@/lib/bff";

export async function POST(req: Request) {
  const reqBody = await req.json().catch(() => ({}));
  const { status, body } = await backendProxy("/api/apis/test-run", {
    method: "POST",
    body: reqBody,
  });
  return NextResponse.json(body ?? { ok: false, message: "INTERNAL_ERROR" }, { status });
}
