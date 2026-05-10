// H2_S1 — 실시간 모니터링 대시보드. 라이브 큐(`/api/mock/monitoring/stats` + `/history`) 5초 폴링.
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHead } from "@/components/design/AppShell";
import { I } from "@/components/design/Icons";
import { LineChart } from "@/components/design/LineChart";
import { MetricTile } from "@/components/design/primitives";
import type { ApiDef, CallHistory, ExtSystem } from "@/types/api";

interface Stats {
  total: number;
  success: number;
  errors: number;
  errors5xx: number;
  errorRate5xx: number;
  p95: number;
  successRate: number;
  series2xx: number[];
  series4xx: number[];
  series5xx: number[];
  windowMin: number;
}

const WINDOWS: { value: number; label: string }[] = [
  { value: 10, label: "최근 10분" },
  { value: 30, label: "최근 30분" },
  { value: 60, label: "최근 1시간" },
  { value: 180, label: "최근 3시간" },
];

interface ImpactRow {
  apiNo: string | null;
  name: string;
  path: string;
  count: number;
  p95: number;
  err4xx: number;
  err5xx: number;
  errRate: number;
  mainErr: string;
}

function buildImpactRows(
  history: CallHistory[],
  apis: ApiDef[],
): ImpactRow[] {
  const apiByNo = new Map(apis.map((a) => [a.no, a]));
  const groups = new Map<string, CallHistory[]>();
  for (const h of history) {
    const key = h.apiNo ?? `path:${h.reqPath}`;
    const arr = groups.get(key) ?? [];
    arr.push(h);
    groups.set(key, arr);
  }
  const rows: ImpactRow[] = [];
  for (const [key, list] of groups.entries()) {
    const apiNo = key.startsWith("path:") ? null : key;
    const api = apiNo ? apiByNo.get(apiNo) : undefined;
    const sortedLat = [...list].map((x) => x.elapsedMs).sort((a, b) => a - b);
    const p95 =
      sortedLat.length === 0
        ? 0
        : sortedLat[Math.min(sortedLat.length - 1, Math.floor(sortedLat.length * 0.95))];
    const err4xx = list.filter((x) => x.statusCode >= 400 && x.statusCode < 500).length;
    const err5xx = list.filter((x) => x.statusCode >= 500).length;
    const errors = err4xx + err5xx;
    const errRate = list.length === 0 ? 0 : Math.round((errors / list.length) * 1000) / 10;

    // 가장 빈번한 errorCode
    const errCodes = new Map<string, number>();
    for (const h of list) {
      if (h.errorCode) errCodes.set(h.errorCode, (errCodes.get(h.errorCode) ?? 0) + 1);
    }
    const mainErr =
      [...errCodes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

    rows.push({
      apiNo,
      name: api?.name ?? list[0].reqPath,
      path: `/${list[0].reqPath}`,
      count: list.length,
      p95,
      err4xx,
      err5xx,
      errRate,
      mainErr,
    });
  }
  return rows.sort((a, b) => b.errRate - a.errRate || b.count - a.count).slice(0, 8);
}

function chartTickLabels(windowMin: number): string[] {
  // 5개 라벨: 0%, 25%, 50%, 75%, 100% (== 지금)
  const now = new Date();
  const fmt = (d: Date) =>
    `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  return [0, 0.25, 0.5, 0.75, 1].map((p) => {
    const t = new Date(now.getTime() - (1 - p) * windowMin * 60_000);
    return p === 1 ? "지금" : fmt(t);
  });
}

export default function Page() {
  const [windowMin, setWindowMin] = useState(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<CallHistory[]>([]);
  const [exts, setExts] = useState<ExtSystem[]>([]);
  const [apis, setApis] = useState<ApiDef[]>([]);
  const [paused, setPaused] = useState(false);

  async function load(currentWindow: number) {
    try {
      const [statsRes, histRes, extRes, apiRes] = await Promise.all([
        fetch(`/api/mock/monitoring/stats?windowMin=${currentWindow}`, { cache: "no-store" }),
        fetch(`/api/mock/monitoring/history?limit=200`, { cache: "no-store" }),
        fetch(`/api/mock/ext-systems`, { cache: "no-store" }),
        fetch(`/api/mock/apis`, { cache: "no-store" }),
      ]);
      const [s, h, e, a] = await Promise.all([
        statsRes.json().catch(() => null),
        histRes.json().catch(() => ({ items: [] })),
        extRes.json().catch(() => ({ items: [] })),
        apiRes.json().catch(() => ({ items: [] })),
      ]);
      if (s?.ok) setStats(s as Stats);
      if (h?.ok) setHistory(h.items as CallHistory[]);
      if (e?.ok) setExts(e.items as ExtSystem[]);
      if (a?.ok) setApis(a.items as ApiDef[]);
    } catch {
      // 무시 — 다음 틱에 재시도
    }
  }

  useEffect(() => {
    void load(windowMin);
    if (paused) return;
    const id = setInterval(() => void load(windowMin), 5000);
    return () => clearInterval(id);
  }, [windowMin, paused]);

  const rpm = stats ? Math.round((stats.total / Math.max(1, stats.windowMin)) * 10) / 10 : 0;
  const activeExt = exts.filter((e) => e.status === "ACTIVE").length;
  const totalExt = exts.length;
  const impacted = useMemo(() => buildImpactRows(history, apis), [history, apis]);
  const incidentTriggered = (stats?.errors5xx ?? 0) >= 3; // 윈도우 내 5xx 3건 이상

  const chartLabels = chartTickLabels(windowMin);
  const okSeries = stats?.series2xx ?? [];
  const err4xxSeries = stats?.series4xx ?? [];
  const err5xxSeries = stats?.series5xx ?? [];

  return (
    <>
      <PageHead
        breadcrumb={["서비스", "실시간 모니터링"]}
        title="실시간 모니터링"
        sub={
          <>
            라이브 큐 · 5초 자동 새로고침 · {WINDOWS.find((w) => w.value === windowMin)?.label}
          </>
        }
        actions={
          <>
            <select
              className="w-select"
              style={{ width: 130 }}
              aria-label="윈도우 선택"
              value={windowMin}
              onChange={(e) => setWindowMin(Number(e.target.value))}
            >
              {WINDOWS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="w-btn w-btn--ghost w-btn--sm"
              onClick={() => setPaused((p) => !p)}
              data-testid="monitoring-pause-btn"
            >
              <I name={paused ? "Play" : "Refresh"} /> {paused ? "재개" : "일시정지"}
            </button>
            <button
              type="button"
              className="w-btn w-btn--ghost w-btn--sm"
              onClick={() => void load(windowMin)}
            >
              <I name="Refresh" /> 즉시 갱신
            </button>
            <Link href="/monitoring/rules" className="w-btn w-btn--soft w-btn--sm">
              <I name="Bell" /> 알림 규칙
            </Link>
          </>
        }
      />

      <div className="w-metrics" style={{ marginBottom: 16 }} data-testid="monitoring-kpi">
        <MetricTile
          label="분당 호출량"
          value={rpm}
          unit="RPM"
          delta={`최근 ${windowMin}분 합 ${stats?.total ?? 0}건`}
        />
        <MetricTile
          label="p95 응답시간"
          value={stats?.p95 ?? 0}
          unit="ms"
          delta={
            (stats?.p95 ?? 0) > 1000 ? "▲ 1초 초과" : "정상"
          }
          deltaTone={(stats?.p95 ?? 0) > 1000 ? "down" : "up"}
        />
        <MetricTile
          label="오류율 (5xx)"
          value={stats?.errorRate5xx ?? 0}
          unit="%"
          delta={`5xx ${stats?.errors5xx ?? 0}건`}
          deltaTone={(stats?.errors5xx ?? 0) > 0 ? "down" : "up"}
          accent={(stats?.errors5xx ?? 0) >= 3 ? "critical" : undefined}
        />
        <MetricTile
          label="활성 연계시스템"
          value={activeExt}
          delta={`전체 ${totalExt}개 중`}
        />
      </div>

      <div className="w-split--3" style={{ marginBottom: 16 }}>
        <div className="w-card">
          <div className="w-card__head">
            <div>
              <h3 className="w-card__title">호출량 / 응답코드</h3>
              <div className="w-card__sub">
                {WINDOWS.find((w) => w.value === windowMin)?.label} · 1분 단위 집계
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <span className="w-topbar__chip">
                <span className="dot" style={{ background: "var(--w-tint-primary)" }} />
                2xx
              </span>
              <span className="w-topbar__chip">
                <span className="dot" style={{ background: "var(--w-orange)" }} />
                4xx
              </span>
              <span className="w-topbar__chip">
                <span className="dot" style={{ background: "var(--w-red)" }} />
                5xx
              </span>
            </div>
          </div>
          <div className="w-card__body">
            <div style={{ position: "relative", height: 200 }}>
              <div style={{ position: "absolute", inset: 0 }}>
                <LineChart values={okSeries} h={200} fill />
              </div>
              <div style={{ position: "absolute", inset: 0 }}>
                <LineChart values={err4xxSeries} h={200} color="var(--w-orange)" fill={false} />
              </div>
              <div style={{ position: "absolute", inset: 0 }}>
                <LineChart values={err5xxSeries} h={200} color="var(--w-red)" fill={false} />
              </div>
              {(stats?.total ?? 0) === 0 && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    placeItems: "center",
                    color: "var(--w-fg-assistive)",
                    fontSize: 12,
                  }}
                >
                  최근 호출 이력이 없습니다 · 별도 터미널에서{" "}
                  <code className="w-mono" style={{ marginLeft: 4 }}>
                    curl /api/sample/sample-user-info?id=user01
                  </code>
                </div>
              )}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "var(--w-fg-assistive)",
                marginTop: 8,
              }}
            >
              {chartLabels.map((t, i) => (
                <span key={i}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="w-card">
          <div className="w-card__head">
            <h3 className="w-card__title">진행 중 인시던트</h3>
            <span
              className={
                incidentTriggered ? "w-badge w-badge--red" : "w-badge w-badge--green"
              }
              data-testid="incident-badge"
            >
              <I name={incidentTriggered ? "Alert" : "Check"} size={11} />{" "}
              {incidentTriggered ? "1" : "0"}
            </span>
          </div>
          <div className="w-card__body">
            {incidentTriggered ? (
              <div
                style={{
                  padding: 12,
                  border: "1px solid var(--w-tint-critical)",
                  borderRadius: 10,
                  background: "#fff5f5",
                }}
                data-testid="live-incident-card"
              >
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="w-badge w-badge--red">LIVE</span>
                  <span className="w-strong">5xx 응답 급증 감지</span>
                </div>
                <div className="w-muted" style={{ fontSize: 12, marginTop: 4 }}>
                  최근 {windowMin}분 내 <b style={{ color: "var(--w-fg-strong)" }}>{stats?.errors5xx}건</b> 의 5xx 응답
                </div>
                <div style={{ marginTop: 8, fontSize: 12.5 }}>
                  영향 API {impacted.filter((r) => r.err5xx > 0).length}개 · 즉시 호출 이력 확인 필요
                </div>
                <Link
                  href="/monitoring/logs"
                  className="w-btn w-btn--danger w-btn--sm"
                  style={{ marginTop: 10 }}
                >
                  <I name="Trace" /> 호출 이력 분석
                </Link>
              </div>
            ) : (
              <div
                style={{
                  padding: 16,
                  border: "1px solid var(--w-line-neutral)",
                  borderRadius: 10,
                  background: "var(--w-bg-alternative)",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 13, color: "var(--w-green)", fontWeight: 600 }}>
                  ✓ 정상 — 인시던트 없음
                </div>
                <div className="w-muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                  최근 {windowMin}분 내 5xx 3건 이상 발생 시 자동 표시
                </div>
              </div>
            )}
            <div className="w-divider" />
            <div className="w-muted" style={{ fontSize: 12 }}>
              임계치: <b style={{ color: "var(--w-fg-strong)" }}>윈도우 내 5xx ≥ 3건</b> · 정식 알림 규칙은{" "}
              <Link href="/monitoring/rules" style={{ color: "var(--w-tint-primary)" }}>
                /monitoring/rules
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="w-card">
        <div className="w-card__head">
          <h3 className="w-card__title">상위 영향 API (라이브)</h3>
          <span className="w-muted" style={{ fontSize: 12 }}>
            오류율 기준 · 최근 호출 이력 200건 한정
          </span>
        </div>
        <div className="w-card__body w-card__body--tight">
          <div className="w-tbl-wrap">
            <table className="w-tbl">
              <thead>
                <tr>
                  <th>API</th>
                  <th>경로</th>
                  <th>호출</th>
                  <th>p95</th>
                  <th>오류율</th>
                  <th>주요 오류</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {impacted.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="w-empty">
                        <p className="w-empty__title">호출 이력이 없습니다</p>
                        <p className="w-empty__sub">
                          sample GW 호출이 발생하면 여기에 자동으로 채워집니다.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  impacted.map((r, idx) => {
                    const errCls =
                      r.errRate >= 10
                        ? "w-badge--red"
                        : r.errRate > 0
                        ? "w-badge--orange"
                        : "w-badge--green";
                    return (
                      <tr
                        key={r.apiNo ?? r.path}
                        className="is-row"
                        style={
                          idx === 0 && r.errRate > 0
                            ? { background: "#fff5f5" }
                            : undefined
                        }
                        data-testid="impact-row"
                      >
                        <td className="strong">{r.name}</td>
                        <td className="mono">{r.path}</td>
                        <td>{r.count}건</td>
                        <td className="mono">{r.p95}ms</td>
                        <td>
                          <span className={`w-badge ${errCls}`}>{r.errRate}%</span>
                        </td>
                        <td>
                          <span
                            className="mono"
                            style={{
                              color: r.errRate >= 10 ? "var(--w-tint-critical)" : undefined,
                            }}
                          >
                            {r.mainErr}
                          </span>
                        </td>
                        <td>
                          <Link
                            href="/monitoring/logs"
                            className="w-btn w-btn--ghost w-btn--sm"
                          >
                            상세 <I name="Right" size={12} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
