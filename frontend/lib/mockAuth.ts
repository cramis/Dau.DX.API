// BFF 인증 헬퍼. 실제 백엔드(Spring) JWT 세션을 httpOnly 쿠키로 중계한다.
// (파일명은 호환 위해 유지 — 기존 import 경로 @/lib/mockAuth 를 그대로 사용.)
import { cookies } from "next/headers";
import type { User } from "@/types/api";
import { COOKIE_AT, COOKIE_RT } from "@/lib/backend";
import { backendProxy } from "@/lib/bff";

const COMMON = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export async function setSession(accessToken: string, refreshToken: string) {
  const store = await cookies();
  store.set(COOKIE_AT, accessToken, { ...COMMON, maxAge: 60 * 15 });
  store.set(COOKIE_RT, refreshToken, { ...COMMON, maxAge: 60 * 60 * 24 });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_AT);
  store.delete(COOKIE_RT);
}

// 레거시 mock 라우트(reset 등) 호환 별칭.
export const clearMockJwt = clearSession;

// 현재 사용자. 백엔드 /api/users/me 조회(backendProxy 가 access 만료 시 refresh 처리). 미인증/실패면 null.
export async function getCurrentUser(): Promise<User | null> {
  const { body } = await backendProxy("/api/users/me");
  return body?.ok ? ((body.data ?? null) as User | null) : null;
}
