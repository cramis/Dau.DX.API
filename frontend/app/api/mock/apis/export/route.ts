// API 일괄 export — 현재 mockData.apis 를 import 호환 envelope 으로 직렬화.
// admin 전용. 일반 사용자는 /docs 의 매핑 API 만 보이므로 export 권한 없음.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/mockAuth";
import { exportApiEnvelope } from "@/lib/bulkImport";

export async function GET() {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "FORBIDDEN" }, { status: 403 });
  }
  const envelope = exportApiEnvelope();
  return NextResponse.json(envelope, {
    headers: {
      "Content-Disposition": `attachment; filename="apis-${envelope.exportedAt.slice(0, 10)}.json"`,
    },
  });
}
