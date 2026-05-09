// Mockup 전용 인증 헬퍼. 실 JWT 서버 대신 사용자 ID 만 담은 httpOnly 쿠키로 흉내낸다.
import { cookies } from "next/headers";
import { mockData } from "@/lib/mockData";
import type { User } from "@/types/api";

export const MOCK_JWT_COOKIE = "mock-jwt";

export async function setMockJwt(userId: string) {
  const store = await cookies();
  store.set(MOCK_JWT_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export async function clearMockJwt() {
  const store = await cookies();
  store.delete(MOCK_JWT_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const userId = store.get(MOCK_JWT_COOKIE)?.value;
  if (!userId) return null;
  return mockData.users.find((u) => u.id === userId) ?? null;
}
