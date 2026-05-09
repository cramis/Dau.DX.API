// H3_S5 — 무중단 변경 위저드 4단계: Hot-swap 실행 중 (실시간 진행률 + 트래픽 분포 + 이벤트 로그).
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/design/AppShell";
import { Stepper } from "@/components/design/Stepper";
import { mockData } from "@/lib/mockData";

const SWAP_STEPS = ["변경 정보", "연결 테스트", "영향도 검토", "Hot-swap 실행", "완료"];

const EVENT_LOG = [
  { t: "14:48:22.118", level: "INFO", color: "#82aaff", msg: "hot-swap initiated · op-id sw-2026-0512" },
  { t: "14:48:22.380", level: "INFO", color: "#82aaff", msg: "warming new pool · target=10 connections" },
  { t: "14:48:24.221", level: "OK",   color: "#addb67", msg: "new pool ready · 10/10 healthy" },
  { t: "14:48:24.222", level: "INFO", color: "#82aaff", msg: "routing flip · stage 1/3 (10%)" },
  { t: "14:48:24.580", level: "OK",   color: "#addb67", msg: "canary check passed · 5xx=0.00%" },
  { t: "14:48:24.812", level: "INFO", color: "#82aaff", msg: "routing flip · stage 2/3 (50%)" },
  { t: "14:48:25.310", level: "OK",   color: "#addb67", msg: "canary check passed · 5xx=0.00%" },
  { t: "14:48:25.722", level: "INFO", color: "#82aaff", msg: "routing flip · stage 3/3 (100%)" },
  { t: "14:48:26.044", level: "INFO", color: "#82aaff", msg: "draining old pool · 31 in-flight" },
  { t: "14:48:30.218", level: "INFO", color: "#82aaff", msg: "draining · 8 in-flight remaining" },
  { t: "14:48:31.550", level: "···",  color: "#ffcb6b", msg: "in-flight: 2 · awaiting completion" },
];

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  const ds = mockData.dataSources.find((d) => d.id === id);
  if (!ds) notFound();

  return (
    <>
      <PageHead
        breadcrumb={[ds.name, "무중단 변경"]}
        title="Hot-swap 실행 중"
        sub="진행률 78% · 약 3초 후 완료 예상"
        actions={
          <>
            <Link href={`/datasource/${ds.id}/swap/done`} className="w-btn w-btn--danger w-btn--sm">
              즉시 롤백
            </Link>
            <Link
              href={`/datasource/${ds.id}/swap/done`}
              className="w-btn w-btn--primary w-btn--sm"
            >
              완료 보기
            </Link>
          </>
        }
      />
      <Stepper steps={SWAP_STEPS} current={3}/>

      <div className="w-card" style={{ marginBottom: 16, borderColor: "var(--w-tint-primary)" }}>
        <div className="w-card__body" style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: "var(--w-tint-primary)",
                  fontWeight: 700,
                }}
              >
                진행 중
              </div>
              <h2 className="w-card__title" style={{ fontSize: 20, marginTop: 4 }}>
                graceful hot-swap · 78%
              </h2>
            </div>
            <div className="w-strong w-mono" style={{ fontSize: 24, color: "var(--w-tint-primary)" }}>
              00:00:09
            </div>
          </div>
          <div className="w-progress" style={{ height: 10 }}>
            <div style={{ width: "78%" }}/>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 8,
              fontSize: 11.5,
              color: "var(--w-fg-alternative)",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span>워밍업 ✓</span>
            <span>라우팅 전환 ✓</span>
            <span>in-flight 대기 (진행 중)</span>
            <span>graceful close</span>
            <span>완료</span>
          </div>
        </div>
      </div>

      <div className="w-split">
        <div className="w-card">
          <div className="w-card__head">
            <h3 className="w-card__title">실시간 트래픽 분포</h3>
          </div>
          <div className="w-card__body">
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
              <div className="w-strong w-mono" style={{ fontSize: 13, width: 140 }}>
                구 풀 (lms-prd)
              </div>
              <div
                style={{
                  flex: 1,
                  minWidth: 100,
                  height: 18,
                  position: "relative",
                  background: "var(--w-static-black-05)",
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    height: "100%",
                    width: "6%",
                    background: "var(--w-coolgray-600)",
                  }}
                />
              </div>
              <div className="w-mono" style={{ width: 100, textAlign: "right" }}>
                6% · 31 호출
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div className="w-strong w-mono" style={{ fontSize: 13, width: 140 }}>
                신 풀 (lms-prd-v2)
              </div>
              <div
                style={{
                  flex: 1,
                  minWidth: 100,
                  height: 18,
                  position: "relative",
                  background: "var(--w-static-black-05)",
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    height: "100%",
                    width: "94%",
                    background: "var(--w-tint-primary)",
                  }}
                />
              </div>
              <div className="w-mono" style={{ width: 100, textAlign: "right" }}>
                94% · 7,712
              </div>
            </div>
            <div className="w-divider"/>
            <div className="w-row" style={{ gap: 12 }}>
              <div className="w-metric" style={{ flex: 1, padding: 12 }}>
                <div className="w-metric__lbl">현재 5xx률</div>
                <div className="w-strong" style={{ fontSize: 18, marginTop: 4, color: "var(--w-green)" }}>
                  0.00%
                </div>
              </div>
              <div className="w-metric" style={{ flex: 1, padding: 12 }}>
                <div className="w-metric__lbl">신규 풀 p95</div>
                <div className="w-strong" style={{ fontSize: 18, marginTop: 4 }}>62ms</div>
              </div>
              <div className="w-metric" style={{ flex: 1, padding: 12 }}>
                <div className="w-metric__lbl">취소된 호출</div>
                <div className="w-strong" style={{ fontSize: 18, marginTop: 4 }}>0</div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-card">
          <div className="w-card__head">
            <h3 className="w-card__title">이벤트 로그</h3>
            <span className="w-muted w-mono" style={{ fontSize: 11 }}>tail -f</span>
          </div>
          <div
            style={{
              padding: 14,
              background: "#0e1014",
              color: "#d6deeb",
              fontFamily: "var(--w-font-mono)",
              fontSize: 12,
              lineHeight: 1.7,
              maxHeight: 280,
              overflow: "auto",
            }}
          >
            {EVENT_LOG.map((line) => (
              <div key={line.t}>
                <span style={{ color: "#637777" }}>{line.t}</span>{" "}
                <span style={{ color: line.color }}>{line.level}</span>  {line.msg}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
