// Next.js 16 의 proxy 파일 컨벤션. (이전 이름 middleware 는 deprecated.)
// 관리자/사용자 콘솔 진입 시 mock-jwt 쿠키를 검사. 미인증이면 /login 으로 redirect.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/api-list",
  "/datasource",
  "/ext-system",
  "/monitoring",
  "/approvals",
  "/users",
  "/me",
  // /docs 는 공개(FR7 비로그인 접근) — 가드 제외.
];

// 실 세션 쿠키 존재만 검사하는 coarse 가드. 서명 검증·재발급은 backendProxy 가 수행.
// access(15분) 만료 후에도 refresh(24h) 가 있으면 통과 → 다운스트림에서 자동 재발급.
const ACCESS_COOKIE = "dxapi_at";
const REFRESH_COOKIE = "dxapi_rt";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const protectedRoute = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (!protectedRoute) {
    return NextResponse.next();
  }

  const hasSession =
    request.cookies.get(ACCESS_COOKIE)?.value ||
    request.cookies.get(REFRESH_COOKIE)?.value;
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // 보호 대상만 화이트리스트로 명시. negative-lookahead 를 쓰면 `/api-list` 같은
  // 경로가 우연히 `api` prefix 와 매칭되어 가드가 무력화되므로 화이트리스트 채택.
  matcher: [
    "/dashboard/:path*",
    "/api-list/:path*",
    "/datasource/:path*",
    "/ext-system/:path*",
    "/monitoring/:path*",
    "/approvals/:path*",
    "/users/:path*",
    "/me/:path*",
  ],
};
