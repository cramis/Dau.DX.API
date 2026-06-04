// 모니터링 KPI + 분당 시리즈 — 백엔드 /api/monitoring/stats 프록시. StatsResult 를 평탄화 전달.
import { NextResponse } from "next/server";
import { backendProxy } from "@/lib/bff";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const { status, body } = await backendProxy("/api/monitoring/stats", {
    query: { windowMin: url.searchParams.get("windowMin") },
  });
  if (!body?.ok) {
    return NextResponse.json(
      { ok: false, message: body?.message ?? "INTERNAL_ERROR" },
      { status },
    );
  }
  // StatsResult 는 mockup statsSnapshot 과 동필드(windowMin 포함) → 화면 기대대로 평탄화.
  return NextResponse.json({ ok: true, ...(body.data as object) });
}
