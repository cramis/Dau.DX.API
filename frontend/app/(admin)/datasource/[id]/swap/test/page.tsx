// H3_S3 — 무중단 변경 위저드 2단계: 신규 풀 연결 테스트 + 차분 + 회귀.
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/design/AppShell";
import { I } from "@/components/design/Icons";
import { Stepper } from "@/components/design/Stepper";
import { CheckItem, Checklist } from "@/components/design/primitives";
import { mockData } from "@/lib/mockData";

const SWAP_STEPS = ["변경 정보", "연결 테스트", "영향도 검토", "Hot-swap 실행", "완료"];

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  const ds = mockData.dataSources.find((d) => d.id === id);
  if (!ds) notFound();

  return (
    <>
      <PageHead
        breadcrumb={[ds.name, "무중단 변경"]}
        title="연결 테스트"
        sub="신규 인스턴스에 임시 풀을 띄워 5단계 검증"
        actions={
          <>
            <Link href={`/datasource/${ds.id}/swap`} className="w-btn w-btn--ghost w-btn--sm">이전</Link>
            <Link
              href={`/datasource/${ds.id}/swap/impact`}
              className="w-btn w-btn--primary w-btn--sm"
            >
              다음: 영향도 검토 <I name="Right"/>
            </Link>
          </>
        }
      />
      <Stepper steps={SWAP_STEPS} current={1}/>

      <div className="w-split">
        <div className="w-card">
          <div className="w-card__head">
            <h3 className="w-card__title">검증 결과</h3>
            <span className="w-badge w-badge--green">
              <I name="Check" size={11}/> 5/5 통과
            </span>
          </div>
          <div className="w-card__body">
            <Checklist>
              <CheckItem variant="ok" icon={<I name="Check"/>}>
                <b>TCP 연결</b> · lms-prd-v2.donga.ac.kr:1521 · 12ms
              </CheckItem>
              <CheckItem variant="ok" icon={<I name="Check"/>}>
                <b>인증</b> · {ds.dbUser} 로그인 성공
              </CheckItem>
              <CheckItem variant="ok" icon={<I name="Check"/>}>
                <b>버전 일치</b> · Oracle 19c (19.21) — 기존과 동일
              </CheckItem>
              <CheckItem variant="ok" icon={<I name="Check"/>}>
                <b>스키마 검사</b> · API에서 사용하는 36개 테이블 모두 존재
              </CheckItem>
              <CheckItem variant="ok" icon={<I name="Check"/>}>
                <b>샘플 쿼리 실행</b> · <span className="w-mono">SELECT * FROM tb_enrollment WHERE ROWNUM = 1</span> · 8ms
              </CheckItem>
            </Checklist>
          </div>
        </div>
        <div className="w-card">
          <div className="w-card__head">
            <h3 className="w-card__title">변경 차분</h3>
            <span className="w-muted" style={{ fontSize: 12 }}>신/구 풀 비교</span>
          </div>
          <div className="w-card__body w-card__body--tight">
            <div className="w-tbl-wrap">
              <table className="w-tbl">
                <thead>
                  <tr>
                    <th>항목</th>
                    <th>현재</th>
                    <th>신규</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>호스트</td>
                    <td className="mono muted">lms-prd</td>
                    <td className="mono strong" style={{ color: "var(--w-tint-primary)" }}>
                      lms-prd-v2
                    </td>
                  </tr>
                  <tr>
                    <td>풀 사이즈</td>
                    <td className="mono">{ds.poolMax}</td>
                    <td className="mono strong" style={{ color: "var(--w-tint-primary)" }}>
                      {ds.poolMax * 2}
                    </td>
                  </tr>
                  <tr>
                    <td>쿼리 타임아웃</td>
                    <td className="mono">{ds.queryTimeoutSec}초</td>
                    <td className="mono">{ds.queryTimeoutSec}초</td>
                  </tr>
                  <tr>
                    <td>SSL</td>
                    <td className="mono">required</td>
                    <td className="mono">required</td>
                  </tr>
                  <tr>
                    <td>지연</td>
                    <td className="mono">12ms</td>
                    <td className="mono strong" style={{ color: "var(--w-green)" }}>
                      4ms
                    </td>
                  </tr>
                  <tr>
                    <td>버전</td>
                    <td>19c (19.21)</td>
                    <td>19c (19.21)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="w-card" style={{ marginTop: 16 }}>
        <div className="w-card__head">
          <h3 className="w-card__title">샘플 쿼리 회귀 — 5개 대표 API</h3>
        </div>
        <div className="w-card__body w-card__body--tight">
          <div className="w-tbl-wrap">
            <table className="w-tbl">
              <thead>
                <tr>
                  <th>API</th>
                  <th>SQL</th>
                  <th>현재 (ms)</th>
                  <th>신규 (ms)</th>
                  <th>결과 일치</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { api: "교과목 수강 인원 통계", sql: "SELECT … GROUP BY course_id", before: 180, after: 62 },
                  { api: "강의평가 결과 집계",   sql: "SELECT … FROM tb_evaluation",  before: 120, after: 48 },
                  { api: "학생 출결 현황",       sql: "SELECT … FROM tb_attendance",   before: 62,  after: 22 },
                  { api: "학적 변경 이력",       sql: "SELECT … FROM tb_std_change_hist", before: 92, after: 30 },
                  { api: "강의시간표 조회",      sql: "SELECT … FROM v_lecture_schedule", before: 48, after: 18 },
                ].map((r) => (
                  <tr key={r.api}>
                    <td className="strong">{r.api}</td>
                    <td className="mono muted" style={{ fontSize: 11 }}>{r.sql}</td>
                    <td>{r.before}</td>
                    <td className="strong" style={{ color: "var(--w-green)" }}>
                      {r.after}
                    </td>
                    <td>
                      <span className="w-badge w-badge--green">
                        <I name="Check" size={11}/> 일치
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
