// 본인 비밀번호 변경 라우트. 현재 비밀번호 검증 후 신규로 교체한다.
import { NextResponse } from "next/server";
import { mockData } from "@/lib/mockData";
import { getCurrentUser } from "@/lib/mockAuth";
import { changePasswordSchema } from "@/lib/schemas/auth";

export async function PUT(req: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  if (current.password !== parsed.data.currentPassword) {
    return NextResponse.json(
      { ok: false, message: "WRONG_PASSWORD" },
      { status: 400 }
    );
  }
  const idx = mockData.users.findIndex((u) => u.id === current.id);
  mockData.users[idx].password = parsed.data.newPassword;
  return NextResponse.json({ ok: true });
}
