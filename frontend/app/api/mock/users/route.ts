// 관리자 사용자 목록 — 백엔드 GET /api/users 프록시. admin 권한·password 제거는 백엔드가 수행.
import { NextResponse } from "next/server";
import { backendProxy } from "@/lib/bff";
import type { User } from "@/types/api";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const { status, body } = await backendProxy("/api/users", {
    query: {
      q: url.searchParams.get("q"),
      status: url.searchParams.get("status"),
    },
  });
  if (!body?.ok) {
    return NextResponse.json(
      { ok: false, message: body?.message ?? "INTERNAL_ERROR" },
      { status },
    );
  }
  const items = (body.data as { items: User[] }).items;
  return NextResponse.json({ ok: true, items });
}
