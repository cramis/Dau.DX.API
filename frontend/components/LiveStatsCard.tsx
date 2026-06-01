// 대시보드 라이브 KPI — 5초마다 `/api/mock/monitoring/stats` 폴링.
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { I } from "@/components/design/Icons";
import { LineChart } from "@/components/design/LineChart";

interface Stats {
  total: number;
  success: number;
  errors: number;
  p95: number;
  successRate: number;
  seriesOk: number[];
  seriesErr: number[];
  windowMin: number;
}

export function LiveStatsCard() {
  const [stats, setStats] = useState<Stats | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/mock/monitoring/stats?windowMin=10", {
        cache: "no-store",
      });
      const data = await res.json();
      if (data?.ok) setStats(data as Stats);
    } catch {
      // 무시 — 다음 틱에 재시도.
    }
  }

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 5000);
    return () => clearInterval(id);
  }, []);

  if (!stats) {
    return null;
  }

  return (
    <div className="w-card" style={{ marginTop: 16 }}>
      <div className="w-card__head" style={{ flexWrap: "wrap" }}>
        <div>
          <h3 className="w-card__title">
            <span
              className="w-badge w-badge--blue"
              style={{ marginRight: 8 }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  background: "var(--w-tint-primary)",
                  borderRadius: "50%",
                  display: "inline-block",
                  marginRight: 4,
                }}
              />
              LIVE
            </span>
            라이브 호출 큐
          </h3>
          <div className="w-card__sub">
            최근 {stats.windowMin}분 · 5초 폴링 · 샘플 GW 호출이 즉시 반영
          </div>
        </div>
        <Link href="/monitoring/logs" className="w-btn w-btn--soft w-btn--sm">
          <I name="Trace" /> 호출 이력 열기
        </Link>
      </div>
      <div className="w-card__body">
        <div className="w-metrics">
          <div className="w-metric">
            <div className="w-metric__lbl">총 호출</div>
            <div className="w-metric__val">
              {stats.total}
              <span className="unit">건</span>
            </div>
            <div className="w-metric__delta">최근 {stats.windowMin}분 누적</div>
          </div>
          <div className="w-metric">
            <div className="w-metric__lbl">성공</div>
            <div className="w-metric__val">
              <span style={{ color: "var(--w-green)" }}>{stats.success}</span>
              <span className="unit">건</span>
            </div>
            <div className="w-metric__delta w-metric__delta--up">
              성공률 {stats.successRate}%
            </div>
          </div>
          <div className="w-metric">
            <div className="w-metric__lbl">오류 (≥400)</div>
            <div className="w-metric__val">
              <span
                style={{
                  color:
                    stats.errors > 0 ? "var(--w-tint-critical)" : undefined,
                }}
              >
                {stats.errors}
              </span>
              <span className="unit">건</span>
            </div>
            <div
              className={`w-metric__delta ${stats.errors > 0 ? "w-metric__delta--down" : ""}`}
            >
              {stats.errors > 0 ? "조사 필요" : "양호"}
            </div>
          </div>
          <div className="w-metric">
            <div className="w-metric__lbl">p95 응답시간</div>
            <div className="w-metric__val">
              {stats.p95}
              <span className="unit">ms</span>
            </div>
            <div className="w-metric__delta">실측 95퍼센타일</div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div
              className="w-muted"
              style={{ fontSize: 11, marginBottom: 4 }}
            >
              2xx (분당)
            </div>
            <LineChart values={stats.seriesOk} h={80} fill />
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div
              className="w-muted"
              style={{ fontSize: 11, marginBottom: 4 }}
            >
              ≥400 (분당)
            </div>
            <LineChart
              values={stats.seriesErr}
              h={80}
              color="var(--w-red)"
              fill={false}
            />
          </div>
        </div>

        {stats.total === 0 && (
          <p
            className="w-muted"
            style={{ fontSize: 12, marginTop: 12 }}
          >
            아직 호출 이력이 없습니다. 별도 터미널에서{" "}
            <span className="w-mono">
              curl http://localhost:3000/api/sample/sample-user-info?id=user01
            </span>{" "}
            을 실행하면 5초 안에 KPI 가 갱신됩니다.
          </p>
        )}
      </div>
    </div>
  );
}
