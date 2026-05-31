// 모니터링 — KPI + 분당 시리즈. ?windowMin=60 (기본). 200/4xx/5xx 분리.
import { NextResponse } from "next/server";
import { statsSnapshot } from "@/lib/mockHistory";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const windowMin = Math.min(180, Math.max(5, Number(url.searchParams.get("windowMin") ?? 60)));
  const snap = statsSnapshot(windowMin);
  return NextResponse.json({ ok: true, ...snap, windowMin });
}
