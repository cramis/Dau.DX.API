// USER_SIGNUP 반려 — 백엔드 프록시. reason(선택) 전달. 부수효과(사용자 REJECTED)는 백엔드 수행.
import { NextResponse } from "next/server";
import { backendProxy } from "@/lib/bff";
import type { Approval } from "@/types/api";

type Ctx = { params: Promise<{ seq: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { seq } = await params;
  const reqBody = await req.json().catch(() => null);
  const { status, body } = await backendProxy(`/api/approvals/user/${seq}/reject`, {
    method: "POST",
    body: reqBody ?? undefined,
  });
  if (!body?.ok) {
    return NextResponse.json(
      { ok: false, message: body?.message ?? "INTERNAL_ERROR" },
      { status },
    );
  }
  return NextResponse.json({ ok: true, approval: body.data as Approval });
}
