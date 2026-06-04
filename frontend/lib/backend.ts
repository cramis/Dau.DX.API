// 백엔드(Spring) 연결 상수. BFF route handler / 서버 컴포넌트에서만 사용(서버사이드 전용).
export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

// httpOnly 세션 쿠키 이름. access=단기(15분), refresh=장기(24시간).
export const COOKIE_AT = "dxapi_at";
export const COOKIE_RT = "dxapi_rt";
