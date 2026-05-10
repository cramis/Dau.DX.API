// 호출 이력 — `/api/mock/monitoring/history` 를 5초마다 폴링해 표 갱신.
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { I } from "@/components/design/Icons";
import type { CallHistory } from "@/types/api";

function statusBadgeCls(st: number) {
  if (st >= 500) return "w-badge w-badge--red";
  if (st >= 400) return "w-badge w-badge--orange";
  if (st >= 300) return "w-badge w-badge--neutral";
  return "w-badge w-badge--green";
}

function shortTime(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", { hour12: false });
}

interface Props {
  refreshMs?: number;
}

export function LiveLogTable({ refreshMs = 5000 }: Props) {
  const [items, setItems] = useState<CallHistory[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [auto, setAuto] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "ok" | "4xx" | "5xx">("all");
  const [q, setQ] = useState("");
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/mock/monitoring/history?limit=200", {
        cache: "no-store",
      });
      const data = await res.json();
      if (data?.ok) setItems(data.items as CallHistory[]);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!auto) {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
      return;
    }
    tickRef.current = setInterval(() => void load(), refreshMs);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [auto, refreshMs]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return items.filter((e) => {
      if (statusFilter === "ok" && (e.statusCode < 200 || e.statusCode >= 300)) return false;
      if (statusFilter === "4xx" && (e.statusCode < 400 || e.statusCode >= 500)) return false;
      if (statusFilter === "5xx" && e.statusCode < 500) return false;
      if (ql) {
        const hay = `${e.reqPath} ${e.traceId} ${e.clientIp} ${e.errorCode ?? ""}`.toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
  }, [items, statusFilter, q]);

  const okCount = items.filter((e) => e.statusCode >= 200 && e.statusCode < 300).length;
  const errCount = items.filter((e) => e.statusCode >= 400).length;

  return (
    <div className="w-card">
      <div className="w-card__head" style={{ flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 className="w-card__title">검색 결과</h3>
          <div className="w-card__sub">
            <b style={{ color: "var(--w-fg-strong)" }}>{filtered.length}건</b> /
            전체 {items.length}건 · {auto ? "5초 자동 새로고침" : "수동"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span className="w-badge w-badge--green">200 · {okCount}</span>
          <span className="w-badge w-badge--red">≥400 · {errCount}</span>
          <select
            className="w-select"
            style={{ width: 130 }}
            aria-label="응답코드 필터"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as typeof statusFilter)
            }
          >
            <option value="all">전체 응답코드</option>
            <option value="ok">2xx</option>
            <option value="4xx">4xx</option>
            <option value="5xx">5xx</option>
          </select>
          <input
            className="w-input w-mono"
            style={{ width: 180 }}
            placeholder="trace·IP·경로 검색"
            aria-label="이력 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <label
            className="w-checkbox-row"
            style={{ marginLeft: 4, fontSize: 12 }}
          >
            <input
              type="checkbox"
              checked={auto}
              onChange={(e) => setAuto(e.target.checked)}
            />
            <span>자동</span>
          </label>
          <button
            type="button"
            className="w-btn w-btn--ghost w-btn--sm"
            onClick={() => void load()}
          >
            <I name="Refresh" size={12} /> 갱신
          </button>
        </div>
      </div>
      <div className="w-card__body w-card__body--tight">
        <div className="w-tbl-wrap">
          <table className="w-tbl">
            <thead>
              <tr>
                <th>호출시각</th>
                <th>응답</th>
                <th>응답시간</th>
                <th>요청 경로</th>
                <th>연계시스템</th>
                <th>클라이언트 IP</th>
                <th>trace-id</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="w-empty">
                      <p className="w-empty__title">
                        {loaded
                          ? items.length === 0
                            ? "수집된 호출 이력이 없습니다"
                            : "필터에 매칭되는 호출이 없습니다"
                          : "불러오는 중…"}
                      </p>
                      {loaded && items.length === 0 && (
                        <p className="w-empty__sub">
                          별도 터미널에서{" "}
                          <span className="w-mono">
                            curl http://localhost:3000/api/sample/sample-user-info?id=user01
                          </span>{" "}
                          를 호출하면 5초 안에 이 표에 반영됩니다.
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.seq} className="is-row" data-testid="log-row">
                    <td className="mono" style={{ fontSize: 12 }}>
                      {shortTime(r.calledAt)}
                    </td>
                    <td>
                      <span className={statusBadgeCls(r.statusCode)}>
                        {r.statusCode}
                      </span>
                    </td>
                    <td className="mono">{r.elapsedMs}ms</td>
                    <td className="mono strong">/{r.reqPath}</td>
                    <td>
                      {r.extSysId ? (
                        <span className="mono" style={{ fontSize: 11 }}>
                          {r.extSysId}
                        </span>
                      ) : (
                        <span className="muted">익명</span>
                      )}
                    </td>
                    <td className="mono muted">{r.clientIp}</td>
                    <td
                      className="mono"
                      style={{ fontSize: 12, color: "var(--w-tint-primary)" }}
                    >
                      <Link href={`/monitoring/logs/${r.traceId}`}>
                        {r.traceId}
                      </Link>
                    </td>
                    <td>
                      <Link
                        href={`/monitoring/logs/${r.traceId}`}
                        className="w-btn w-btn--ghost w-btn--sm"
                        aria-label="상세 보기"
                      >
                        <I name="Eye" />
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
  );
}
