// H3_S1 — 데이터소스 목록 + 풀 포화 감지 + 풀 사용률 차트.
import Link from "next/link";
import { PageHead } from "@/components/design/AppShell";
import { I } from "@/components/design/Icons";
import { LineChart } from "@/components/design/LineChart";
import { MetricTile } from "@/components/design/primitives";
import { DS_RUNTIME_META, POOL_HISTORY_LMS } from "@/lib/datasourceMeta";
import { mockData } from "@/lib/mockData";

const DB_TYPE_LABEL: Record<string, string> = {
  ORACLE: "Oracle 19c",
  POSTGRES: "PostgreSQL 15",
  MYSQL: "MySQL 8",
};

function statusBadgeCls(s: "정상" | "주의" | "심각") {
  if (s === "정상") return "w-badge w-badge--green";
  if (s === "주의") return "w-badge w-badge--orange";
  return "w-badge w-badge--red";
}

export default function Page() {
  const sources = mockData.dataSources;
  const oracleCount = sources.filter((d) => d.dbType === "ORACLE").length;
  const pgCount = sources.filter((d) => d.dbType === "POSTGRES").length;
  const avgPoolPct = Math.round(
    sources.reduce((sum, d) => sum + (DS_RUNTIME_META[d.id]?.poolPct ?? 0), 0) / sources.length,
  );

  return (
    <>
      <PageHead
        breadcrumb={["서비스", "데이터소스"]}
        title="데이터소스 관리"
        sub={`${sources.length}개 풀 · 무중단 hot-swap 지원`}
        actions={
          <>
            <button className="w-btn w-btn--ghost w-btn--sm">
              <I name="Refresh"/> 헬스체크
            </button>
            <button className="w-btn w-btn--primary w-btn--sm">
              <I name="Plus"/> 데이터소스 추가
            </button>
          </>
        }
      />

      <div className="w-metrics" style={{ marginBottom: 16 }}>
        <MetricTile
          label="총 데이터소스"
          value={sources.length}
          delta={`Oracle ${oracleCount} · PG ${pgCount}`}
        />
        <MetricTile
          label="올해 재시작 사례"
          value={<span style={{ color: "var(--w-green)" }}>0</span>}
          unit="건"
          delta="목표 0건 유지"
          deltaTone="up"
        />
        <MetricTile label="진행 중 hot-swap" value="0" delta="최근 변경: 4일 전"/>
        <MetricTile label="평균 풀 사용률" value={avgPoolPct} unit="%" delta="건강한 수준"/>
      </div>

      <div className="w-card">
        <div className="w-card__head">
          <h3 className="w-card__title">데이터소스</h3>
          <input className="w-input" placeholder="이름 검색…" style={{ width: 200 }} aria-label="데이터소스 검색"/>
        </div>
        <div className="w-card__body w-card__body--tight">
          <div className="w-tbl-wrap">
            <table className="w-tbl">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>종류</th>
                  <th>JDBC URL</th>
                  <th>풀 사용</th>
                  <th>지연</th>
                  <th>매핑 API</th>
                  <th>상태</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sources.map((d) => {
                  const meta = DS_RUNTIME_META[d.id];
                  const isLms = d.id === "DS20260509002";
                  return (
                    <tr key={d.id} className={`is-row ${isLms ? "is-selected" : ""}`} data-testid="ds-row">
                      <td className="strong">{d.name}</td>
                      <td>{DB_TYPE_LABEL[d.dbType] ?? d.dbType}</td>
                      <td className="mono muted" style={{ fontSize: 11.5 }}>
                        {d.jdbcUrl}
                      </td>
                      <td className="mono">{meta?.pool ?? "—"}</td>
                      <td className="mono">{meta ? `${meta.latencyMs}ms` : "—"}</td>
                      <td>{meta?.apiCount ?? 0}</td>
                      <td>
                        <span className={statusBadgeCls(meta?.status ?? "정상")}>
                          {meta?.status ?? "정상"}
                        </span>
                      </td>
                      <td>
                        {isLms ? (
                          <Link
                            href={`/datasource/${d.id}/swap`}
                            className="w-btn w-btn--soft w-btn--sm"
                          >
                            <I name="Swap"/> 무중단 변경
                          </Link>
                        ) : (
                          <Link href={`/datasource/${d.id}/swap`} className="w-btn w-btn--ghost w-btn--sm">
                            관리 <I name="Right" size={12}/>
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="w-card" style={{ marginTop: 16 }}>
        <div className="w-card__head">
          <h3 className="w-card__title">DAU-LMS-PROD · 풀 사용률 추이</h3>
          <span className="w-badge w-badge--orange">
            <I name="Alert" size={11}/> 풀 포화 임박
          </span>
        </div>
        <div className="w-card__body">
          <LineChart values={POOL_HISTORY_LMS} h={100} color="var(--w-orange)"/>
          <div className="w-muted" style={{ fontSize: 12, marginTop: 8 }}>
            최근 60분 사용률이 한도(50)에 근접합니다. 풀 크기 확장 또는 인스턴스 마이그레이션이 권장됩니다.
          </div>
        </div>
      </div>
    </>
  );
}
