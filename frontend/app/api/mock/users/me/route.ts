// 본인 정보 조회·수정 라우트.
import { NextResponse } from "next/server";
import { mockData } from "@/lib/mockData";
import { getCurrentUser } from "@/lib/mockAuth";
import { updateProfileSchema } from "@/lib/schemas/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }
  const { password: _pw, ...safe } = user;
  return NextResponse.json({ ok: true, user: safe });
}

export async function PUT(req: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const idx = mockData.users.findIndex((u) => u.id === current.id);
  if (idx < 0) {
    return NextResponse.json({ ok: false, message: "USER_NOT_FOUND" }, { status: 404 });
  }
  mockData.users[idx] = { ...mockData.users[idx], ...parsed.data };
  const { password: _pw, ...safe } = mockData.users[idx];
  return NextResponse.json({ ok: true, user: safe });
}
