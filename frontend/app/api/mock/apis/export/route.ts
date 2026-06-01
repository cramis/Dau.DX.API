// API 일괄 export — 실 백엔드 목록을 import 호환 envelope 으로 직렬화. admin 전용(backendProxy 가 enforce).
import { NextResponse } from "next/server";
import { fetchItems } from "@/lib/bff";
import type { ApiDef } from "@/types/api";

export async function GET() {
  const items = await fetchItems<ApiDef>("/api/apis");
  const exportedAt = new Date().toISOString();
  const envelope = { version: 1, kind: "api", items, exportedAt, count: items.length };
  return NextResponse.json(envelope, {
    headers: {
      "Content-Disposition": `attachment; filename="apis-${exportedAt.slice(0, 10)}.json"`,
    },
  });
}
