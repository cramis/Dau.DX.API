// 연계시스템 인증키 재발급 — 백엔드 /api/ext-systems/{id}/regenerate-key 프록시. 새 키 1회 노출.
import { NextResponse } from "next/server";
import { backendProxy } from "@/lib/bff";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const { status, body } = await backendProxy(`/api/ext-systems/${id}/regenerate-key`, {
    method: "POST",
  });
  if (!body?.ok) {
    return NextResponse.json(
      { ok: false, message: body?.message ?? "INTERNAL_ERROR" },
      { status },
    );
  }
  // 백엔드 응답 = { freshCertKey }. 화면은 data.freshCertKey 를 읽어 1회 노출.
  const data = body.data as { freshCertKey: string };
  return NextResponse.json({ ok: true, freshCertKey: data.freshCertKey });
}
