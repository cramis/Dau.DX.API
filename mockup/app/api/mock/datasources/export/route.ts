// 데이터소스 일괄 export — 현재 mockData.dataSources 를 import 호환 envelope 으로 직렬화. admin 전용.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/mockAuth";
import { exportDataSourceEnvelope } from "@/lib/bulkImport";

export async function GET() {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "FORBIDDEN" }, { status: 403 });
  }
  const envelope = exportDataSourceEnvelope();
  return NextResponse.json(envelope, {
    headers: {
      "Content-Disposition": `attachment; filename="datasources-${envelope.exportedAt.slice(0, 10)}.json"`,
    },
  });
}
