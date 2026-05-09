// H2_S4 — trace 상세. 분산 트레이스 + 요청/응답 코드블록.
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/design/AppShell";
import { CodeBlock } from "@/components/design/CodeBlock";
import { I } from "@/components/design/Icons";
import { MetricTile, Notice, TraceRow } from "@/components/design/primitives";
import { getCallByTrace } from "@/lib/monitoringSeed";

type Props = { params: Promise<{ traceId: string }> };

export default async function Page({ params }: Props) {
  const { traceId } = await params;
  const call = getCallByTrace(traceId);
  if (!call) notFound();

  const reqLines = [
    `<span class="tk-key">${call.st >= 400 ? "GET" : "GET"}</span> <span class="tk-str">/api${call.path}?year=2026&amp;semester=1</span>`,
    `<span class="tk-var">Host</span>: api.donga.ac.kr`,
    `<span class="tk-var">certification-key</span>: dau_prod_3a••••`,
    `<span class="tk-var">X-Request-Id</span>: client-93f2-1`,
  ];

  const respLines = call.st >= 500
    ? [
        `{`,
        `  <span class="tk-str">"success"</span>: <span class="tk-key">false</span>,`,
        `  <span class="tk-str">"error"</span>: {`,
        `    <span class="tk-str">"code"</span>: <span class="tk-str">"DB_TIMEOUT"</span>,`,
        `    <span class="tk-str">"message"</span>: <span class="tk-str">"DB 쿼리 타임아웃 (5,000ms)"</span>`,
        `  },`,
        `  <span class="tk-str">"traceId"</span>: <span class="tk-str">"${call.trace}"</span>`,
        `}`,
      ]
    : [
        `{`,
        `  <span class="tk-str">"success"</span>: <span class="tk-key">true</span>,`,
        `  <span class="tk-str">"data"</span>: [],`,
        `  <span class="tk-str">"traceId"</span>: <span class="tk-str">"${call.trace}"</span>`,
        `}`,
      ];

  return (
    <>
      <PageHead
        breadcrumb={["호출이력", call.trace]}
        title="호출 상세"
        sub={`trace-id ${call.trace} · ${call.st} ${call.st >= 500 ? "DB_TIMEOUT" : "OK"}`}
        actions={
          <>
            <button className="w-btn w-btn--ghost w-btn--sm">
              <I name="Copy"/> trace-id 복사
            </button>
            <button className="w-btn w-btn--ghost w-btn--sm">관련 호출 24건</button>
            <Link
              href={`/monitoring/logs/${call.trace}/root-cause`}
              className="w-btn w-btn--primary w-btn--sm"
            >
              <I name="Branch"/> SQL 분석
            </Link>
          </>
        }
      />

      <div className="w-row" style={{ marginBottom: 16, gap: 12 }}>
        <MetricTile
          label="응답코드"
          value={<span style={{ color: call.st >= 500 ? "var(--w-tint-critical)" : undefined }}>{call.st}</span>}
          delta={call.st >= 500 ? "DB_TIMEOUT" : "OK"}
        />
        <MetricTile
          label="총 처리시간"
          value={call.ms}
          unit="ms"
          delta="▲ p95(180ms) 27배"
          deltaTone="down"
        />
        <MetricTile
          label="DB 시간"
          value="5,000"
          unit="ms"
          delta="99.96% — 게이트웨이 정상"
        />
        <div className="w-metric">
          <div className="w-metric__lbl">호출자</div>
          <div className="w-strong" style={{ fontSize: 14, marginTop: 6 }}>{call.sys}</div>
          <div className="w-muted" style={{ fontSize: 11, marginTop: 2 }}>
            {call.ip} · key: dau_prod_3a••
          </div>
        </div>
      </div>

      <div className="w-split--3">
        <div className="w-card">
          <div className="w-card__head">
            <h3 className="w-card__title">분산 트레이스</h3>
            <span className="w-muted w-mono" style={{ fontSize: 11 }}>
              OpenTelemetry · gateway → meta → ds-pool → oracle
            </span>
          </div>
          <div className="w-card__body">
            <TraceRow name="▸ http.request" left={0} width={100} ms="5,002ms" color="var(--w-tint-primary)"/>
            <TraceRow name="▸ auth.verify-key" indent={16} left={0} width={0.4} ms="2ms" color="var(--w-coolgray-600)"/>
            <TraceRow name="▸ gw.route-match" indent={16} left={0.4} width={0.2} ms="1ms" color="var(--w-coolgray-600)"/>
            <TraceRow name="▸ ds-pool.acquire" indent={32} left={0.6} width={4} ms="200ms" color="var(--w-orange)"/>
            <TraceRow name="▸ oracle.execute (timeout)" indent={48} left={4.6} width={95} ms="4,797ms" color="var(--w-red)"/>
            <TraceRow name="▸ gw.error-response" indent={16} left={99.6} width={0.4} ms="2ms" color="var(--w-coolgray-600)"/>
            <div style={{ marginTop: 12 }}>
              <Notice variant="err" icon={<I name="Alert"/>}>
                <b>oracle.execute</b> 단계에서 5초 쿼리 타임아웃 발생. 인덱스 미사용 추정 — 다음 단계에서 실행 계획을 확인합니다.
              </Notice>
            </div>
          </div>
        </div>

        <div className="w-stack">
          <div className="w-card">
            <div className="w-card__head">
              <h3 className="w-card__title">요청</h3>
            </div>
            <div className="w-card__body">
              <CodeBlock title="request" language="http" lines={reqLines}/>
            </div>
          </div>
          <div className="w-card">
            <div className="w-card__head">
              <h3 className="w-card__title">응답</h3>
              <span className={`w-badge ${call.st >= 500 ? "w-badge--red" : "w-badge--green"}`}>
                {call.st}
              </span>
            </div>
            <div className="w-card__body">
              <CodeBlock title="response.json" language="json" lines={respLines}/>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
