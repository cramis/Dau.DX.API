// H2_S6 — 알림 규칙 관리. 규칙 목록 + 편집 패널 + 발동 이력.
import { PageHead } from "@/components/design/AppShell";
import { I } from "@/components/design/Icons";
import { LineChart } from "@/components/design/LineChart";
import { monitoringSeed } from "@/lib/monitoringSeed";

export default function Page() {
  const rules = monitoringSeed.rules;
  const selected = rules.find((r) => r.selected) ?? rules[0];

  return (
    <>
      <PageHead
        breadcrumb={["실시간 모니터링", "알림 규칙"]}
        title="알림 규칙"
        sub="14개 활성 규칙 · 최근 30일 발동 22회"
        actions={
          <>
            <button className="w-btn w-btn--ghost w-btn--sm">
              <I name="Down"/> 규칙 내보내기
            </button>
            <button className="w-btn w-btn--primary w-btn--sm">
              <I name="Plus"/> 새 규칙
            </button>
          </>
        }
      />

      <div className="w-split--3">
        <div className="w-card">
          <div className="w-card__head">
            <h3 className="w-card__title">규칙 목록</h3>
          </div>
          <div className="w-card__body w-card__body--tight">
            <div className="w-tbl-wrap">
              <table className="w-tbl">
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>대상</th>
                    <th>임계치</th>
                    <th>최근 발동</th>
                    <th>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.name} className={`is-row ${r.selected ? "is-selected" : ""}`}>
                      <td className="strong">{r.name}</td>
                      <td className="mono">{r.target}</td>
                      <td>{r.threshold}</td>
                      <td className="muted">{r.lastFired}</td>
                      <td>
                        <span
                          className={`w-badge ${
                            r.status === "active" ? "w-badge--green" : "w-badge--orange"
                          }`}
                        >
                          {r.status === "active" ? "활성" : "검토"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="w-card">
          <div className="w-card__head">
            <h3 className="w-card__title">규칙 편집 — {selected.name}</h3>
            <span className="w-badge w-badge--green">저장됨</span>
          </div>
          <div className="w-card__body">
            <div className="w-stack">
              <div className="w-field">
                <div className="w-field__lbl">규칙 이름</div>
                <input className="w-input" defaultValue={selected.name}/>
              </div>
              <div className="w-field">
                <div className="w-field__lbl">대상 메트릭</div>
                <select className="w-select" defaultValue="응답코드 + 오류코드">
                  <option>응답코드 + 오류코드</option>
                  <option>응답시간</option>
                  <option>호출량</option>
                </select>
              </div>
              <div className="w-field">
                <div className="w-field__lbl">조건</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <select className="w-select" style={{ flex: 1, minWidth: 140 }} defaultValue="DB_TIMEOUT">
                    <option>DB_TIMEOUT</option>
                    <option>전체 5xx</option>
                  </select>
                  <input className="w-input w-mono" style={{ width: 80 }} defaultValue="5"/>
                  <select className="w-select" style={{ flex: 1, minWidth: 140 }} defaultValue="건/분 이상">
                    <option>건/분 이상</option>
                    <option>건/시간 이상</option>
                  </select>
                </div>
              </div>
              <div className="w-field">
                <div className="w-field__lbl">알림 채널</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span className="w-badge w-badge--blue">
                    <I name="Bell" size={11}/> 콘솔
                  </span>
                  <span className="w-badge w-badge--blue">📧 ops@donga.ac.kr</span>
                  <span className="w-badge w-badge--blue">Slack #api-alerts</span>
                  <button className="w-btn w-btn--ghost w-btn--sm">
                    <I name="Plus"/> 추가
                  </button>
                </div>
              </div>
              <div className="w-field">
                <div className="w-field__lbl">자동 조치</div>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                  <input type="checkbox" defaultChecked/> 발동 시 호출이력 검색 자동 실행
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                  <input type="checkbox" defaultChecked/> AI 원인 분석 자동 실행
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                  <input type="checkbox"/> 영향 API 회로 차단 (위험)
                </label>
              </div>
              <button className="w-btn w-btn--primary">변경사항 저장</button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-card" style={{ marginTop: 16 }}>
        <div className="w-card__head">
          <h3 className="w-card__title">발동 이력 — 최근 7일</h3>
        </div>
        <div className="w-card__body">
          <LineChart values={monitoringSeed.ruleFiredHistory} h={80} color="var(--w-tint-critical)"/>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 6,
              fontSize: 11,
              color: "var(--w-fg-assistive)",
            }}
          >
            <span>5/3</span>
            <span>5/4</span>
            <span>5/5</span>
            <span>5/6</span>
            <span>5/7</span>
            <span>5/8</span>
            <span>오늘</span>
          </div>
        </div>
      </div>
    </>
  );
}
