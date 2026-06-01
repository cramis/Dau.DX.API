// 데이터소스 목록 조회 / 신규 등록 — 백엔드 /api/datasources 프록시.
import { NextResponse } from "next/server";
import { backendProxy } from "@/lib/bff";
import type { DataSource } from "@/types/api";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const { status, body } = await backendProxy("/api/datasources", {
    query: { q: url.searchParams.get("q") },
  });
  if (!body?.ok) {
    return NextResponse.json(
      { ok: false, message: body?.message ?? "INTERNAL_ERROR" },
      { status },
    );
  }
  return NextResponse.json({ ok: true, items: (body.data as { items: DataSource[] }).items });
}

export async function POST(req: Request) {
  const reqBody = await req.json().catch(() => ({}));
  const { status, body } = await backendProxy("/api/datasources", {
    method: "POST",
    body: reqBody,
  });
  if (!body?.ok) {
    return NextResponse.json(
      { ok: false, message: body?.message ?? "INTERNAL_ERROR", issues: body?.issues },
      { status },
    );
  }
  return NextResponse.json({ ok: true, dataSource: body.data as DataSource }, { status: 201 });
}
