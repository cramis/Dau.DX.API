// 관리자 사용자 단건 조회 / 상태 변경 — 백엔드 /api/users/{id} 프록시.
// 화면은 PATCH {status} 로 호출, 백엔드는 PUT {role?,status?} → BFF 가 변환.
import { NextResponse } from "next/server";
import { backendProxy } from "@/lib/bff";
import type { User } from "@/types/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const { status, body } = await backendProxy(`/api/users/${id}`);
  if (!body?.ok) {
    return NextResponse.json(
      { ok: false, message: body?.message ?? "NOT_FOUND" },
      { status },
    );
  }
  return NextResponse.json({ ok: true, user: body.data as User });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const reqBody = await req.json().catch(() => ({}));
  const { status, body } = await backendProxy(`/api/users/${id}`, {
    method: "PUT",
    body: { status: reqBody?.status },
  });
  if (!body?.ok) {
    return NextResponse.json(
      { ok: false, message: body?.message ?? "INTERNAL_ERROR" },
      { status },
    );
  }
  return NextResponse.json({ ok: true, user: body.data as User });
}
