// API 등록·수정 화면의 path 중복 확인 라우트. 수정 시 자기 자신은 제외(excludeNo).
import { NextResponse } from "next/server";
import { mockData } from "@/lib/mockData";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const path = url.searchParams.get("path")?.trim() ?? "";
  const excludeNo = url.searchParams.get("excludeNo")?.trim() ?? "";
  if (!path) {
    return NextResponse.json(
      { available: false, message: "path 가 비어있습니다." },
      { status: 400 }
    );
  }
  const conflict = mockData.apis.some(
    (a) => a.path === path && a.no !== excludeNo
  );
  return NextResponse.json({ available: !conflict });
}
