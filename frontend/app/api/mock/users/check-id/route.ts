// 회원가입 화면의 ID 중복 확인 라우트.
import { NextResponse } from "next/server";
import { mockData } from "@/lib/mockData";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json(
      { available: false, message: "ID 가 비어있습니다." },
      { status: 400 }
    );
  }
  const exists = mockData.users.some((u) => u.id === id);
  return NextResponse.json({ available: !exists });
}
