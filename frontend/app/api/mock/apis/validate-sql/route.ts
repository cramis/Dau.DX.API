// SQL 검증 — 백엔드 /api/apis/validate-sql 프록시. dataSrcId 지정 시 대상 DS prepare 실검증.
// 백엔드 {valid,plan,message} → 화면 기대 {ok:valid, plan, message} 로 평탄화.
import { NextResponse } from "next/server";
import { backendProxy } from "@/lib/bff";

export async function POST(req: Request) {
  const reqBody = await req.json().catch(() => ({}));
  const { status, body } = await backendProxy("/api/apis/validate-sql", {
    method: "POST",
    body: reqBody,
  });
  if (!body?.ok) {
    return NextResponse.json(
      { ok: false, message: body?.message ?? "INTERNAL_ERROR" },
      { status },
    );
  }
  const data = body.data as { valid: boolean; plan?: string; message?: string };
  return NextResponse.json({ ok: data.valid, plan: data.plan, message: data.message });
}
