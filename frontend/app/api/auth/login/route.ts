// BFF 로그인. 백엔드 인증 후 JWT 를 httpOnly 쿠키로 저장하고 화면엔 user 만 반환.
import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/backend";
import { setSession } from "@/lib/mockAuth";

export async function POST(req: Request) {
  const body = await req.text();
  const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": req.headers.get("x-forwarded-for") ?? "",
    },
    body,
    cache: "no-store",
  }).catch(() => null);

  if (!res) {
    return NextResponse.json({ ok: false, message: "BACKEND_UNREACHABLE" }, { status: 502 });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    return NextResponse.json(
      { ok: false, message: data?.message ?? "INTERNAL_ERROR" },
      { status: res.status || 500 }
    );
  }

  await setSession(data.data.accessToken, data.data.refreshToken);
  return NextResponse.json({ ok: true, user: data.data.user });
}
