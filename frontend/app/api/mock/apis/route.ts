// API 정의 목록 조회 / 신규 등록 — 백엔드 /api/apis 프록시. no 는 서버 채번.
import { NextResponse } from "next/server";
import { backendProxy } from "@/lib/bff";
import type { ApiDef } from "@/types/api";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const { status, body } = await backendProxy("/api/apis", {
    query: { q: url.searchParams.get("q") },
  });
  if (!body?.ok) {
    return NextResponse.json(
      { ok: false, message: body?.message ?? "INTERNAL_ERROR" },
      { status },
    );
  }
  return NextResponse.json({ ok: true, items: (body.data as { items: ApiDef[] }).items });
}

export async function POST(req: Request) {
  const reqBody = await req.json().catch(() => ({}));
  const { status, body } = await backendProxy("/api/apis", {
    method: "POST",
    body: reqBody,
  });
  if (!body?.ok) {
    return NextResponse.json(
      { ok: false, message: body?.message ?? "INTERNAL_ERROR", issues: body?.issues },
      { status },
    );
  }
  return NextResponse.json({ ok: true, api: body.data as ApiDef }, { status: 201 });
}
