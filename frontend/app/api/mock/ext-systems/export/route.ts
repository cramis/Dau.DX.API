// 연계시스템 일괄 export — 실 백엔드 목록을 envelope 으로 직렬화. admin 전용(backendProxy 가 enforce).
// certKey 는 백엔드 정책상 마스킹 표기로 내려옴(평문 아님) — 외부 공유 안전.
import { NextResponse } from "next/server";
import { fetchItems } from "@/lib/bff";
import type { ExtSystem } from "@/types/api";

export async function GET() {
  const items = await fetchItems<ExtSystem>("/api/ext-systems");
  const exportedAt = new Date().toISOString();
  const envelope = { version: 1, kind: "extSystem", items, exportedAt, count: items.length };
  return NextResponse.json(envelope, {
    headers: {
      "Content-Disposition": `attachment; filename="ext-systems-${exportedAt.slice(0, 10)}.json"`,
    },
  });
}
