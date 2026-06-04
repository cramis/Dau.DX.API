// 데이터소스 hot-swap 영향도 — 백엔드 /api/datasources/{id}/swap/impact 프록시.
import { NextResponse } from "next/server";
import { backendProxy } from "@/lib/bff";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const { status, body } = await backendProxy(`/api/datasources/${id}/swap/impact`);
  if (!body?.ok) {
    return NextResponse.json({ ok: false, message: body?.message ?? "INTERNAL_ERROR" }, { status });
  }
  return NextResponse.json({ ok: true, ...(body.data as object) });
}
