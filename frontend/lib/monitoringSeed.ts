// H2 (실시간 모니터링) 화면용 시드 데이터. 정적 — 페이지마다 일관된 값을 보여주기 위해 계산값을 한 곳에 둔다.

export const monitoringSeed = {
  metrics: {
    rpm: "14.2",
    p95: 218,
    errRate: 2.4,
    activeExt: 28,
    totalExt: 32,
    mttrMin: "3분 12초",
  },
  seriesOk: [
    820, 810, 830, 840, 850, 820, 860, 870, 880, 840, 860, 870, 860, 855, 870, 840, 820, 810,
    820, 830, 840, 850, 860, 870, 860, 840, 820, 810, 800, 790, 810, 830, 840, 860, 880, 870,
  ],
  series500: [
    2, 3, 2, 1, 2, 3, 4, 2, 3, 2, 4, 3, 2, 3, 4, 5, 8, 12, 18, 28, 42, 55, 68, 72, 80, 76, 72, 68,
    62, 55, 42, 30, 22, 18, 12, 8,
  ],
  topImpactedApis: [
    {
      name: "교과목 수강 인원 통계",
      path: "/course/enrollment-stat",
      rpm: "3,420 RPM",
      p95: "4,820ms",
      errRate: "21.4%",
      errClass: "red" as const,
      mainErr: "DB_TIMEOUT",
    },
    {
      name: "학생 기본정보 조회",
      path: "/student/basic-info",
      rpm: "5,012 RPM",
      p95: "32ms",
      errRate: "0.02%",
      errClass: "green" as const,
      mainErr: "—",
    },
    {
      name: "강의평가 결과 집계",
      path: "/lecture/evaluation-summary",
      rpm: "820 RPM",
      p95: "180ms",
      errRate: "1.2%",
      errClass: "orange" as const,
      mainErr: "AUTH_INVALID_KEY",
    },
    {
      name: "도서관 좌석 현황",
      path: "/library/seat-status",
      rpm: "1,240 RPM",
      p95: "48ms",
      errRate: "0%",
      errClass: "green" as const,
      mainErr: "—",
    },
  ],
  incidents: [
    {
      id: "INC-2026-0148",
      title: "DB_TIMEOUT 급증",
      severity: "CRITICAL",
      ds: "DAU-LMS-PROD",
      startedMinAgo: 4,
      affectedCalls: 72,
      affectedApis: 3,
      detectedAt: "14:32:18",
      durationStr: "4분 12초",
      affectedClients: 14,
    },
  ],
  callRows: [
    { t: "14:36:02.812", st: 504, ms: "5,002", path: "/course/enrollment-stat", sys: "수강신청-WEB",   ip: "10.21.4.18",  trace: "01HXR7J9D2K0X4" },
    { t: "14:36:02.118", st: 504, ms: "5,001", path: "/course/enrollment-stat", sys: "수강신청-MOBILE", ip: "10.21.4.21",  trace: "01HXR7J8XTQ0M2" },
    { t: "14:36:01.044", st: 200, ms: "32",    path: "/student/basic-info",      sys: "포털-WEB",       ip: "10.21.4.10",  trace: "01HXR7J7VV0K8B" },
    { t: "14:36:00.730", st: 504, ms: "5,002", path: "/course/enrollment-stat", sys: "수강신청-WEB",   ip: "10.21.4.18",  trace: "01HXR7J6QY9HMA" },
    { t: "14:35:59.602", st: 401, ms: "12",    path: "/lecture/evaluation-summary", sys: "외부-A기관", ip: "203.241.x.x", trace: "01HXR7J5RP4ZTC" },
    { t: "14:35:58.221", st: 200, ms: "210",   path: "/scholarship/history",      sys: "포털-WEB",     ip: "10.21.4.10",  trace: "01HXR7J4PT2YWN" },
    { t: "14:35:57.880", st: 504, ms: "5,001", path: "/course/enrollment-stat",  sys: "수강신청-WEB", ip: "10.21.4.18",  trace: "01HXR7J3MM1QGE" },
    { t: "14:35:55.110", st: 200, ms: "28",    path: "/library/seat-status",     sys: "도서관-앱",     ip: "10.21.6.40",  trace: "01HXR7J0KK0PZ1" },
  ],
  rules: [
    { name: "DB_TIMEOUT 급증",       target: "5xx + DB_TIMEOUT", threshold: "분당 5건 이상", lastFired: "방금 전",  status: "active",  selected: true },
    { name: "인증키 무차별 시도",    target: "401",              threshold: "1분 50건",       lastFired: "3시간 전", status: "active" },
    { name: "p95 응답 저하",         target: "전체",             threshold: "p95 > 1초 (5분)", lastFired: "2일 전",   status: "active" },
    { name: "새 IP 첫 호출",         target: "전체",             threshold: "화이트리스트 외", lastFired: "—",        status: "active" },
    { name: "데이터소스 풀 포화",    target: "ds.pool.usage",    threshold: "> 90%",          lastFired: "14:32",    status: "active" },
    { name: "SQL cost 급변",         target: "deploy",           threshold: "cost 5x 이상",   lastFired: "14:30",    status: "review" },
  ],
  ruleFiredHistory: [
    0, 0, 1, 0, 2, 0, 0, 1, 0, 3, 0, 1, 0, 0, 2, 0, 0, 1, 4, 0, 0, 1, 0, 2, 0, 0, 3, 0, 1, 5,
  ],
};

export type CallRow = (typeof monitoringSeed.callRows)[number];

export function getCallByTrace(trace: string): CallRow | undefined {
  const seedHit = monitoringSeed.callRows.find((r) => r.trace === trace);
  if (seedHit) return seedHit;

  // 라이브 큐(`lib/mockHistory`) 에서 동적으로 발생한 trace 도 표시 가능하게 매핑.
  // 순환 import 회피 위해 require 형식 — 같은 server bundle 안에서만 안전.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { findByTrace } = require("@/lib/mockHistory") as typeof import("@/lib/mockHistory");
  const live = findByTrace(trace);
  if (!live) return undefined;
  return {
    t: live.calledAt.slice(11, 23),
    st: live.statusCode,
    ms: String(live.elapsedMs),
    path: `/${live.reqPath}`,
    sys: live.extSysId ?? "익명",
    ip: live.clientIp,
    trace: live.traceId,
  };
}
