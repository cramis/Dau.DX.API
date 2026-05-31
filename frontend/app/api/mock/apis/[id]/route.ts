// 단건 API 정의 조회·수정·삭제 라우트. id 는 apiDef.no.
import { NextResponse } from "next/server";
import { mockData } from "@/lib/mockData";
import { apiUpdateSchema } from "@/lib/schemas/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const api = mockData.apis.find((a) => a.no === id);
  if (!api) {
    return NextResponse.json({ ok: false, message: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, api });
}

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const idx = mockData.apis.findIndex((a) => a.no === id);
  if (idx < 0) {
    return NextResponse.json({ ok: false, message: "NOT_FOUND" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = apiUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  if (
    mockData.apis.some((a, i) => i !== idx && a.path === parsed.data.path)
  ) {
    return NextResponse.json(
      { ok: false, message: "PATH_EXISTS" },
      { status: 409 }
    );
  }
  mockData.apis[idx] = { no: id, ...parsed.data };
  return NextResponse.json({ ok: true, api: mockData.apis[idx] });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const idx = mockData.apis.findIndex((a) => a.no === id);
  if (idx < 0) {
    return NextResponse.json({ ok: false, message: "NOT_FOUND" }, { status: 404 });
  }
  mockData.apis.splice(idx, 1);
  return NextResponse.json({ ok: true });
}
