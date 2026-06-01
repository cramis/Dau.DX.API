// USER_SIGNUP 승인 — 백엔드 프록시. 부수효과(사용자 ACTIVE 전환)는 백엔드가 수행.
import { NextResponse } from "next/server";
import { backendProxy } from "@/lib/bff";
import type { Approval } from "@/types/api";

type Ctx = { params: Promise<{ seq: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const { seq } = await params;
  const { status, body } = await backendProxy(`/api/approvals/user/${seq}/approve`, {
    method: "POST",
  });
  if (!body?.ok) {
    return NextResponse.json(
      { ok: false, message: body?.message ?? "INTERNAL_ERROR" },
      { status },
    );
  }
  return NextResponse.json({ ok: true, approval: body.data as Approval });
}
