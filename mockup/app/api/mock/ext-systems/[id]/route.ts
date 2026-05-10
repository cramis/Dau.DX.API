// 단건 연계시스템 조회·수정·삭제 라우트.
import { NextResponse } from "next/server";
import { mockData } from "@/lib/mockData";
import { extSystemUpdateSchema } from "@/lib/schemas/extSystem";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const e = mockData.extSystems.find((x) => x.id === id);
  if (!e) {
    return NextResponse.json({ ok: false, message: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, extSystem: e });
}

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const idx = mockData.extSystems.findIndex((x) => x.id === id);
  if (idx < 0) {
    return NextResponse.json({ ok: false, message: "NOT_FOUND" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = extSystemUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  if (mockData.extSystems.some((e, i) => i !== idx && e.name === parsed.data.name)) {
    return NextResponse.json({ ok: false, message: "NAME_EXISTS" }, { status: 409 });
  }
  // certKey 는 별도 regenerate 라우트로만 갱신.
  const prev = mockData.extSystems[idx];
  mockData.extSystems[idx] = { id, certKey: prev.certKey, ...parsed.data };
  return NextResponse.json({ ok: true, extSystem: mockData.extSystems[idx] });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const idx = mockData.extSystems.findIndex((x) => x.id === id);
  if (idx < 0) {
    return NextResponse.json({ ok: false, message: "NOT_FOUND" }, { status: 404 });
  }
  mockData.extSystems.splice(idx, 1);
  return NextResponse.json({ ok: true });
}
