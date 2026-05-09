// H3_S6 — 무중단 변경 위저드 5단계: 완료 + 사전·사후 비교 + 헬스체크.
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/design/AppShell";
import { CheckCircle, I } from "@/components/design/Icons";
import { Stepper } from "@/components/design/Stepper";
import { CheckItem, Checklist } from "@/components/design/primitives";
import { mockData } from "@/lib/mockData";

const SWAP_STEPS = ["변경 정보", "연결 테스트", "영향도 검토", "Hot-swap 실행", "완료"];

const COMPARE_ROWS = [
  { metric: "p50 응답시간",     before: "120ms",  after: "42ms",  delta: "▼ 65%" },
  { metric: "p95 응답시간",     before: "780ms",  after: "180ms", delta: "▼ 77%" },
  { metric: "오류율",           before: "2.1%",   after: "0.01%", delta: "정상화", afterColor: "var(--w-green)" },
  { metric: "풀 사용률 평균",   before: "88%",    after: "21%",   delta: "여유 확보" },
  { metric: "DB_TIMEOUT 발생",  before: "72",     after: "0",     delta: "✓ 해소" },
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
        title="Hot-swap 완료"
        sub="다운타임 0초 · 실패 호출 0건"
        actions={
          <>
            <button className="w-btn w-btn--ghost w-btn--sm">변경 이력 보기</button>
            <Link href="/datasource" className="w-btn w-btn--primary w-btn--sm">
              데이터소스 목록으로
            </Link>
          </>
        }
      />
      <Stepper steps={SWAP_STEPS} current={4}/>

      <div className="w-card" style={{ marginBottom: 16, borderColor: "var(--w-green)" }}>
        <div
          className="w-card__body"
          style={{ display: "flex", gap: 24, alignItems: "center", padding: 24, flexWrap: "wrap" }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: "#e6f9ed",
              color: "var(--w-green)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <CheckCircle/>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.08em",
                color: "var(--w-green)",
                fontWeight: 700,
              }}
            >
              전환 완료
            </div>
            <h2 className="w-card__title" style={{ fontSize: 22, marginTop: 4 }}>
              {ds.name} 무중단 변경이 완료되었습니다
            </h2>
            <div className="w-muted" style={{ fontSize: 13, marginTop: 6 }}>
              총 13.2초 소요 · 다운타임 <b style={{ color: "var(--w-fg-strong)" }}>0초</b> · 처리된 호출{" "}
              <b style={{ color: "var(--w-fg-strong)" }}>1,842건</b> · 실패{" "}
              <b style={{ color: "var(--w-fg-strong)" }}>0건</b>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="w-muted" style={{ fontSize: 11 }}>올해 누적 무중단 전환</div>
            <div className="w-strong w-mono" style={{ fontSize: 18, marginTop: 2 }}>
              14건 · 100% 성공
            </div>
          </div>
        </div>
      </div>

      <div className="w-split--3">
        <div className="w-card">
          <div className="w-card__head">
            <h3 className="w-card__title">전환 결과 비교</h3>
          </div>
          <div className="w-card__body w-card__body--tight">
            <div className="w-tbl-wrap">
              <table className="w-tbl">
                <thead>
                  <tr>
                    <th>지표</th>
                    <th>전환 전 (1시간)</th>
                    <th>전환 후 (10분)</th>
                    <th>변화</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((r) => (
                    <tr key={r.metric}>
                      <td>{r.metric}</td>
                      <td className="mono">{r.before}</td>
                      <td className="mono strong" style={r.afterColor ? { color: r.afterColor } : undefined}>
                        {r.after}
                      </td>
                      <td>
                        <span className="w-badge w-badge--green">{r.delta}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="w-stack">
          <div className="w-card">
            <div className="w-card__head">
              <h3 className="w-card__title">헬스체크</h3>
              <span className="w-badge w-badge--green">all green</span>
            </div>
            <div className="w-card__body">
              <Checklist>
                <CheckItem variant="ok" icon={<I name="Check"/>}>신 풀 응답성 정상 · 60초 안정</CheckItem>
                <CheckItem variant="ok" icon={<I name="Check"/>}>구 풀 graceful close 완료</CheckItem>
                <CheckItem variant="ok" icon={<I name="Check"/>}>관련 36개 API 200 OK 확인</CheckItem>
                <CheckItem variant="ok" icon={<I name="Check"/>}>28개 연계시스템 알림 발송</CheckItem>
                <CheckItem variant="ok" icon={<I name="Check"/>}>변경 이력 감사 로그 저장</CheckItem>
              </Checklist>
            </div>
          </div>
          <div className="w-card">
            <div className="w-card__head">
              <h3 className="w-card__title">자동 사후 분석</h3>
            </div>
            <div className="w-card__body" style={{ fontSize: 13, lineHeight: 1.7 }}>
              <p style={{ margin: 0 }}>
                풀 사이즈 {ds.poolMax}→{ds.poolMax * 2} 확장과 신규 인스턴스 이전으로 LMS-PROD 풀 포화 문제가 해소되었습니다. 기존 v1 풀은{" "}
                <span className="w-mono">2026-05-09 19:00</span>에 자동 폐기 예정.
              </p>
              <button className="w-btn w-btn--ghost w-btn--sm" style={{ marginTop: 10 }}>
                <I name="Down"/> 사후 보고서 (PDF)
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
