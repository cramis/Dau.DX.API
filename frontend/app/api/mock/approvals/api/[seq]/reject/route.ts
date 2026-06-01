// API_USAGE 반려 — 백엔드 프록시. reason(선택) 전달.
import { NextResponse } from "next/server";
import { backendProxy } from "@/lib/bff";
import type { Approval } from "@/types/api";

type Ctx = { params: Promise<{ seq: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { seq } = await params;
  const reqBody = await req.json().catch(() => null);
  const { status, body } = await backendProxy(`/api/approvals/api/${seq}/reject`, {
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
