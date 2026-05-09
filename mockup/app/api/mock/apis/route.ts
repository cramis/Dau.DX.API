// API 목록 조회 / 신규 등록 라우트.
import { NextResponse } from "next/server";
import { mockData } from "@/lib/mockData";
import { apiCreateSchema } from "@/lib/schemas/api";

function nextApiNo(): string {
  // A + YYYYMMDD + 일련번호 3자리. 시드와 동일 포맷 유지.
  const today = new Date();
  const yyyymmdd =
    today.getFullYear().toString() +
    (today.getMonth() + 1).toString().padStart(2, "0") +
    today.getDate().toString().padStart(2, "0");
  const prefix = `A${yyyymmdd}`;
  const todays = mockData.apis.filter((a) => a.no.startsWith(prefix));
  let max = 0;
  for (const api of todays) {
    const seq = Number(api.no.slice(prefix.length));
    if (Number.isFinite(seq) && seq > max) max = seq;
  }
  return `${prefix}${(max + 1).toString().padStart(3, "0")}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const list = q
    ? mockData.apis.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.path.toLowerCase().includes(q) ||
          a.no.toLowerCase().includes(q) ||
          a.group.toLowerCase().includes(q)
      )
    : mockData.apis;
  return NextResponse.json({ ok: true, items: list });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = apiCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  if (mockData.apis.some((a) => a.path === parsed.data.path)) {
    return NextResponse.json(
      { ok: false, message: "PATH_EXISTS" },
      { status: 409 }
    );
  }
  const created = { no: nextApiNo(), ...parsed.data };
  mockData.apis.push(created);
  return NextResponse.json({ ok: true, api: created }, { status: 201 });
}
