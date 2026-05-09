// H2_S5 — SQL 원인 분석. v1↔v2 비교 + AI 요약 + 권장 조치.
import { notFound } from "next/navigation";
import { PageHead } from "@/components/design/AppShell";
import { CodeBlock } from "@/components/design/CodeBlock";
import { I } from "@/components/design/Icons";
import { CheckItem, Checklist } from "@/components/design/primitives";
import { getCallByTrace } from "@/lib/monitoringSeed";

const SQL_BEFORE = [
  `<span class="tk-com">-- v1 (안정 운영, 평균 180ms)</span>`,
  `<span class="tk-key">SELECT</span> course_id, <span class="tk-fn">COUNT</span>(<span class="tk-op">*</span>) <span class="tk-key">AS</span> enrolled`,
  `<span class="tk-key">FROM</span>   tb_enrollment`,
  `<span class="tk-key">WHERE</span>  year = <span class="tk-op">:</span><span class="tk-var">year</span> <span class="tk-key">AND</span> semester = <span class="tk-op">:</span><span class="tk-var">semester</span>`,
  `<span class="tk-key">GROUP BY</span> course_id;`,
];
const SQL_AFTER = [
  `<span class="tk-com">-- v2 (14:30 배포, 타임아웃 발생)</span>`,
  `<span class="tk-key">SELECT</span> course_id, <span class="tk-fn">COUNT</span>(<span class="tk-op">*</span>) <span class="tk-key">AS</span> enrolled,`,
  `       <span class="tk-fn">LISTAGG</span>(student_name, <span class="tk-str">', '</span>) <span class="tk-key">AS</span> students`,
  `<span class="tk-key">FROM</span>   tb_enrollment e`,
  `<span class="tk-key">JOIN</span>   tb_student s <span class="tk-key">ON</span> <span class="tk-fn">UPPER</span>(s.std_no) = <span class="tk-fn">UPPER</span>(e.std_no)  <span class="tk-com">-- ⚠ 인덱스 무력화</span>`,
  `<span class="tk-key">WHERE</span>  e.year = <span class="tk-op">:</span><span class="tk-var">year</span> <span class="tk-key">AND</span> e.semester = <span class="tk-op">:</span><span class="tk-var">semester</span>`,
  `<span class="tk-key">GROUP BY</span> course_id;`,
];

type Props = { params: Promise<{ traceId: string }> };

export default async function Page({ params }: Props) {
  const { traceId } = await params;
  if (!getCallByTrace(traceId)) notFound();

  return (
    <>
      <PageHead
        breadcrumb={["호출 상세", "원인 분석"]}
        title="원인 분석"
        sub="배포 이전/이후 SQL 비교 · 인덱스 활용 변화"
        actions={
          <>
            <button className="w-btn w-btn--ghost w-btn--sm">
              <I name="Branch"/> 변경 이력 전체
            </button>
            <button className="w-btn w-btn--soft w-btn--sm">
              <I name="Refresh"/> v1로 롤백
            </button>
            <button className="w-btn w-btn--primary w-btn--sm">
              <I name="Check"/> 알림 규칙 적용
            </button>
          </>
        }
      />

      <div
        className="w-card"
        style={{ marginBottom: 16, borderLeft: "3px solid var(--w-tint-primary)" }}
      >
        <div
          className="w-card__body"
          style={{ display: "flex", gap: 16, alignItems: "center", padding: 16, flexWrap: "wrap" }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "var(--w-tint-primary-soft)",
              color: "var(--w-tint-primary)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <I name="Spark"/>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.08em",
                color: "var(--w-tint-primary)",
                fontWeight: 700,
              }}
            >
              요약 분석 · 4분 22초만에 도달
            </div>
            <h3 className="w-card__title" style={{ fontSize: 16, marginTop: 2 }}>
              14:30 배포된 v2 SQL이 인덱스를 무력화시켜 타임아웃이 발생합니다
            </h3>
            <div className="w-muted" style={{ fontSize: 13, marginTop: 4 }}>
              <span className="w-mono">UPPER(std_no)</span> 함수가{" "}
              <span className="w-mono">IDX_STUDENT_PK</span> 인덱스 활용을 막고 있습니다. v1로 롤백
              시 즉시 회복 예상.
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="w-muted" style={{ fontSize: 11 }}>인시던트 → 원인 도달</div>
            <div
              className="w-strong w-mono"
              style={{ fontSize: 18, marginTop: 2, color: "var(--w-tint-primary)" }}
            >
              4분 22초
            </div>
            <div className="w-muted" style={{ fontSize: 11 }}>목표 5분 이내 ✓</div>
          </div>
        </div>
      </div>

      <div className="w-split">
        <div className="w-card">
          <div className="w-card__head">
            <h3 className="w-card__title">v1 · 14:30 이전</h3>
            <span className="w-badge w-badge--green">평균 180ms · cost 24</span>
          </div>
          <div className="w-card__body">
            <CodeBlock title="enrollment-stat.sql · v1" lines={SQL_BEFORE}/>
            <div className="w-row" style={{ marginTop: 12, gap: 8 }}>
              <div className="w-metric" style={{ flex: 1, padding: 12 }}>
                <div className="w-metric__lbl">실행 계획</div>
                <div className="w-strong w-mono" style={{ fontSize: 13, marginTop: 4 }}>
                  INDEX RANGE SCAN
                </div>
              </div>
              <div className="w-metric" style={{ flex: 1, padding: 12 }}>
                <div className="w-metric__lbl">예상 ROWS</div>
                <div className="w-strong w-mono" style={{ fontSize: 13, marginTop: 4 }}>
                  1,240
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="w-card" style={{ borderColor: "var(--w-tint-critical)" }}>
          <div className="w-card__head">
            <h3 className="w-card__title">v2 · 14:30 배포</h3>
            <span className="w-badge w-badge--red">타임아웃 · cost 9,820</span>
          </div>
          <div className="w-card__body">
            <CodeBlock title="enrollment-stat.sql · v2" lines={SQL_AFTER}/>
            <div className="w-row" style={{ marginTop: 12, gap: 8 }}>
              <div
                className="w-metric"
                style={{ flex: 1, padding: 12, borderColor: "var(--w-tint-critical)" }}
              >
                <div className="w-metric__lbl" style={{ color: "var(--w-tint-critical)" }}>실행 계획</div>
                <div className="w-strong w-mono" style={{ fontSize: 13, marginTop: 4 }}>
                  FULL TABLE SCAN
                </div>
              </div>
              <div
                className="w-metric"
                style={{ flex: 1, padding: 12, borderColor: "var(--w-tint-critical)" }}
              >
                <div className="w-metric__lbl" style={{ color: "var(--w-tint-critical)" }}>예상 ROWS</div>
                <div className="w-strong w-mono" style={{ fontSize: 13, marginTop: 4 }}>
                  21,400,000
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-card" style={{ marginTop: 16 }}>
        <div className="w-card__head">
          <h3 className="w-card__title">권장 조치</h3>
        </div>
        <div className="w-card__body">
          <Checklist>
            <CheckItem variant="run" icon={<I name="Refresh"/>}>
              <b>즉시</b> · v1으로 롤백 (1-click) — 예상 회복 30초 이내
            </CheckItem>
            <CheckItem variant="ok" icon={<I name="Check"/>}>
              <b>중기</b> · <span className="w-mono">UPPER()</span> 제거 또는 함수 기반 인덱스 추가
            </CheckItem>
            <CheckItem variant="ok" icon={<I name="Check"/>}>
              <b>예방</b> · 배포 전 EXPLAIN PLAN cost 100 초과 시 자동 차단 규칙 추가
            </CheckItem>
          </Checklist>
        </div>
      </div>
    </>
  );
}
