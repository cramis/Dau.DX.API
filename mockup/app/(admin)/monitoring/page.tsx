// H2_S1 — 실시간 모니터링 대시보드. 호출량/에러율/p95 KPI + 호출량 그래프 + 인시던트 + 상위 영향 API.
import Link from "next/link";
import { PageHead } from "@/components/design/AppShell";
import { I } from "@/components/design/Icons";
import { LineChart } from "@/components/design/LineChart";
import { MetricTile } from "@/components/design/primitives";
import { monitoringSeed } from "@/lib/monitoringSeed";

export default function Page() {
  const m = monitoringSeed;
  const incident = m.incidents[0];

  return (
    <>
      <PageHead
        breadcrumb={["서비스", "실시간 모니터링"]}
        title="실시간 모니터링"
        sub="최근 30분 · 5초 자동 새로고침 · 모든 데이터소스"
        actions={
          <>
            <button className="w-btn w-btn--ghost w-btn--sm">
              <I name="Filter"/> 필터
            </button>
            <button className="w-btn w-btn--ghost w-btn--sm">
              <I name="Refresh"/> 새로고침
            </button>
            <Link href="/monitoring/rules" className="w-btn w-btn--soft w-btn--sm">
              <I name="Bell"/> 알림 규칙
            </Link>
          </>
        }
      />

      <div className="w-metrics" style={{ marginBottom: 16 }}>
        <MetricTile
          label="분당 호출량"
          value={m.metrics.rpm}
          unit="k RPM"
          delta="+12% vs 어제"
          deltaTone="up"
        />
        <MetricTile label="p95 응답시간" value={m.metrics.p95} unit="ms" delta="목표 500ms 이내"/>
        <MetricTile
          label="오류율 (5xx)"
          value={m.metrics.errRate}
          unit="%"
          delta="▲ 임계치 초과"
          deltaTone="down"
          accent="critical"
        />
        <MetricTile
          label="활성 연계시스템"
          value={m.metrics.activeExt}
          delta={`전체 ${m.metrics.totalExt}개 중`}
        />
      </div>

      <div className="w-split--3" style={{ marginBottom: 16 }}>
        <div className="w-card">
          <div className="w-card__head">
            <div>
              <h3 className="w-card__title">호출량 / 응답코드</h3>
              <div className="w-card__sub">최근 30분 · 1분 단위 집계</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <span className="w-topbar__chip"><span className="dot" style={{ background: "var(--w-tint-primary)" }}/>2xx</span>
              <span className="w-topbar__chip"><span className="dot" style={{ background: "var(--w-orange)" }}/>4xx</span>
              <span className="w-topbar__chip"><span className="dot" style={{ background: "var(--w-red)" }}/>5xx</span>
            </div>
          </div>
          <div className="w-card__body">
            <div style={{ position: "relative", height: 200 }}>
              <div style={{ position: "absolute", inset: 0 }}>
                <LineChart values={m.seriesOk} h={200} fill/>
              </div>
              <div style={{ position: "absolute", inset: 0 }}>
                <LineChart values={m.series500} h={200} color="var(--w-red)" fill={false}/>
              </div>
              <div
                style={{
                  position: "absolute",
                  left: "78%",
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: "var(--w-red)",
                  opacity: 0.5,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "78%",
                  top: 8,
                  transform: "translateX(8px)",
                  padding: "4px 8px",
                  background: "var(--w-red)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 6,
                }}
              >
                이상 감지 14:32
              </div>
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
              <span>14:00</span>
              <span>14:10</span>
              <span>14:20</span>
              <span>14:30</span>
              <span>지금</span>
            </div>
          </div>
        </div>

        <div className="w-card">
          <div className="w-card__head">
            <h3 className="w-card__title">진행 중 인시던트</h3>
            <span className="w-badge w-badge--red">
              <I name="Alert" size={11}/> {m.incidents.length}
            </span>
          </div>
          <div className="w-card__body">
            <div
              style={{
                padding: 12,
                border: "1px solid var(--w-tint-critical)",
                borderRadius: 10,
                background: "#fff5f5",
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className="w-badge w-badge--red">PROD</span>
                <span className="w-strong">{incident.title}</span>
              </div>
              <div className="w-muted" style={{ fontSize: 12, marginTop: 4 }}>
                <span className="w-mono">{incident.ds}</span> · 시작{" "}
                <b style={{ color: "var(--w-fg-strong)" }}>{incident.startedMinAgo}분 전</b>
              </div>
              <div style={{ marginTop: 8, fontSize: 12.5 }}>
                {incident.affectedCalls}건의 504 응답 · 영향 API {incident.affectedApis}개 · trace-id 수집 완료
              </div>
              <Link
                href={`/monitoring/incidents/${incident.id}`}
                className="w-btn w-btn--danger w-btn--sm"
                style={{ marginTop: 10 }}
              >
                <I name="Trace"/> 원인 분석 시작
              </Link>
            </div>
            <div className="w-divider"/>
            <div className="w-muted" style={{ fontSize: 12 }}>
              최근 6시간 인시던트 0건 · MTTR 평균{" "}
              <b style={{ color: "var(--w-fg-strong)" }}>{m.metrics.mttrMin}</b>
            </div>
          </div>
        </div>
      </div>

      <div className="w-card">
        <div className="w-card__head">
          <h3 className="w-card__title">상위 영향 API</h3>
          <span className="w-muted" style={{ fontSize: 12 }}>오류율 기준</span>
        </div>
        <div className="w-card__body w-card__body--tight">
          <div className="w-tbl-wrap">
            <table className="w-tbl">
              <thead>
                <tr>
                  <th>API</th>
                  <th>경로</th>
                  <th>호출량</th>
                  <th>p95</th>
                  <th>오류율</th>
                  <th>주요 오류</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {m.topImpactedApis.map((r, idx) => (
                  <tr
                    key={r.name}
                    className="is-row"
                    style={idx === 0 ? { background: "#fff5f5" } : undefined}
                  >
                    <td className="strong">{r.name}</td>
                    <td className="mono">{r.path}</td>
                    <td>{r.rpm}</td>
                    <td>{r.p95}</td>
                    <td>
                      <span
                        className={`w-badge ${
                          r.errClass === "red"
                            ? "w-badge--red"
                            : r.errClass === "orange"
                            ? "w-badge--orange"
                            : "w-badge--green"
                        }`}
                      >
                        {r.errRate}
                      </span>
                    </td>
                    <td>
                      <span className="mono" style={{ color: r.errClass === "red" ? "var(--w-tint-critical)" : undefined }}>
                        {r.mainErr}
                      </span>
                    </td>
                    <td>
                      <Link href="/monitoring/logs" className="w-btn w-btn--ghost w-btn--sm">
                        상세 <I name="Right" size={12}/>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
