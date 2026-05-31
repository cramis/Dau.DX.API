// 회원가입 신청 라우트. PENDING 상태로 mockData 에 추가, 관리자 승인 후 ACTIVE 가 된다.
import { NextResponse } from "next/server";
import { mockData } from "@/lib/mockData";
import { signupSchema } from "@/lib/schemas/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id, password, name, phone, email, org, dept, tel } = parsed.data;
  if (mockData.users.some((u) => u.id === id)) {
    return NextResponse.json({ ok: false, message: "ID_EXISTS" }, { status: 409 });
  }

  mockData.users.push({
    id,
    password,
    name,
    phone,
    email,
    org,
    dept,
    tel,
    role: "USER",
    status: "PENDING",
  });

  return NextResponse.json({ ok: true });
}
