// Mockup 전용 로그인 라우트. Day 1 은 임시 (ID 만 받아 mock-jwt 쿠키 발급), Day 2 에 PW 검증 추가.
import { NextResponse } from "next/server";
import { mockData } from "@/lib/mockData";
import { setMockJwt } from "@/lib/mockAuth";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { id?: string };
  const id = body.id?.trim() ?? "";
  const user = mockData.users.find((u) => u.id === id);

  if (!user) {
    return NextResponse.json({ ok: false, message: "USER_NOT_FOUND" }, { status: 401 });
  }
  if (user.status !== "ACTIVE") {
    return NextResponse.json({ ok: false, message: "USER_NOT_ACTIVE" }, { status: 403 });
  }

  await setMockJwt(user.id);
  return NextResponse.json({ ok: true, user });
}
