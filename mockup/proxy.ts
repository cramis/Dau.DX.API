// Next.js 16 의 proxy 파일 컨벤션. (이전 이름 middleware 는 deprecated.)
// 관리자/사용자 콘솔 진입 시 mock-jwt 쿠키를 검사. 미인증이면 /login 으로 redirect.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/api-list",
  "/datasource",
  "/ext-system",
  "/monitoring",
  "/approvals",
  "/users",
  "/me",
];

const MOCK_JWT_COOKIE = "mock-jwt";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const protectedRoute = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (!protectedRoute) {
    return NextResponse.next();
  }

  const jwt = request.cookies.get(MOCK_JWT_COOKIE)?.value;
  if (!jwt) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // 보호 대상만 화이트리스트로 명시. negative-lookahead 를 쓰면 `/api-list` 같은
  // 경로가 우연히 `api` prefix 와 매칭되어 가드가 무력화되므로 화이트리스트 채택.
  matcher: [
    "/api-list/:path*",
    "/datasource/:path*",
    "/ext-system/:path*",
    "/monitoring/:path*",
    "/approvals/:path*",
    "/users/:path*",
    "/me/:path*",
  ],
};
