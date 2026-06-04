// H2_S3 — 호출 이력 검색. 라이브 큐(`/api/mock/monitoring/history`) 폴링.
import { PageHead } from "@/components/design/AppShell";
import { I } from "@/components/design/Icons";
import { LiveLogTable } from "@/components/LiveLogTable";

export default function Page() {
  return (
    <>
      <PageHead
        breadcrumb={["실시간 모니터링", "호출이력"]}
        title="호출 이력 검색"
        sub="라이브 큐 — 샘플 GW 호출이 즉시 반영됩니다"
        actions={
          <button className="w-btn w-btn--ghost w-btn--sm">
            <I name="Down" /> CSV 내보내기
          </button>
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
              <div className="w-field__lbl">샘플 호출 가이드</div>
              <code
                className="w-input w-mono"
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: 11.5,
                  background: "var(--w-bg-alternative)",
                }}
              >
                curl /api/sample/sample-user-info?id=user01
              </code>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button className="w-btn w-btn--primary" type="button">
                <I name="Search" /> 결과 갱신
              </button>
            </div>
          </div>
        </div>
      </div>

      <LiveLogTable />
    </>
  );
}
