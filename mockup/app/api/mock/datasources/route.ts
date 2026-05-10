// 데이터소스 목록 조회 / 신규 등록 라우트.
import { NextResponse } from "next/server";
import { mockData } from "@/lib/mockData";
import { dataSourceCreateSchema } from "@/lib/schemas/datasource";

function nextDsId(): string {
  // DS + YYYYMMDD + 일련번호 3자리. 시드와 동일 포맷 유지.
  const t = new Date();
  const ymd =
    t.getFullYear().toString() +
    (t.getMonth() + 1).toString().padStart(2, "0") +
    t.getDate().toString().padStart(2, "0");
  const prefix = `DS${ymd}`;
  let max = 0;
  for (const d of mockData.dataSources) {
    if (!d.id.startsWith(prefix)) continue;
    const seq = Number(d.id.slice(prefix.length));
    if (Number.isFinite(seq) && seq > max) max = seq;
  }
  return `${prefix}${(max + 1).toString().padStart(3, "0")}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const list = q
    ? mockData.dataSources.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.jdbcUrl.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q),
      )
    : mockData.dataSources;
  return NextResponse.json({ ok: true, items: list });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = dataSourceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  if (mockData.dataSources.some((d) => d.name === parsed.data.name)) {
    return NextResponse.json(
      { ok: false, message: "NAME_EXISTS" },
      { status: 409 },
    );
  }
  const created = { id: nextDsId(), ...parsed.data };
  mockData.dataSources.push(created);
  return NextResponse.json({ ok: true, dataSource: created }, { status: 201 });
}
