// 단건 데이터소스 조회·수정·삭제 라우트.
import { NextResponse } from "next/server";
import { mockData } from "@/lib/mockData";
import { dataSourceUpdateSchema } from "@/lib/schemas/datasource";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const ds = mockData.dataSources.find((d) => d.id === id);
  if (!ds) {
    return NextResponse.json({ ok: false, message: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, dataSource: ds });
}

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const idx = mockData.dataSources.findIndex((d) => d.id === id);
  if (idx < 0) {
    return NextResponse.json({ ok: false, message: "NOT_FOUND" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = dataSourceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  if (
    mockData.dataSources.some((d, i) => i !== idx && d.name === parsed.data.name)
  ) {
    return NextResponse.json(
      { ok: false, message: "NAME_EXISTS" },
      { status: 409 },
    );
  }
  mockData.dataSources[idx] = { id, ...parsed.data };
  return NextResponse.json({ ok: true, dataSource: mockData.dataSources[idx] });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const idx = mockData.dataSources.findIndex((d) => d.id === id);
  if (idx < 0) {
    return NextResponse.json({ ok: false, message: "NOT_FOUND" }, { status: 404 });
  }
  // 매핑된 API 가 있는지 차단 — Mockup 단계에서도 데이터 무결성 체크.
  const mappedApi = mockData.apis.find((a) => a.dataSrcId === id);
  if (mappedApi) {
    return NextResponse.json(
      {
        ok: false,
        message: "IN_USE",
        detail: `API "${mappedApi.name}" 가 사용 중입니다.`,
      },
      { status: 409 },
    );
  }
  mockData.dataSources.splice(idx, 1);
  return NextResponse.json({ ok: true });
}
