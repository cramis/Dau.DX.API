// API_USAGE 승인 — extSystem.mappedApis 에 targetId 추가.
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
    (a) => a.seq === Number(seq) && a.type === "API_USAGE",
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
  // applicantId 가 extSystem.id, targetId 가 api.no 인 구조.
  const ext = mockData.extSystems.find((e) => e.id === appr.applicantId);
  if (ext && !ext.mappedApis.includes(appr.targetId)) {
    ext.mappedApis = [...ext.mappedApis, appr.targetId];
  }
  mockData.approvals[idx] = {
    ...appr,
    status: "APPROVED",
    reviewerId: user.id,
    processedAt: new Date().toISOString(),
  };
  return NextResponse.json({ ok: true, approval: mockData.approvals[idx] });
}
