// 관리자 사용자 목록 — admin 권한 필요. password 는 응답에서 제거.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/mockAuth";
import { mockData } from "@/lib/mockData";

export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "FORBIDDEN" }, { status: 403 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const status = url.searchParams.get("status");

  const items = mockData.users
    .filter((u) =>
      q
        ? u.id.toLowerCase().includes(q) ||
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.dept.toLowerCase().includes(q)
        : true,
    )
    .filter((u) => (status ? u.status === status : true))
    // password 마스킹 — 응답에 평문 노출 금지.
    .map(({ password: _password, ...rest }) => rest);

  return NextResponse.json({ ok: true, items });
}
