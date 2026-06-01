// 단건 API 정의 조회·수정·삭제 — 백엔드 /api/apis/{id} 프록시. id 는 apiDef.no. 자식 params/resps 전체 교체.
import { NextResponse } from "next/server";
import { backendProxy } from "@/lib/bff";
import type { ApiDef } from "@/types/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const { status, body } = await backendProxy(`/api/apis/${id}`);
  if (!body?.ok) {
    return NextResponse.json(
      { ok: false, message: body?.message ?? "NOT_FOUND" },
      { status },
    );
  }
  return NextResponse.json({ ok: true, api: body.data as ApiDef });
}

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const reqBody = await req.json().catch(() => ({}));
  const { status, body } = await backendProxy(`/api/apis/${id}`, {
    method: "PUT",
    body: reqBody,
  });
  if (!body?.ok) {
    return NextResponse.json(
      { ok: false, message: body?.message ?? "INTERNAL_ERROR", issues: body?.issues },
      { status },
    );
  }
  return NextResponse.json({ ok: true, api: body.data as ApiDef });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const { status, body } = await backendProxy(`/api/apis/${id}`, {
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
