// 데이터소스 hot-swap 실행 — 백엔드 /api/datasources/{id}/swap/run 프록시(graceful 교체).
import { NextResponse } from "next/server";
import { backendProxy } from "@/lib/bff";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const reqBody = await req.json().catch(() => ({}));
  const { status, body } = await backendProxy(`/api/datasources/${id}/swap/run`, {
    method: "POST",
    body: reqBody,
  });
  if (!body?.ok) {
    return NextResponse.json(
      { ok: false, message: body?.message ?? "INTERNAL_ERROR", issues: body?.issues },
      { status },
    );
  }
  return NextResponse.json({ ok: true, ...(body.data as object) });
}
