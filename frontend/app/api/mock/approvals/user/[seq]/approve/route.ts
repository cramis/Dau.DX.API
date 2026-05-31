// USER_SIGNUP 승인 — user.status 를 ACTIVE 로 전환.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/mockAuth";
import { mockData } from "@/lib/mockData";

type Ctx = { params: Promise<{ seq: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "FORBIDDEN" }, { status: 403 });
  }
  const { seq } = await params;
  const idx = mockData.approvals.findIndex(
    (a) => a.seq === Number(seq) && a.type === "USER_SIGNUP",
  );
  if (idx < 0) {
    return NextResponse.json({ ok: false, message: "NOT_FOUND" }, { status: 404 });
  }
  const appr = mockData.approvals[idx];
  if (appr.status !== "PENDING") {
    return NextResponse.json(
      { ok: false, message: "ALREADY_PROCESSED" },
      { status: 409 },
    );
  }
  const userIdx = mockData.users.findIndex((u) => u.id === appr.targetId);
  if (userIdx >= 0) {
    mockData.users[userIdx] = {
      ...mockData.users[userIdx],
      status: "ACTIVE",
    };
  }
  mockData.approvals[idx] = {
    ...appr,
    status: "APPROVED",
    reviewerId: user.id,
    processedAt: new Date().toISOString(),
  };
  return NextResponse.json({ ok: true, approval: mockData.approvals[idx] });
}
