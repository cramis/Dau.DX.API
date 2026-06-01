// API 경로 중복 확인 — 백엔드 /api/apis/check-path 프록시. 수정 시 자기 자신은 제외(excludeNo).
import { NextResponse } from "next/server";
import { backendProxy } from "@/lib/bff";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const path = url.searchParams.get("path")?.trim() ?? "";
  const excludeNo = url.searchParams.get("excludeNo")?.trim() ?? "";
  if (!path) {
    return NextResponse.json(
      { available: false, message: "path 가 비어있습니다." },
      { status: 400 },
    );
  }
  const { body } = await backendProxy("/api/apis/check-path", { query: { path } });
  let available = body?.ok ? Boolean((body.data as { available: boolean }).available) : false;
  // 백엔드 check-path 는 excludeNo 미지원 → 수정 모드에서 자기 자신 경로를 충돌로 오판하지 않게 보정.
  if (!available && excludeNo) {
    const { body: own } = await backendProxy(`/api/apis/${excludeNo}`);
    if (own?.ok && (own.data as { path?: string }).path === path) {
      available = true;
    }
  }
  return NextResponse.json({ available });
}
