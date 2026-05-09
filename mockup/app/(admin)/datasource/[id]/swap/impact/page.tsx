// H3_S4 — 무중단 변경 위저드 3단계: 영향도 + 시뮬레이션 + 롤백 정책.
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/design/AppShell";
import { I } from "@/components/design/Icons";
import { Stepper } from "@/components/design/Stepper";
import { CheckItem, Checklist, MetricTile, Notice, TraceRow } from "@/components/design/primitives";
import { mockData } from "@/lib/mockData";

const SWAP_STEPS = ["변경 정보", "연결 테스트", "영향도 검토", "Hot-swap 실행", "완료"];

const TOP_EXT_SYSTEMS = [
  { name: "수강신청-WEB",      rpm: "3,420", apis: 8,  notice: "사전 공지" as const },
  { name: "포털-WEB",          rpm: "2,180", apis: 14, notice: "사전 공지" as const },
  { name: "모바일-앱",         rpm: "1,420", apis: 11, notice: "사전 공지" as const },
  { name: "학생지원-대시보드", rpm: "680",   apis: 5,  notice: "생략" as const },
  { name: "교무-시스템",       rpm: "510",   apis: 9,  notice: "사전 공지" as const },
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
        title="영향도 검토"
        sub={`현재 이 풀에 의존하는 36개 API · 28개 연계시스템`}
        actions={
          <>
            <Link href={`/datasource/${ds.id}/swap/test`} className="w-btn w-btn--ghost w-btn--sm">
              이전
            </Link>
            <Link
              href={`/datasource/${ds.id}/swap/run`}
              className="w-btn w-btn--primary w-btn--sm"
            >
              <I name="Bolt"/> Hot-swap 실행 <I name="Right"/>
            </Link>
          </>
        }
      />
      <Stepper steps={SWAP_STEPS} current={2}/>

      <div className="w-row" style={{ marginBottom: 16, gap: 12 }}>
        <MetricTile label="영향 API" value="36" delta="전체 142 중"/>
        <MetricTile label="분당 호출량" value="8.2" unit="k" delta="현재 시점"/>
        <MetricTile label="진행 중 호출" value="31" delta="graceful 보호 대상"/>
        <MetricTile
          label="예상 다운타임"
          value={<span style={{ color: "var(--w-green)" }}>0</span>}
          unit="초"
          delta="목표 무중단"
          deltaTone="up"
        />
      </div>

      <div className="w-split">
        <div className="w-card">
          <div className="w-card__head">
            <h3 className="w-card__title">상위 영향 연계시스템</h3>
            <span className="w-muted" style={{ fontSize: 12 }}>호출량 기준</span>
          </div>
          <div className="w-card__body w-card__body--tight">
            <div className="w-tbl-wrap">
              <table className="w-tbl">
                <thead>
                  <tr>
                    <th>연계시스템</th>
                    <th>RPM</th>
                    <th>API</th>
                    <th>알림</th>
                  </tr>
                </thead>
                <tbody>
                  {TOP_EXT_SYSTEMS.map((s) => (
                    <tr key={s.name}>
                      <td className="strong">{s.name}</td>
                      <td className="mono">{s.rpm}</td>
                      <td>{s.apis}</td>
                      <td>
                        <span
                          className={`w-badge ${
                            s.notice === "사전 공지" ? "w-badge--blue" : "w-badge--neutral"
                          }`}
                        >
                          {s.notice}
                        </span>
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
              <h3 className="w-card__title">전환 시뮬레이션</h3>
            </div>
            <div className="w-card__body">
              <TraceRow name="신규 풀 워밍업" left={0} width={15} ms="2.0s" color="var(--w-coolgray-600)"/>
              <TraceRow name="신규 트래픽 라우팅" left={15} width={5} ms="0.7s" color="var(--w-tint-primary)"/>
              <TraceRow name="기존 in-flight 대기" left={20} width={70} ms="9.2s" color="var(--w-orange)"/>
              <TraceRow name="기존 풀 graceful close" left={90} width={10} ms="1.4s" color="var(--w-green)"/>
              <div style={{ marginTop: 12 }}>
                <Notice variant="ok" icon={<I name="Check"/>}>
                  <b>다운타임 0초 보장</b> · 진행 중 호출 31건은 기존 풀에서 완료 후 종료됩니다
                </Notice>
              </div>
            </div>
          </div>
          <div className="w-card">
            <div className="w-card__head">
              <h3 className="w-card__title">롤백 정책</h3>
            </div>
            <div className="w-card__body">
              <Checklist>
                <CheckItem variant="ok" icon={<I name="Check"/>}>
                  전환 후 60초간 신규 풀 5xx률 1% 초과 시 <b>자동 롤백</b>
                </CheckItem>
                <CheckItem variant="ok" icon={<I name="Check"/>}>
                  기존 풀은 5분간 hot-standby 유지
                </CheckItem>
                <CheckItem variant="ok" icon={<I name="Check"/>}>
                  1-click 수동 롤백 (Argo CD revision)
                </CheckItem>
              </Checklist>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
