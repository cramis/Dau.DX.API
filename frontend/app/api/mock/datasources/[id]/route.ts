// 단건 데이터소스 조회·수정·삭제 — 백엔드 /api/datasources/{id} 프록시.
import { NextResponse } from "next/server";
import { backendProxy } from "@/lib/bff";
import type { DataSource } from "@/types/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const { status, body } = await backendProxy(`/api/datasources/${id}`);
  if (!body?.ok) {
    return NextResponse.json(
      { ok: false, message: body?.message ?? "NOT_FOUND" },
      { status },
    );
  }
  return NextResponse.json({ ok: true, dataSource: body.data as DataSource });
}

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const reqBody = await req.json().catch(() => ({}));
  const { status, body } = await backendProxy(`/api/datasources/${id}`, {
    method: "PUT",
    body: reqBody,
  });
  if (!body?.ok) {
    return NextResponse.json(
      { ok: false, message: body?.message ?? "INTERNAL_ERROR", issues: body?.issues },
      { status },
    );
  }
  return NextResponse.json({ ok: true, dataSource: body.data as DataSource });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const { status, body } = await backendProxy(`/api/datasources/${id}`, {
    method: "DELETE",
  });
  if (!body?.ok) {
    return NextResponse.json(
      { ok: false, message: body?.message ?? "INTERNAL_ERROR" },
      { status },
    );
  }
  return NextResponse.json({ ok: true });
}
