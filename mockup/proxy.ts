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
  // /api/*, /_next/*, 정적 자산, /docs(비로그인 허용) 는 미적용.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|docs).*)"],
};
