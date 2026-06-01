// API_USAGE 승인 — 백엔드 프록시. 부수효과(연계시스템 mappedApis 추가)는 백엔드가 수행.
import { NextResponse } from "next/server";
import { backendProxy } from "@/lib/bff";
import type { Approval } from "@/types/api";

type Ctx = { params: Promise<{ seq: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const { seq } = await params;
  const { status, body } = await backendProxy(`/api/approvals/api/${seq}/approve`, {
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
