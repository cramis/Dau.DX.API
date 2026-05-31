// 모니터링 — 호출 이력 조회. 필터: q / statusCode / apiNo / extSysId / from / to / limit.
import { NextResponse } from "next/server";
import { listCalls } from "@/lib/mockHistory";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const statusCodeRaw = url.searchParams.get("statusCode");
  const statusCode = statusCodeRaw ? Number(statusCodeRaw) : undefined;
  const apiNo = url.searchParams.get("apiNo") ?? undefined;
  const extSysId = url.searchParams.get("extSysId") ?? undefined;
  const fromIso = url.searchParams.get("from") ?? undefined;
  const toIso = url.searchParams.get("to") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? 200);

  const items = listCalls({ q, statusCode, apiNo, extSysId, fromIso, toIso, limit });
  return NextResponse.json({ ok: true, items });
}
