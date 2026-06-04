// 백엔드(Spring) 프록시 헬퍼. httpOnly access 쿠키를 Bearer 로 첨부해 BFF route handler/서버컴포넌트에서 호출한다.
// access(15분) 만료 시 refresh(24h) 로 자동 재발급 후 1회 재시도한다.
import { cookies } from "next/headers";
import { BACKEND_URL, COOKIE_AT, COOKIE_RT } from "@/lib/backend";

type QueryInput = Record<string, string | null | undefined>;

type ProxyInit = {
  method?: string;
  query?: QueryInput;
  body?: unknown; // JSON 직렬화 대상. undefined 면 본문 없음(GET/DELETE).
};

// 백엔드 ApiResponse 원형({ok,data,message,issues})을 status 와 함께 그대로 돌려준다.
// 응답 래퍼(data → items/user 등) 매핑은 각 도메인 route 가 담당한다.
export type ProxyResult = { status: number; body: { ok?: boolean; data?: unknown; message?: string; issues?: unknown } };

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

// refresh 토큰으로 access/refresh 쌍을 재발급한다. 성공 시 새 access 토큰 반환(+쿠키 영속), 실패 시 null.
async function tryRefresh(rt: string): Promise<string | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.ok) return null;
    const { accessToken, refreshToken } = body.data as { accessToken: string; refreshToken: string };
    // 회전된 쌍을 쿠키에 영속. route handler/server action 에선 성공, server component 렌더 컨텍스트에선
    // 쿠키 수정이 막혀 throw → 무시(이번 요청은 메모리상 새 토큰으로 재시도, 영속은 다음 요청에서).
    try {
      const store = await cookies();
      store.set(COOKIE_AT, accessToken, { ...COOKIE_OPTS, maxAge: 60 * 15 });
      store.set(COOKIE_RT, refreshToken, { ...COOKIE_OPTS, maxAge: 60 * 60 * 24 });
    } catch {
      /* server component 컨텍스트 — 쿠키 영속 불가, 메모리 토큰으로 진행 */
    }
    return accessToken;
  } catch {
    return null;
  }
}

export async function backendProxy(path: string, init: ProxyInit = {}): Promise<ProxyResult> {
  const store = await cookies();
  const at = store.get(COOKIE_AT)?.value;
  const rt = store.get(COOKIE_RT)?.value;

  const url = new URL(`${BACKEND_URL}${path}`);
  if (init.query) {
    for (const [k, v] of Object.entries(init.query)) {
      if (v != null && v !== "") url.searchParams.set(k, v);
    }
  }

  let payload: string | undefined;
  const baseHeaders: Record<string, string> = {};
  if (init.body !== undefined) {
    baseHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(init.body);
  }

  async function call(token: string | undefined): Promise<ProxyResult> {
    const headers = { ...baseHeaders };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, {
      method: init.method ?? "GET",
      headers,
      body: payload,
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  }

  try {
    let result = await call(at);
    // access 만료/부재(401) + refresh 보유 → 1회 재발급 후 재시도.
    if (result.status === 401 && rt) {
      const fresh = await tryRefresh(rt);
      if (fresh) result = await call(fresh);
    }
    return result;
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
