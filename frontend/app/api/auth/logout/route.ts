// BFF 로그아웃. 백엔드에 refresh 폐기 요청 후 세션 쿠키 제거.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BACKEND_URL, COOKIE_RT } from "@/lib/backend";
import { clearSession } from "@/lib/mockAuth";

export async function POST() {
  const store = await cookies();
  const rt = store.get(COOKIE_RT)?.value;
  if (rt) {
    await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
      cache: "no-store",
    }).catch(() => null);
  }
  await clearSession();
  return NextResponse.json({ ok: true });
}
