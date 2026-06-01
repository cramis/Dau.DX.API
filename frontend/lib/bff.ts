// 백엔드(Spring) 프록시 헬퍼. httpOnly access 쿠키를 Bearer 로 첨부해 BFF route handler 에서 호출한다.
import { cookies } from "next/headers";
import { BACKEND_URL, COOKIE_AT } from "@/lib/backend";

type QueryInput = Record<string, string | null | undefined>;

type ProxyInit = {
  method?: string;
  query?: QueryInput;
  body?: unknown; // JSON 직렬화 대상. undefined 면 본문 없음(GET/DELETE).
};

// 백엔드 ApiResponse 원형({ok,data,message,issues})을 status 와 함께 그대로 돌려준다.
// 응답 래퍼(data → items/user 등) 매핑은 각 도메인 route 가 담당한다.
export type ProxyResult = { status: number; body: { ok?: boolean; data?: unknown; message?: string; issues?: unknown } };

export async function backendProxy(path: string, init: ProxyInit = {}): Promise<ProxyResult> {
  const store = await cookies();
  const at = store.get(COOKIE_AT)?.value;

  const url = new URL(`${BACKEND_URL}${path}`);
  if (init.query) {
    for (const [k, v] of Object.entries(init.query)) {
      if (v != null && v !== "") url.searchParams.set(k, v);
    }
  }

  const headers: Record<string, string> = {};
  if (at) headers.Authorization = `Bearer ${at}`;
  let payload: string | undefined;
  if (init.body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(init.body);
  }

  try {
    const res = await fetch(url, {
      method: init.method ?? "GET",
      headers,
      body: payload,
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  } catch {
    return { status: 502, body: { ok: false, message: "BACKEND_UNREACHABLE" } };
  }
}

// 서버 컴포넌트용 목록 헬퍼. 백엔드 목록 엔드포인트(ItemsResponse)를 호출해 items 배열만 반환.
// 실패 시 빈 배열(화면은 "없음" 표시) — 서버 렌더 중 throw 방지.
export async function fetchItems<T>(path: string): Promise<T[]> {
  const { body } = await backendProxy(path);
  if (!body?.ok) return [];
  return ((body.data as { items?: T[] }).items ?? []) as T[];
}
