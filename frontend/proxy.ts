// Next.js 16 의 proxy 파일 컨벤션. (이전 이름 middleware 는 deprecated.)
// 기본 차단 가드 — 로그인(세션 쿠키) 없으면 모든 페이지 접근을 /login 으로 redirect.
// 공개 페이지(로그인·회원가입·비밀번호찾기)만 화이트리스트. /docs 포함 그 외 전부 보호.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 비로그인 허용 페이지. 이 외 모든 페이지는 세션 필요.
const PUBLIC_PAGES = ["/login", "/signup", "/forgot-password"];

// 실 세션 쿠키 존재만 검사하는 coarse 가드. 서명 검증·재발급은 backendProxy 가 수행.
// access(15분) 만료 후에도 refresh(24h) 가 있으면 통과 → 다운스트림에서 자동 재발급.
const ACCESS_COOKIE = "dxapi_at";
const REFRESH_COOKIE = "dxapi_rt";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PAGES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (isPublic) {
    return NextResponse.next();
  }

  const hasSession =
    request.cookies.get(ACCESS_COOKIE)?.value ||
    request.cookies.get(REFRESH_COOKIE)?.value;
  if (hasSession) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // 모든 경로를 가드하되 정적 자산·API 라우트는 제외한다.
  // - api/        : API 인증은 백엔드 JWT 가 담당(미인증 시 401). 로그인 흐름 차단 방지.
  // - _next/      : 빌드 산출물·이미지 최적화.
  // - favicon.ico : 파비콘.
  // - .*\.        : 점(.) 포함 정적 파일(.svg/.woff 등). 페이지 경로엔 점이 없다.
  matcher: ["/((?!api/|_next/|favicon.ico|.*\\.).*)"],
};
