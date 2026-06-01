// 연계시스템 목록 / 신규 등록 — 백엔드 /api/ext-systems 프록시. 인증키는 서버 생성·1회 노출.
import { NextResponse } from "next/server";
import { backendProxy } from "@/lib/bff";
import type { ExtSystem } from "@/types/api";

export async function GET() {
  const { status, body } = await backendProxy("/api/ext-systems");
  if (!body?.ok) {
    return NextResponse.json(
      { ok: false, message: body?.message ?? "INTERNAL_ERROR" },
      { status },
    );
  }
  return NextResponse.json({ ok: true, items: (body.data as { items: ExtSystem[] }).items });
}

export async function POST(req: Request) {
  const reqBody = await req.json().catch(() => ({}));
  const { status, body } = await backendProxy("/api/ext-systems", {
    method: "POST",
    body: reqBody,
  });
  if (!body?.ok) {
    return NextResponse.json(
      { ok: false, message: body?.message ?? "INTERNAL_ERROR", issues: body?.issues },
      { status },
    );
  }
  // 백엔드 create 응답 = { extSystem, freshCertKey }. 화면은 data.freshCertKey 를 읽어 1회 노출.
  const data = body.data as { extSystem: ExtSystem; freshCertKey: string };
  return NextResponse.json(
    { ok: true, extSystem: data.extSystem, freshCertKey: data.freshCertKey },
    { status: 201 },
  );
}
