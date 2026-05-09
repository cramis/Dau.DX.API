// Mockup 전용 로그아웃 라우트. mock-jwt 쿠키만 폐기한다.
import { NextResponse } from "next/server";
import { clearMockJwt } from "@/lib/mockAuth";

export async function POST() {
  await clearMockJwt();
  return NextResponse.json({ ok: true });
}
