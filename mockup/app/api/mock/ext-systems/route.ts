// 연계시스템 목록 / 신규 등록 라우트.
import { NextResponse } from "next/server";
import { mockData } from "@/lib/mockData";
import { extSystemCreateSchema } from "@/lib/schemas/extSystem";
import { generateCertKey } from "@/lib/certKey";

function nextExtId(): string {
  const t = new Date();
  const ymd =
    t.getFullYear().toString() +
    (t.getMonth() + 1).toString().padStart(2, "0") +
    t.getDate().toString().padStart(2, "0");
  const prefix = `E${ymd}`;
  let max = 0;
  for (const e of mockData.extSystems) {
    if (!e.id.startsWith(prefix)) continue;
    const seq = Number(e.id.slice(prefix.length));
    if (Number.isFinite(seq) && seq > max) max = seq;
  }
  return `${prefix}${(max + 1).toString().padStart(3, "0")}`;
}

export async function GET() {
  return NextResponse.json({ ok: true, items: mockData.extSystems });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = extSystemCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  if (mockData.extSystems.some((e) => e.name === parsed.data.name)) {
    return NextResponse.json(
      { ok: false, message: "NAME_EXISTS" },
      { status: 409 },
    );
  }
  const id = nextExtId();
  const certKey = generateCertKey(id);
  const created = { id, certKey, ...parsed.data };
  mockData.extSystems.push(created);
  // 인증키는 "1회 노출" 흐름 — UI 에서 다이얼로그로 표시 후 다시 못 보게 한다.
  return NextResponse.json(
    { ok: true, extSystem: created, freshCertKey: certKey },
    { status: 201 },
  );
}
