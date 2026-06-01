// 모니터링 호출 이력 조회 — 백엔드 /api/monitoring/history 프록시. 필터 그대로 전달.
import { NextResponse } from "next/server";
import { backendProxy } from "@/lib/bff";
import type { CallHistory } from "@/types/api";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const { status, body } = await backendProxy("/api/monitoring/history", {
    query: {
      q: url.searchParams.get("q"),
      statusCode: url.searchParams.get("statusCode"),
      apiNo: url.searchParams.get("apiNo"),
      extSysId: url.searchParams.get("extSysId"),
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      limit: url.searchParams.get("limit"),
    },
  });
  if (!body?.ok) {
    return NextResponse.json(
      { ok: false, message: body?.message ?? "INTERNAL_ERROR" },
      { status },
    );
  }
  return NextResponse.json({ ok: true, items: (body.data as { items: CallHistory[] }).items });
}
