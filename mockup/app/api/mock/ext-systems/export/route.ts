// 연계시스템 일괄 export — 인증키 평문 포함 (admin 전용 다운로드라 정책상 허용).
// 외부 공유 시 키 회전(POST /[id]/regenerate-key) 후 새 envelope 다운로드 권장.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/mockAuth";
import { exportExtSystemEnvelope } from "@/lib/bulkImport";

export async function GET() {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "FORBIDDEN" }, { status: 403 });
  }
  const envelope = exportExtSystemEnvelope();
  return NextResponse.json(envelope, {
    headers: {
      "Content-Disposition": `attachment; filename="ext-systems-${envelope.exportedAt.slice(0, 10)}.json"`,
    },
  });
}
