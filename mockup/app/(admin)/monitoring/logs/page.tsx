// H2_S3 — 호출이력 검색. 조건 패널 + 결과 테이블 (trace-id 클릭 시 상세).
import Link from "next/link";
import { PageHead } from "@/components/design/AppShell";
import { I } from "@/components/design/Icons";
import { monitoringSeed } from "@/lib/monitoringSeed";

function statusBadgeCls(st: number) {
  if (st >= 500) return "w-badge w-badge--red";
  if (st >= 400) return "w-badge w-badge--orange";
  return "w-badge w-badge--green";
}

export default function Page() {
  const rows = monitoringSeed.callRows;
  return (
    <>
      <PageHead
        breadcrumb={["실시간 모니터링", "호출이력"]}
        title="호출 이력 검색"
        sub="조건으로 좁혀가며 trace-id를 추적합니다"
        actions={
          <>
            <button className="w-btn w-btn--ghost w-btn--sm">
              <I name="Down"/> CSV 내보내기
            </button>
            <button className="w-btn w-btn--primary w-btn--sm">
              <I name="Refresh"/> 갱신
            </button>
          </>
        }
      />

      <div className="w-card" style={{ marginBottom: 16 }}>
        <div className="w-card__body" style={{ padding: 16 }}>
          <div className="w-row" style={{ gap: 12 }}>
            <div className="w-field">
              <div className="w-field__lbl">기간</div>
              <select className="w-select" defaultValue="최근 10분">
                <option>최근 10분</option>
                <option>최근 1시간</option>
                <option>최근 24시간</option>
                <option>사용자 지정</option>
              </select>
            </div>
            <div className="w-field">
              <div className="w-field__lbl">API</div>
              <select className="w-select" defaultValue="/course/enrollment-stat">
                <option>전체</option>
                <option>/course/enrollment-stat</option>
              </select>
            </div>
            <div className="w-field">
              <div className="w-field__lbl">응답코드</div>
              <select className="w-select" defaultValue="5xx">
                <option>전체</option>
                <option>5xx</option>
                <option>4xx</option>
                <option>504 DB_TIMEOUT</option>
              </select>
            </div>
            <div className="w-field">
              <div className="w-field__lbl">연계시스템</div>
              <select className="w-select" defaultValue="전체">
                <option>전체</option>
                <option>수강신청-WEB</option>
              </select>
            </div>
            <div className="w-field">
              <div className="w-field__lbl">클라이언트 IP</div>
              <input className="w-input w-mono" placeholder="10.21.4.18"/>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button className="w-btn w-btn--primary">
                <I name="Search"/> 검색
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-card">
        <div className="w-card__head">
          <div>
            <h3 className="w-card__title">검색 결과</h3>
            <div className="w-card__sub">
              <b style={{ color: "var(--w-fg-strong)" }}>72건</b> / 전체 348,210건 · 14:32 이후
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span className="w-badge w-badge--red">504 · 70</span>
            <span className="w-badge w-badge--orange">401 · 1</span>
            <span className="w-badge w-badge--green">200 · 1</span>
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
                {rows.map((r, i) => (
                  <tr key={r.trace} className={`is-row ${i === 0 ? "is-selected" : ""}`}>
                    <td className="mono" style={{ fontSize: 12 }}>{r.t}</td>
                    <td>
                      <span className={statusBadgeCls(r.st)}>{r.st}</span>
                    </td>
                    <td className="mono">{r.ms}ms</td>
                    <td className="mono strong">{r.path}</td>
                    <td>{r.sys}</td>
                    <td className="mono muted">{r.ip}</td>
                    <td className="mono" style={{ fontSize: 12, color: "var(--w-tint-primary)" }}>
                      <Link href={`/monitoring/logs/${r.trace}`}>{r.trace}</Link>
                    </td>
                    <td>
                      <Link
                        href={`/monitoring/logs/${r.trace}`}
                        className="w-btn w-btn--ghost w-btn--sm"
                        aria-label="상세 보기"
                      >
                        <I name="Eye"/>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div
          style={{
            padding: "12px 16px",
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid var(--w-line-neutral)",
            fontSize: 12,
            color: "var(--w-fg-alternative)",
          }}
        >
          <span>1–8 / 72건</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="w-btn w-btn--ghost w-btn--sm" disabled>이전</button>
            <button className="w-btn w-btn--ghost w-btn--sm">다음</button>
          </div>
        </div>
      </div>
    </>
  );
}
