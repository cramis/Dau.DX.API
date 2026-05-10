// 관리자 사용자 단건 조회 / 상태 변경. id 는 user.id (예: user01).
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/mockAuth";
import { mockData } from "@/lib/mockData";
import { userStatusSchema } from "@/types/api";

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  status: userStatusSchema,
});

export async function GET(_req: Request, { params }: Ctx) {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "FORBIDDEN" }, { status: 403 });
  }
  const { id } = await params;
  const u = mockData.users.find((x) => x.id === id);
  if (!u) {
    return NextResponse.json({ ok: false, message: "NOT_FOUND" }, { status: 404 });
  }
  const { password: _password, ...rest } = u;
  return NextResponse.json({ ok: true, user: rest });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "FORBIDDEN" }, { status: 403 });
  }
  const { id } = await params;
  const idx = mockData.users.findIndex((x) => x.id === id);
  if (idx < 0) {
    return NextResponse.json({ ok: false, message: "NOT_FOUND" }, { status: 404 });
  }
  if (mockData.users[idx].id === me.id) {
    return NextResponse.json(
      { ok: false, message: "CANNOT_UPDATE_SELF" },
      { status: 409 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  mockData.users[idx] = {
    ...mockData.users[idx],
    status: parsed.data.status,
  };
  const { password: _password, ...rest } = mockData.users[idx];
  return NextResponse.json({ ok: true, user: rest });
}
