// 데이터소스 일괄 import. admin 전용 — 검증 후 일괄 적용 (검증 실패 시 mutation 0).
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/mockAuth";
import {
  applyDataSourceImportPlan,
  dataSourceImportEnvelopeSchema,
  planDataSourceImport,
} from "@/lib/bulkImport";

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "FORBIDDEN" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = dataSourceImportEnvelopeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "INVALID_ENVELOPE",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const result = dryRun
    ? planDataSourceImport(parsed.data)
    : applyDataSourceImportPlan(parsed.data);
  return NextResponse.json({ ...result, dryRun }, { status: result.ok ? 200 : 422 });
}
