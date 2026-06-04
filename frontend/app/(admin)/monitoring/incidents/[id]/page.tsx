// H2_S2 — 인시던트 상세 + AI 자동 진단 + 5xx 추이 차트.
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/design/AppShell";
import { I } from "@/components/design/Icons";
import { LineChart } from "@/components/design/LineChart";
import { CheckItem, Checklist } from "@/components/design/primitives";
import { monitoringSeed } from "@/lib/monitoringSeed";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  const incident = monitoringSeed.incidents.find((x) => x.id === id);
  if (!incident) notFound();

  return (
    <>
      <PageHead
        breadcrumb={["실시간 모니터링", "인시던트"]}
        title={`인시던트 #${incident.id}`}
        sub={`${incident.title} · ${incident.ds} · 진행 중 (${incident.startedMinAgo}분 전 시작)`}
        actions={
          <>
            <button className="w-btn w-btn--ghost w-btn--sm">
              <I name="Bell"/> 알림 음소거
            </button>
            <button className="w-btn w-btn--danger w-btn--sm">
              <I name="Alert"/> 회로 차단 발동
            </button>
            <Link href="/monitoring/logs" className="w-btn w-btn--primary w-btn--sm">
              <I name="Trace"/> 호출이력으로
            </Link>
          </>
        }
      />

      <div className="w-row" style={{ marginBottom: 16, gap: 12 }}>
        <div className="w-card" style={{ flex: 1.5, borderColor: "var(--w-tint-critical)" }}>
          <div className="w-card__body" style={{ padding: 20 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "#ffeaea",
                  color: "var(--w-tint-critical)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <I name="Alert" size={20}/>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--w-tint-critical)",
                    letterSpacing: "0.08em",
                    fontWeight: 700,
                  }}
                >
                  CRITICAL · 알림 규칙 RULE-DB-504-RATE
                </div>
                <h2 className="w-card__title" style={{ fontSize: 20, marginTop: 4 }}>
                  DB_TIMEOUT 응답이 임계치를 초과했습니다
                </h2>
                <div className="w-muted" style={{ fontSize: 13, marginTop: 6 }}>
                  <span className="w-mono">/course/enrollment-stat</span> 경로에서 최근 5분간{" "}
                  <b style={{ color: "var(--w-fg-strong)" }}>{incident.affectedCalls}건</b>의 504가
                  발생 (임계치: 분당 5건)
                </div>
              </div>
            </div>
            <div className="w-divider"/>
            <div className="w-row" style={{ gap: 16 }}>
              <div>
                <div className="w-muted" style={{ fontSize: 11 }}>최초 감지</div>
                <div className="w-strong" style={{ marginTop: 2 }}>{incident.detectedAt}</div>
              </div>
              <div>
                <div className="w-muted" style={{ fontSize: 11 }}>지속 시간</div>
                <div className="w-strong" style={{ marginTop: 2 }}>{incident.durationStr}</div>
              </div>
              <div>
                <div className="w-muted" style={{ fontSize: 11 }}>영향 API</div>
                <div className="w-strong" style={{ marginTop: 2 }}>{incident.affectedApis}</div>
              </div>
              <div>
                <div className="w-muted" style={{ fontSize: 11 }}>영향 호출자</div>
                <div className="w-strong" style={{ marginTop: 2 }}>{incident.affectedClients} 시스템</div>
              </div>
              <div>
                <div className="w-muted" style={{ fontSize: 11 }}>실패 호출</div>
                <div className="w-strong" style={{ marginTop: 2, color: "var(--w-tint-critical)" }}>
                  {incident.affectedCalls}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-card" style={{ flex: 1 }}>
          <div className="w-card__head">
            <h3 className="w-card__title">자동 진단</h3>
            <span className="w-badge w-badge--violet">
              <I name="Spark" size={11}/> AI 분석
            </span>
          </div>
          <div className="w-card__body">
            <Checklist>
              <CheckItem variant="err" icon={<I name="Alert"/>}>
                <b>가능성 높음 (84%)</b> · 최근 14:30에 배포된{" "}
                <span className="w-mono">API-2026-0141 v2</span>가 인덱스 미사용 SQL을 도입했습니다
              </CheckItem>
              <CheckItem variant="run" icon={<I name="Info"/>}>
                관련 풀: <span className="w-mono">DAU-LMS-PROD</span> 활성 커넥션 49/50 (포화)
              </CheckItem>
              <CheckItem variant="run" icon={<I name="Info"/>}>
                유사 패턴 과거 인시던트 2건 · 평균 MTTR 4분
              </CheckItem>
            </Checklist>
          </div>
        </div>
      </div>

      <div className="w-card">
        <div className="w-card__head">
          <h3 className="w-card__title">5xx 발생 추이 · 최근 10분</h3>
        </div>
        <div className="w-card__body">
          <LineChart values={monitoringSeed.series500.slice(-20)} color="var(--w-red)" h={140}/>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 8,
              fontSize: 11,
              color: "var(--w-fg-assistive)",
            }}
          >
            <span>14:22</span>
            <span>14:25</span>
            <span>14:28</span>
            <span>14:32 ← 시작</span>
            <span>지금</span>
          </div>
        </div>
      </div>
    </>
  );
}
