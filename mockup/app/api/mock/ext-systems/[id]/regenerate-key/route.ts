// 연계시스템 인증키 재발급 — 새 키를 1회만 응답으로 노출.
import { NextResponse } from "next/server";
import { mockData } from "@/lib/mockData";
import { generateCertKey } from "@/lib/certKey";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const idx = mockData.extSystems.findIndex((x) => x.id === id);
  if (idx < 0) {
    return NextResponse.json({ ok: false, message: "NOT_FOUND" }, { status: 404 });
  }
  const fresh = generateCertKey(id);
  mockData.extSystems[idx] = { ...mockData.extSystems[idx], certKey: fresh };
  return NextResponse.json({
    ok: true,
    extSystem: mockData.extSystems[idx],
    freshCertKey: fresh,
  });
}
