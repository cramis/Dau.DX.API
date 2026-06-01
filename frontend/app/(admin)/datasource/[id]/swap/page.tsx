// H3_S2 — 무중단 변경 위저드 1단계: 신규 연결 정보 + 전환 모드 선택.
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/design/AppShell";
import { I } from "@/components/design/Icons";
import { Stepper } from "@/components/design/Stepper";
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
        breadcrumb={["데이터소스", ds.name, "무중단 변경"]}
        title={`${ds.name} · 무중단 변경`}
        sub="기존 풀을 유지하면서 신규 풀로 graceful 전환합니다"
        actions={
          <>
            <Link href="/datasource" className="w-btn w-btn--ghost w-btn--sm">취소</Link>
            <Link
              href={`/datasource/${ds.id}/swap/test`}
              className="w-btn w-btn--primary w-btn--sm"
            >
              다음: 연결 테스트 <I name="Right"/>
            </Link>
          </>
        }
      />
      <Stepper steps={SWAP_STEPS} current={0}/>

      <div className="w-split--3">
        <div className="w-card">
          <div className="w-card__head">
            <h3 className="w-card__title">신규 연결 정보</h3>
            <span className="w-muted" style={{ fontSize: 12 }}>현재 값은 회색으로 표시</span>
          </div>
          <div className="w-card__body">
            <div className="w-stack w-stack--lg">
              <div className="w-row">
                <div className="w-field">
                  <div className="w-field__lbl">DB 종류</div>
                  <select className="w-select" defaultValue="Oracle 19c">
                    <option>Oracle 19c</option>
                    <option>Oracle 21c</option>
                    <option>PostgreSQL 15</option>
                  </select>
                </div>
                <div className="w-field">
                  <div className="w-field__lbl">변경 사유</div>
                  <select className="w-select" defaultValue="용량 증설 (스케일업)">
                    <option>용량 증설 (스케일업)</option>
                    <option>장애 대응</option>
                    <option>버전 업그레이드</option>
                    <option>장비 이전</option>
                  </select>
                </div>
              </div>
              <div className="w-field">
                <div className="w-field__lbl">JDBC URL</div>
                <input className="w-input w-mono" defaultValue={`${ds.jdbcUrl.replace(/lms-prd/, "lms-prd-v2")}`}/>
                <div className="w-field__hint">
                  현재:{" "}
                  <span className="w-mono w-muted" style={{ textDecoration: "line-through" }}>
                    {ds.jdbcUrl}
                  </span>
                </div>
              </div>
              <div className="w-row">
                <div className="w-field">
                  <div className="w-field__lbl">사용자</div>
                  <input className="w-input w-mono" defaultValue={ds.dbUser}/>
                </div>
                <div className="w-field">
                  <div className="w-field__lbl">비밀번호</div>
                  <input className="w-input w-mono" type="password" defaultValue="••••••••••••"/>
                  <div className="w-field__hint">
                    Vault 경로: <span className="w-mono">secret/dau-dx-api/{ds.id.toLowerCase()}-v2</span>
                  </div>
                </div>
              </div>
              <div className="w-row">
                <div className="w-field">
                  <div className="w-field__lbl">풀 사이즈 (max)</div>
                  <input className="w-input w-mono" defaultValue={String(ds.poolMax * 2)}/>
                  <div className="w-field__hint">현재 {ds.poolMax} → {ds.poolMax * 2} (2배 확장)</div>
                </div>
                <div className="w-field">
                  <div className="w-field__lbl">쿼리 타임아웃 (초)</div>
                  <input className="w-input w-mono" defaultValue={String(ds.queryTimeoutSec)}/>
                </div>
                <div className="w-field">
                  <div className="w-field__lbl">유휴 커넥션 회수 (초)</div>
                  <input className="w-input w-mono" defaultValue="600"/>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-stack">
          <div className="w-card">
            <div className="w-card__head">
              <h3 className="w-card__title">전환 모드</h3>
            </div>
            <div className="w-card__body">
              <label
                style={{
                  display: "flex",
                  gap: 10,
                  padding: 12,
                  border: "1px solid var(--w-tint-primary)",
                  borderRadius: 10,
                  marginBottom: 8,
                  background: "var(--w-tint-primary-soft)",
                }}
              >
                <input type="radio" name="m" defaultChecked style={{ marginTop: 2 }}/>
                <div>
                  <div className="w-strong">Graceful Hot-swap (권장)</div>
                  <div className="w-muted" style={{ fontSize: 12, marginTop: 2 }}>
                    신규 풀에 연결 후 점진 전환 · 진행 중 호출 보호 · 평균 8초
                  </div>
                </div>
              </label>
              <label
                style={{
                  display: "flex",
                  gap: 10,
                  padding: 12,
                  border: "1px solid var(--w-line-normal)",
                  borderRadius: 10,
                  marginBottom: 8,
                }}
              >
                <input type="radio" name="m" style={{ marginTop: 2 }}/>
                <div>
                  <div className="w-strong">Canary (비율 전환)</div>
                  <div className="w-muted" style={{ fontSize: 12, marginTop: 2 }}>
                    10% → 50% → 100%로 단계적 전환 · 자동 롤백 지원
                  </div>
                </div>
              </label>
              <label
                style={{
                  display: "flex",
                  gap: 10,
                  padding: 12,
                  border: "1px solid var(--w-line-normal)",
                  borderRadius: 10,
                  opacity: 0.7,
                }}
              >
                <input type="radio" name="m" style={{ marginTop: 2 }}/>
                <div>
                  <div className="w-strong">Hard Cut (위험)</div>
                  <div className="w-muted" style={{ fontSize: 12, marginTop: 2 }}>
                    즉시 전환 · 진행 중 호출 실패 가능성
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="w-card">
            <div className="w-card__head">
              <h3 className="w-card__title">실행 시점</h3>
            </div>
            <div className="w-card__body">
              <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <input type="radio" name="t" defaultChecked/>
                <span style={{ fontSize: 13 }}>승인 즉시 실행</span>
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input type="radio" name="t"/>
                <span style={{ fontSize: 13 }}>예약 실행</span>
                <input
                  className="w-input"
                  defaultValue="2026-05-10 02:00"
                  style={{ height: 30, marginLeft: 8, width: 160 }}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
