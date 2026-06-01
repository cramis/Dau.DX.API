// 대시보드 — 운영 KPI + 라이브 호출 차트 + 최근 등록/가장 많이 호출한 API + 할 일 + 가설 배너.
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHead } from "@/components/design/AppShell";
import { I } from "@/components/design/Icons";
import { LineChart } from "@/components/design/LineChart";
import { Hypothesis, HttpMethod, MetricTile } from "@/components/design/primitives";
import { DS_RUNTIME_META } from "@/lib/datasourceMeta";
import type {
  ApiDef,
  Approval,
  CallHistory,
  DataSource,
  ExtSystem,
} from "@/types/api";

interface Stats {
  total: number;
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

const WINDOW_MIN = 30;
const POLL_MS = 5000;

interface TopCalledRow {
  apiNo: string | null;
  name: string;
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  count: number;
  errors: number;
}

interface TopExtRow {
  id: string;
  name: string;
  count: number;
}

interface PoolRow {
  id: string;
  name: string;
  pct: number;
  pool: string;
  apiCount: number;
  status: "정상" | "주의" | "심각";
}

export default function Page() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [apis, setApis] = useState<ApiDef[]>([]);
  const [history, setHistory] = useState<CallHistory[]>([]);
  const [exts, setExts] = useState<ExtSystem[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [pendingApi, setPendingApi] = useState<Approval[]>([]);
  const [pendingUser, setPendingUser] = useState<Approval[]>([]);

  async function load() {
    try {
      const [s, a, h, e, d, pa, pu] = await Promise.all([
        fetch(`/api/mock/monitoring/stats?windowMin=${WINDOW_MIN}`, { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => null),
        fetch(`/api/mock/apis`, { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => ({ items: [] })),
        fetch(`/api/mock/monitoring/history?limit=500`, { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => ({ items: [] })),
        fetch(`/api/mock/ext-systems`, { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => ({ items: [] })),
        fetch(`/api/mock/datasources`, { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => ({ items: [] })),
        fetch(`/api/mock/approvals/api?status=PENDING`, { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => ({ items: [] })),
        fetch(`/api/mock/approvals/user?status=PENDING`, { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => ({ items: [] })),
      ]);
      if (s?.ok) setStats(s as Stats);
      if (a?.ok) setApis(a.items as ApiDef[]);
      if (h?.ok) setHistory(h.items as CallHistory[]);
      if (e?.ok) setExts(e.items as ExtSystem[]);
      if (d?.ok) setDataSources(d.items as DataSource[]);
      if (pa?.ok) setPendingApi(pa.items as Approval[]);
      if (pu?.ok) setPendingUser(pu.items as Approval[]);
    } catch {
      // 무시 — 다음 틱에 재시도.
    }
  }

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, []);

  // 등록 API 통계.
  const totalApis = apis.length;
  const activeApis = apis.filter((a) => a.status === "ACTIVE").length;
  const draftApis = apis.filter((a) => a.status === "DRAFT").length;

  // 최근 등록 5건. `no` 가 `A+YYYYMMDD+seq` 라 문자열 역순 정렬이 곧 등록 시점 역순.
  const recentApis = useMemo(
    () => [...apis].sort((a, b) => b.no.localeCompare(a.no)).slice(0, 5),
    [apis],
  );

  // 가장 많이 호출한 API 5건 — history aggregate.
  const topCalledApis: TopCalledRow[] = useMemo(() => {
    const byNo = new Map(apis.map((a) => [a.no, a]));
    const counts = new Map<string, { count: number; errors: number }>();
    for (const h of history) {
      const key = h.apiNo ?? `path:${h.reqPath}`;
      const cur = counts.get(key) ?? { count: 0, errors: 0 };
      cur.count += 1;
      if (h.statusCode >= 400) cur.errors += 1;
      counts.set(key, cur);
    }
    return [...counts.entries()]
      .map(([key, v]) => {
        const isPath = key.startsWith("path:");
        const api = isPath ? undefined : byNo.get(key);
        return {
          apiNo: isPath ? null : key,
          name: api?.name ?? (isPath ? key.slice(5) : key),
          path: api?.path ?? (isPath ? key.slice(5) : ""),
          method: (api?.method ?? "GET") as TopCalledRow["method"],
          count: v.count,
          errors: v.errors,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [history, apis]);

  // 가장 많이 호출한 연계시스템 5건.
  const topExtSystems: TopExtRow[] = useMemo(() => {
    const extById = new Map(exts.map((e) => [e.id, e]));
    const counts = new Map<string, number>();
    for (const h of history) {
      if (!h.extSysId) continue;
      counts.set(h.extSysId, (counts.get(h.extSysId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, count]) => ({ id, name: extById.get(id)?.name ?? id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [history, exts]);

  // 데이터소스별 풀 사용률. 시드 5개는 datasourceMeta 의 메타가 있고, 신규 등록 DS 는 0% 폴백.
  const poolRows: PoolRow[] = useMemo(
    () =>
      dataSources.slice(0, 5).map((ds) => {
        const meta = DS_RUNTIME_META[ds.id];
        const apiCount =
          meta?.apiCount ?? apis.filter((a) => a.dataSrcId === ds.id).length;
        return {
          id: ds.id,
          name: ds.name,
          pct: meta?.poolPct ?? 0,
          pool: meta?.pool ?? `0/${ds.poolMax}`,
          apiCount,
          status: meta?.status ?? "정상",
        };
      }),
    [dataSources, apis],
  );

  // 인증키 만료 임박(30일 이내).
  const expiringExts = useMemo(() => {
    const now = Date.now();
    const limit = 30 * 24 * 60 * 60 * 1000;
    return exts
      .filter((e) => {
        const t = new Date(e.useEnd).getTime();
        return Number.isFinite(t) && t - now <= limit && t > now;
      })
      .sort((a, b) => a.useEnd.localeCompare(b.useEnd))
      .slice(0, 5);
  }, [exts]);

  // 라이브 KPI.
  const rpm = stats
    ? Math.round((stats.total / Math.max(1, stats.windowMin)) * 10) / 10
    : 0;
  const errorRate5xx = stats?.errorRate5xx ?? 0;
  const errors5xx = stats?.errors5xx ?? 0;
  const incidentTriggered = errors5xx >= 3;
  const totalCalls = stats?.total ?? 0;
  const totalPending = pendingApi.length + pendingUser.length;

  return (
    <>
      <PageHead
        breadcrumb={["서비스", "대시보드"]}
        title="Dau.DX.API · 차세대 API 게이트웨이"
        sub="셀프서비스 발급 · 실시간 모니터링 · 무중단 hot-swap"
        actions={
          <>
            <Link href="/api-list/new" className="w-btn w-btn--primary w-btn--sm">
              <I name="Plus" /> 신규 API 등록
            </Link>
            <Link href="/datasource" className="w-btn w-btn--soft w-btn--sm">
              <I name="Ds" /> 데이터소스
            </Link>
            <Link href="/ext-system" className="w-btn w-btn--soft w-btn--sm">
              <I name="Ext" /> 연계시스템
            </Link>
          </>
        }
      />

      {/* 1. KPI 4개 — 운영 핵심 지표 */}
      <div className="w-metrics" style={{ marginBottom: 16 }}>
        <MetricTile
          label="등록 API"
          value={totalApis}
          unit="건"
          delta={`ACTIVE ${activeApis} · DRAFT ${draftApis}`}
          deltaTone="neutral"
          accent="primary"
        />
        <MetricTile
          label="분당 호출량 (최근 30분)"
          value={rpm}
          unit="RPM"
          delta={`최근 30분 합 ${totalCalls}건`}
        />
        <MetricTile
          label="5xx 오류율 (최근 30분)"
          value={errorRate5xx}
          unit="%"
          delta={`5xx ${errors5xx}건 · p95 ${stats?.p95 ?? 0}ms`}
          deltaTone={errors5xx > 0 ? "down" : "up"}
          accent={incidentTriggered ? "critical" : undefined}
        />
        <MetricTile
          label={incidentTriggered ? "진행 중 인시던트" : "올해 재시작"}
          value={incidentTriggered ? "1" : <span style={{ color: "var(--w-green)" }}>0</span>}
          unit="건"
          delta={incidentTriggered ? "5xx 급증 감지" : "hot-swap 100% 성공"}
          deltaTone={incidentTriggered ? "down" : "up"}
          accent={incidentTriggered ? "critical" : "positive"}
        />
      </div>

      {/* 2. 라이브 호출 차트 + 인시던트 카드 */}
      <div className="w-split--3" style={{ marginBottom: 16 }}>
        <div className="w-card">
          <div className="w-card__head">
            <div>
              <h3 className="w-card__title">최근 30분 호출 추이</h3>
              <div className="w-card__sub">1분 단위 · 5초 자동 새로고침</div>
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
            <div style={{ position: "relative", height: 180 }}>
              <div style={{ position: "absolute", inset: 0 }}>
                <LineChart values={stats?.series2xx ?? []} h={180} fill />
              </div>
              <div style={{ position: "absolute", inset: 0 }}>
                <LineChart
                  values={stats?.series4xx ?? []}
                  h={180}
                  color="var(--w-orange)"
                  fill={false}
                />
              </div>
              <div style={{ position: "absolute", inset: 0 }}>
                <LineChart
                  values={stats?.series5xx ?? []}
                  h={180}
                  color="var(--w-red)"
                  fill={false}
                />
              </div>
              {totalCalls === 0 && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    placeItems: "center",
                    color: "var(--w-fg-assistive)",
                    fontSize: 12,
                    textAlign: "center",
                  }}
                >
                  <div>
                    최근 호출 이력이 없습니다.
                    <br />
                    별도 터미널에서{" "}
                    <code className="w-mono">curl /api/sample/sample-user-info?id=user01</code>
                  </div>
                </div>
              )}
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
            >
              <I name={incidentTriggered ? "Alert" : "Check"} size={11} />{" "}
              {incidentTriggered ? "1건" : "정상"}
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
              >
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="w-badge w-badge--red">LIVE</span>
                  <span className="w-strong">5xx 응답 급증 감지</span>
                </div>
                <div className="w-muted" style={{ fontSize: 12, marginTop: 4 }}>
                  최근 30분 내 <b style={{ color: "var(--w-fg-strong)" }}>{errors5xx}건</b> 의 5xx
                </div>
                <Link
                  href="/monitoring"
                  className="w-btn w-btn--danger w-btn--sm"
                  style={{ marginTop: 10 }}
                >
                  <I name="Trace" /> 모니터링으로 이동
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
                  ✓ 정상 — 활성 인시던트 없음
                </div>
                <div className="w-muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                  최근 30분 내 5xx 3건 이상 발생 시 자동 표시
                </div>
              </div>
            )}
            <div className="w-divider" />
            <div className="w-muted" style={{ fontSize: 12 }}>
              알림 규칙 14건 활성 ·{" "}
              <Link href="/monitoring/rules" style={{ color: "var(--w-tint-primary)" }}>
                관리
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 최근 등록 API + 가장 많이 호출한 API */}
      <div className="w-split" style={{ marginBottom: 16 }}>
        <div className="w-card">
          <div className="w-card__head">
            <div>
              <h3 className="w-card__title">최근 등록 API</h3>
              <div className="w-card__sub">전체 {totalApis}건 중 최신 5건</div>
            </div>
            <Link href="/api-list" className="w-btn w-btn--ghost w-btn--sm">
              전체 보기 <I name="Right" size={12} />
            </Link>
          </div>
          <div className="w-card__body w-card__body--tight">
            <div className="w-tbl-wrap">
              <table className="w-tbl">
                <thead>
                  <tr>
                    <th>API</th>
                    <th>경로</th>
                    <th>상태</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recentApis.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="w-empty">
                          <p className="w-empty__title">등록된 API 가 없습니다</p>
                          <p className="w-empty__sub">
                            상단 [신규 API 등록] 으로 첫 API 를 추가하세요.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    recentApis.map((a) => (
                      <tr key={a.no} className="is-row">
                        <td>
                          <div className="strong">{a.name}</div>
                          <div className="mono" style={{ fontSize: 11, color: "var(--w-fg-assistive)" }}>
                            {a.no}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <HttpMethod method={a.method} />
                            <span className="mono">/{a.path}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={
                              a.status === "ACTIVE"
                                ? "w-badge w-badge--green"
                                : a.status === "DRAFT"
                                ? "w-badge w-badge--orange"
                                : "w-badge w-badge--neutral"
                            }
                          >
                            {a.status}
                          </span>
                        </td>
                        <td>
                          <Link
                            href={`/api-list/${a.no}`}
                            className="w-btn w-btn--ghost w-btn--sm"
                          >
                            <I name="Pencil" size={12} /> 수정
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="w-card">
          <div className="w-card__head">
            <div>
              <h3 className="w-card__title">가장 많이 호출한 API</h3>
              <div className="w-card__sub">최근 호출 이력 500건 기준</div>
            </div>
            <Link href="/monitoring/logs" className="w-btn w-btn--ghost w-btn--sm">
              호출 이력 <I name="Right" size={12} />
            </Link>
          </div>
          <div className="w-card__body w-card__body--tight">
            <div className="w-tbl-wrap">
              <table className="w-tbl">
                <thead>
                  <tr>
                    <th>API</th>
                    <th>경로</th>
                    <th style={{ textAlign: "right" }}>호출</th>
                    <th style={{ textAlign: "right" }}>오류</th>
                  </tr>
                </thead>
                <tbody>
                  {topCalledApis.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="w-empty">
                          <p className="w-empty__title">호출 이력이 없습니다</p>
                          <p className="w-empty__sub">
                            sample GW 호출이 발생하면 자동으로 채워집니다.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    topCalledApis.map((r, idx) => (
                      <tr key={`${r.apiNo ?? r.path}-${idx}`} className="is-row">
                        <td className="strong">{r.name}</td>
                        <td>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <HttpMethod method={r.method} />
                            <span className="mono">/{r.path}</span>
                          </div>
                        </td>
                        <td className="mono" style={{ textAlign: "right" }}>
                          {r.count}건
                        </td>
                        <td className="mono" style={{ textAlign: "right" }}>
                          {r.errors > 0 ? (
                            <span style={{ color: "var(--w-red)" }}>{r.errors}건</span>
                          ) : (
                            <span style={{ color: "var(--w-fg-assistive)" }}>0</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 데이터소스 풀 사용률 + 할 일(승인/만료/연계시스템 Top) */}
      <div className="w-split--3" style={{ marginBottom: 16 }}>
        <div className="w-card">
          <div className="w-card__head">
            <div>
              <h3 className="w-card__title">데이터소스 풀 사용률</h3>
              <div className="w-card__sub">
                {dataSources.length}개 · 80% 이상 주의 · hot-swap 후보 식별
              </div>
            </div>
            <Link href="/datasource" className="w-btn w-btn--ghost w-btn--sm">
              전체 보기 <I name="Right" size={12} />
            </Link>
          </div>
          <div className="w-card__body">
            {poolRows.length === 0 ? (
              <div className="w-empty">
                <p className="w-empty__title">등록된 데이터소스가 없습니다</p>
              </div>
            ) : (
              <div className="w-stack" style={{ gap: 14 }}>
                {poolRows.map((p) => {
                  const tone =
                    p.pct >= 95 ? "var(--w-red)" : p.pct >= 80 ? "var(--w-orange)" : "var(--w-tint-primary)";
                  return (
                    <div key={p.id}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          marginBottom: 4,
                        }}
                      >
                        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                          <span className="w-strong">{p.name}</span>
                          <span className="w-muted" style={{ fontSize: 11.5 }}>
                            매핑 API {p.apiCount}개
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                          <span className="mono" style={{ fontSize: 12 }}>
                            {p.pool}
                          </span>
                          <span
                            className="w-strong"
                            style={{ fontSize: 13, color: tone, minWidth: 36, textAlign: "right" }}
                          >
                            {p.pct}%
                          </span>
                        </div>
                      </div>
                      <div className="w-progress">
                        <div style={{ width: `${Math.min(100, p.pct)}%`, background: tone }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="w-card">
          <div className="w-card__head">
            <div>
              <h3 className="w-card__title">할 일</h3>
              <div className="w-card__sub">처리 대기 · 만료 임박</div>
            </div>
            {totalPending > 0 && (
              <span className="w-badge w-badge--red">{totalPending}건</span>
            )}
          </div>
          <div className="w-card__body">
            <div className="w-stack" style={{ gap: 10 }}>
              <Link
                href="/approvals/api"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    border: "1px solid var(--w-line-neutral)",
                    borderRadius: 10,
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <I name="Appr" />
                    <div>
                      <div className="w-strong" style={{ fontSize: 13 }}>
                        API 사용 신청 대기
                      </div>
                      <div className="w-muted" style={{ fontSize: 11.5 }}>
                        외부 시스템의 매핑 요청
                      </div>
                    </div>
                  </div>
                  <span
                    className={
                      pendingApi.length > 0
                        ? "w-badge w-badge--orange"
                        : "w-badge w-badge--neutral"
                    }
                  >
                    {pendingApi.length}건
                  </span>
                </div>
              </Link>

              <Link
                href="/approvals/user"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    border: "1px solid var(--w-line-neutral)",
                    borderRadius: 10,
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <I name="User" />
                    <div>
                      <div className="w-strong" style={{ fontSize: 13 }}>
                        회원가입 승인 대기
                      </div>
                      <div className="w-muted" style={{ fontSize: 11.5 }}>
                        PENDING 상태 사용자
                      </div>
                    </div>
                  </div>
                  <span
                    className={
                      pendingUser.length > 0
                        ? "w-badge w-badge--orange"
                        : "w-badge w-badge--neutral"
                    }
                  >
                    {pendingUser.length}건
                  </span>
                </div>
              </Link>

              <Link
                href="/ext-system"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    border: "1px solid var(--w-line-neutral)",
                    borderRadius: 10,
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <I name="Key" />
                    <div>
                      <div className="w-strong" style={{ fontSize: 13 }}>
                        인증키 만료 임박
                      </div>
                      <div className="w-muted" style={{ fontSize: 11.5 }}>
                        30일 이내 useEnd 도래
                      </div>
                    </div>
                  </div>
                  <span
                    className={
                      expiringExts.length > 0
                        ? "w-badge w-badge--orange"
                        : "w-badge w-badge--neutral"
                    }
                  >
                    {expiringExts.length}건
                  </span>
                </div>
              </Link>

              <Link
                href="/api-list"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    border: "1px solid var(--w-line-neutral)",
                    borderRadius: 10,
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <I name="Api" />
                    <div>
                      <div className="w-strong" style={{ fontSize: 13 }}>
                        DRAFT 상태 API
                      </div>
                      <div className="w-muted" style={{ fontSize: 11.5 }}>
                        등록 후 활성화 미적용
                      </div>
                    </div>
                  </div>
                  <span
                    className={
                      draftApis > 0
                        ? "w-badge w-badge--orange"
                        : "w-badge w-badge--neutral"
                    }
                  >
                    {draftApis}건
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 5. 호출량 Top 연계시스템 */}
      {topExtSystems.length > 0 && (
        <div className="w-card" style={{ marginBottom: 16 }}>
          <div className="w-card__head">
            <div>
              <h3 className="w-card__title">호출량 Top 연계시스템</h3>
              <div className="w-card__sub">최근 호출 이력 500건 기준</div>
            </div>
            <Link href="/ext-system" className="w-btn w-btn--ghost w-btn--sm">
              전체 보기 <I name="Right" size={12} />
            </Link>
          </div>
          <div className="w-card__body w-card__body--tight">
            <div className="w-tbl-wrap">
              <table className="w-tbl">
                <thead>
                  <tr>
                    <th>연계시스템</th>
                    <th>ID</th>
                    <th style={{ textAlign: "right" }}>호출</th>
                  </tr>
                </thead>
                <tbody>
                  {topExtSystems.map((e) => (
                    <tr key={e.id} className="is-row">
                      <td className="strong">{e.name}</td>
                      <td className="mono">{e.id}</td>
                      <td className="mono" style={{ textAlign: "right" }}>
                        {e.count}건
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. 가설 배너 — PRD 메시지 (하단으로 이동) */}
      <div className="w-stack" style={{ gap: 16 }}>
        <Link href="/api-list" style={{ textDecoration: "none", color: "inherit" }}>
          <Hypothesis
            tag="가설 1 · 셀프서비스 발급"
            title="신규 API의 70%가 관리자 개입 없이 셀프서비스로 등록될 것이다"
            body={
              <>
                비개발자가 SQL만 알면 <b>30분 안에 REST API</b>를 발급할 수 있는 위저드 플로우.
                자동 검증과 OpenAPI 문서 자동 생성으로 검증.
              </>
            }
            kpis={[
              { v: "71%", l: "셀프서비스 비율" },
              { v: "22분", l: "평균 발급 소요" },
              { v: `${totalApis}`, l: "발급된 API" },
            ]}
          />
        </Link>

        <Link href="/monitoring" style={{ textDecoration: "none", color: "inherit" }}>
          <Hypothesis
            tag="가설 2 · 통합 모니터링"
            title="trace-id 통합 모니터링으로 장애 원인 5분 이내 파악"
            body={
              <>
                실시간 대시보드 → 자동 알림 → 호출이력 검색 → trace-id 상세 → SQL 원인 분석을
                <b> 한 흐름</b>으로 묶어 평균 5분 미만으로 단축.
              </>
            }
            kpis={[
              { v: "3분 12초", l: "평균 MTTR" },
              { v: "14건", l: "활성 알림 규칙" },
              { v: `${errorRate5xx}%`, l: "현재 5xx 오류율" },
            ]}
          />
        </Link>

        <Link href="/datasource" style={{ textDecoration: "none", color: "inherit" }}>
          <Hypothesis
            tag="가설 3 · 무중단 Hot-swap"
            title="데이터소스 hot-swap으로 재시작 0건 운영"
            body={
              <>
                신규 풀 워밍업 + graceful 라우팅 전환 + in-flight 호출 보호 + 자동 롤백 정책으로
                <b> 연간 재시작 0건</b>을 유지.
              </>
            }
            kpis={[
              { v: "0건", l: "올해 재시작" },
              { v: "14건", l: "올해 무중단 전환" },
              { v: "100%", l: "성공률" },
            ]}
          />
        </Link>
      </div>
    </>
  );
}
