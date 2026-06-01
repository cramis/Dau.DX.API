// 사용자 가입(USER_SIGNUP) 승인 목록 — 백엔드 /api/approvals/user 프록시.
import { NextResponse } from "next/server";
import { backendProxy } from "@/lib/bff";
import type { Approval } from "@/types/api";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const { status, body } = await backendProxy("/api/approvals/user", {
    query: { status: url.searchParams.get("status") },
  });
  if (!body?.ok) {
    return NextResponse.json(
      { ok: false, message: body?.message ?? "INTERNAL_ERROR" },
      { status },
    );
  }
  return NextResponse.json({ ok: true, items: (body.data as { items: Approval[] }).items });
}
