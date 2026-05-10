// 연계시스템 일괄 import. admin 전용. 인증키(certKey) 누락 시 신규는 자동 발급, 수정은 기존 키 유지.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/mockAuth";
import {
  applyExtSystemImportPlan,
  extSystemImportEnvelopeSchema,
  planExtSystemImport,
} from "@/lib/bulkImport";

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "FORBIDDEN" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = extSystemImportEnvelopeSchema.safeParse(body);
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
    ? planExtSystemImport(parsed.data)
    : applyExtSystemImportPlan(parsed.data);
  return NextResponse.json({ ...result, dryRun }, { status: result.ok ? 200 : 422 });
}
