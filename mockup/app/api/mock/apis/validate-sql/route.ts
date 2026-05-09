// SQL 검증 mock. 실제 DB 연결 없이 형식만 보고 plan 문자열을 흉내낸다.
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const sql = typeof body?.sql === "string" ? body.sql.trim() : "";
  if (!sql) {
    return NextResponse.json(
      { ok: false, message: "EMPTY_SQL" },
      { status: 400 }
    );
  }
  const verb = sql.split(/\s+/)[0]?.toUpperCase() ?? "?";
  // bind variable #{name} 카운트 — 입력 파라미터 매칭 단서로 사용 가능.
  const binds: string[] = [];
  for (const m of sql.matchAll(/#\{(\w+)\}/g)) binds.push(m[1]);
  const plan = `Plan: ${verb} | binds=[${binds.join(", ")}] | est_rows≈${
    verb === "SELECT" ? 100 : 1
  }`;
  return NextResponse.json({ ok: true, plan, verb, binds });
}
