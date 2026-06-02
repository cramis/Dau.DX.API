// OpenAPI 3 스펙 공개 프록시 — 백엔드 /openapi.json 을 동일 출처로 중계(다운로드용). 비로그인 허용. FR7.
import { BACKEND_URL } from "@/lib/backend";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/openapi.json`, { cache: "no-store" });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'inline; filename="openapi.json"',
      },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, message: "OPENAPI_UNAVAILABLE" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
