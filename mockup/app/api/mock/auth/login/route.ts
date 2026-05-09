// Mockup 전용 로그인 라우트. ID + 비밀번호 검증 후 mock-jwt 쿠키를 발급한다.
import { NextResponse } from "next/server";
import { mockData } from "@/lib/mockData";
import { setMockJwt } from "@/lib/mockAuth";
import { loginSchema } from "@/lib/schemas/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id, password } = parsed.data;
  const user = mockData.users.find((u) => u.id === id);
  if (!user || user.password !== password) {
    return NextResponse.json(
      { ok: false, message: "INVALID_CREDENTIALS" },
      { status: 401 }
    );
  }
  if (user.status !== "ACTIVE") {
    return NextResponse.json(
      { ok: false, message: "USER_NOT_ACTIVE" },
      { status: 403 }
    );
  }

  await setMockJwt(user.id);
  const { password: _pw, ...safe } = user;
  return NextResponse.json({ ok: true, user: safe });
}
