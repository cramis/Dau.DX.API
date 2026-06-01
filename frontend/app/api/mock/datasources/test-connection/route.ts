// 데이터소스 연결 테스트 — 백엔드 /api/datasources/test-connection 프록시(실제 JDBC 연결 시도).
// 백엔드 결과 {success,latencyMs,detail} → 화면 기대 {ok:연결성공, detail, latencyMs} 로 평탄화.
import { NextResponse } from "next/server";
import { backendProxy } from "@/lib/bff";

export async function POST(req: Request) {
  const reqBody = await req.json().catch(() => ({}));
  const { status, body } = await backendProxy("/api/datasources/test-connection", {
    method: "POST",
    body: reqBody,
  });
  // API 호출 자체 실패(인증/서버) → 화면엔 ok:false + 메시지.
  if (!body?.ok) {
    return NextResponse.json(
      { ok: false, detail: body?.message ?? "INTERNAL_ERROR", latencyMs: 0 },
      { status },
    );
  }
  const data = body.data as { success: boolean; latencyMs: number; detail: string };
  return NextResponse.json({
    ok: data.success,
    detail: data.detail,
    latencyMs: data.latencyMs,
  });
}
