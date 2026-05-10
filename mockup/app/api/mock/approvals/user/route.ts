// USER_SIGNUP 승인 대기 목록.
import { NextResponse } from "next/server";
import { mockData } from "@/lib/mockData";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const items = mockData.approvals
    .filter((a) => a.type === "USER_SIGNUP")
    .filter((a) => (status ? a.status === status : true))
    .sort((a, b) => b.seq - a.seq);
  return NextResponse.json({ ok: true, items });
}
