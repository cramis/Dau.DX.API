// H1_S6 — API 발급 완료 화면. 엔드포인트, 자동 생성 문서, 다음 단계 안내.
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/design/AppShell";
import { CheckCircle, I } from "@/components/design/Icons";
import { CodeBlock } from "@/components/design/CodeBlock";
import { CheckItem, Checklist, MetricTile } from "@/components/design/primitives";
import { Stepper } from "@/components/design/Stepper";
import { mockData } from "@/lib/mockData";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  const api = mockData.apis.find((a) => a.no === id);
  if (!api) notFound();

  const curlLines = [
    `<span class="tk-fn">curl</span> <span class="tk-op">-H</span> <span class="tk-str">'certification-key: $KEY'</span> <span class="tk-op">\\</span>`,
    `  <span class="tk-str">'https://api.donga.ac.kr/api/${api.path}'</span>`,
  ];

  return (
    <>
      <PageHead
        breadcrumb={["API 관리", "발급 완료"]}
        title="API 등록"
        actions={
          <>
            <Link href="/api-list" className="w-btn w-btn--ghost w-btn--sm">목록으로</Link>
            <Link href={`/docs#${api.no}`} className="w-btn w-btn--primary w-btn--sm">
              <I name="Doc"/> 공개 문서 열기
            </Link>
          </>
        }
      />
      <Stepper
        steps={["기본정보", "SQL 작성", "파라미터/응답", "테스트 실행", "발급 완료"]}
        current={4}
      />
      <div className="w-split--3">
        <div className="w-card" style={{ borderColor: "var(--w-tint-primary)" }}>
          <div
            className="w-card__body"
            style={{ display: "flex", gap: 24, alignItems: "center", padding: 24, flexWrap: "wrap" }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: "var(--w-tint-primary-soft)",
                color: "var(--w-tint-primary)",
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
                  color: "var(--w-tint-primary)",
                  fontWeight: 700,
                }}
              >
                발급 완료
              </div>
              <h2 className="w-card__title" style={{ fontSize: 22, marginTop: 4 }}>
                {api.name} API가 발급되었습니다
              </h2>
              <div className="w-muted" style={{ marginTop: 6, fontSize: 13 }}>
                발급 소요{" "}
                <b style={{ color: "var(--w-fg-strong)" }}>17분 42초</b> · 부서 평균 22분보다 빠릅니다
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="w-muted" style={{ fontSize: 11 }}>API 번호</div>
              <div className="w-strong w-mono" style={{ fontSize: 18, marginTop: 2 }}>
                {api.no}
              </div>
            </div>
          </div>
        </div>

        <div className="w-stack">
          <div className="w-card">
            <div className="w-card__head">
              <h3 className="w-card__title">엔드포인트</h3>
              <button className="w-btn w-btn--ghost w-btn--sm">
                <I name="Copy"/> 복사
              </button>
            </div>
            <div className="w-card__body">
              <div
                style={{
                  padding: 14,
                  background: "#0e1014",
                  color: "#d6deeb",
                  borderRadius: 10,
                  fontFamily: "var(--w-font-mono)",
                  fontSize: 13,
                  overflow: "auto",
                }}
              >
                <span style={{ color: "#82aaff" }}>{api.method}</span>{" "}
                <span style={{ color: "#addb67" }}>https://api.donga.ac.kr/api/{api.path}</span>
              </div>
              <div className="w-row" style={{ marginTop: 12, gap: 8 }}>
                <MetricTile
                  label="상태"
                  value={
                    api.status === "ACTIVE" ? (
                      <span className="w-badge w-badge--green">운영</span>
                    ) : api.status === "DRAFT" ? (
                      <span className="w-badge w-badge--orange">검토 (관리자 승인 대기)</span>
                    ) : (
                      <span className="w-badge w-badge--neutral">비활성</span>
                    )
                  }
                />
                <MetricTile
                  label="인증"
                  value={
                    api.authRequired ? (
                      <span className="w-badge w-badge--blue">
                        <I name="Lock" size={11}/> 인증키 필요
                      </span>
                    ) : (
                      <span className="w-badge w-badge--neutral">공개</span>
                    )
                  }
                />
              </div>
            </div>
          </div>

          <div className="w-card">
            <div className="w-card__head">
              <h3 className="w-card__title">다음 단계</h3>
            </div>
            <div className="w-card__body">
              <Checklist>
                <CheckItem variant="ok" icon={<I name="Check"/>}>
                  OpenAPI 문서 자동 생성 완료
                </CheckItem>
                <CheckItem variant="ok" icon={<I name="Check"/>}>
                  curl 예시 · Postman 컬렉션 준비됨
                </CheckItem>
                <CheckItem variant="run" icon={<I name="Bell"/>}>
                  관리자 승인 알림 발송됨 (예상 처리 24시간 이내)
                </CheckItem>
                <CheckItem icon={<I name="Ext"/>}>
                  승인 후 연계시스템에 매핑 → 외부 호출 가능
                </CheckItem>
              </Checklist>
            </div>
          </div>
        </div>

        <div className="w-card">
          <div className="w-card__head">
            <h3 className="w-card__title">자동 생성된 문서</h3>
            <button className="w-btn w-btn--soft w-btn--sm">
              <I name="Down"/> OpenAPI 3 (.yaml)
            </button>
          </div>
          <div className="w-card__body">
            <div className="w-row" style={{ gap: 12, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <h4 className="w-card__title" style={{ fontSize: 14 }}>
                  {api.name}
                </h4>
                <div className="w-muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {api.desc ?? "—"}
                </div>
                <div style={{ marginTop: 12, fontSize: 12.5 }}>
                  <div className="w-strong" style={{ marginBottom: 6 }}>
                    입력 파라미터 ({api.params.length})
                  </div>
                  <div className="w-mono" style={{ fontSize: 12 }}>
                    {api.params.length > 0
                      ? api.params
                          .map((p) => `${p.name}${p.required ? "*" : ""} ${p.type}`)
                          .join(" · ")
                      : "—"}
                  </div>
                  <div className="w-strong" style={{ marginTop: 12, marginBottom: 6 }}>
                    응답 컬럼 ({api.resps.length})
                  </div>
                  <div
                    className="w-mono"
                    style={{ fontSize: 12, color: "var(--w-fg-alternative)" }}
                  >
                    {api.resps.map((r) => r.col).join(", ")}
                  </div>
                </div>
              </div>
              <div style={{ flex: 1.3, minWidth: 240 }}>
                <CodeBlock title="curl" language="bash" lines={curlLines}/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
