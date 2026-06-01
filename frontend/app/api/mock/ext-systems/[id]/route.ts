// 단건 연계시스템 조회·수정·삭제 — 백엔드 /api/ext-systems/{id} 프록시. certKey 는 regenerate 로만 갱신.
import { NextResponse } from "next/server";
import { backendProxy } from "@/lib/bff";
import type { ExtSystem } from "@/types/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const { status, body } = await backendProxy(`/api/ext-systems/${id}`);
  if (!body?.ok) {
    return NextResponse.json(
      { ok: false, message: body?.message ?? "NOT_FOUND" },
      { status },
    );
  }
  return NextResponse.json({ ok: true, extSystem: body.data as ExtSystem });
}

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const reqBody = await req.json().catch(() => ({}));
  const { status, body } = await backendProxy(`/api/ext-systems/${id}`, {
    method: "PUT",
    body: reqBody,
  });
  if (!body?.ok) {
    return NextResponse.json(
      { ok: false, message: body?.message ?? "INTERNAL_ERROR", issues: body?.issues },
      { status },
    );
  }
  return NextResponse.json({ ok: true, extSystem: body.data as ExtSystem });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const { status, body } = await backendProxy(`/api/ext-systems/${id}`, {
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
