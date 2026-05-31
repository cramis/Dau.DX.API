// API 일괄 import 모달 — 텍스트 영역 → 검증(dryRun) → 적용 흐름.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/design/Modal";
import { I } from "@/components/design/Icons";

interface RowResult {
  index: number;
  no?: string;
  action?: "inserted" | "updated";
  ok: boolean;
  error?: string;
  detail?: string;
}
interface PlanResult {
  ok: boolean;
  summary: { inserted: number; updated: number; failed: number; total: number };
  results: RowResult[];
  dryRun?: boolean;
  message?: string;
  issues?: { fieldErrors?: Record<string, string[]> };
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const PLACEHOLDER = `{
  "version": 1,
  "kind": "api",
  "items": [
    {
      "name": "사용자 정보 조회",
      "group": "USER",
      "method": "GET",
      "path": "sample-user-info",
      "status": "ACTIVE",
      "dataSrcId": "DS20260509001",
      "authRequired": true,
      "docVisible": true,
      "sql": "SELECT user_id FROM v_user WHERE user_id = #{id}",
      "params": [{ "name": "id", "type": "string", "required": true }],
      "resps": [{ "col": "user_id", "type": "VARCHAR", "maskRule": "none" }]
    }
  ]
}`;

function actionBadgeCls(action?: "inserted" | "updated") {
  if (action === "inserted") return "w-badge w-badge--green";
  if (action === "updated") return "w-badge w-badge--blue";
  return "w-badge w-badge--red";
}

export function ApiBulkImportModal({ open, onClose }: Props) {
  const router = useRouter();
  const [json, setJson] = useState("");
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [busy, setBusy] = useState(false);

  function handleClose() {
    setJson("");
    setPlan(null);
    setBusy(false);
    onClose();
  }

  async function handleFillTemplate() {
    const res = await fetch("/api/mock/apis/import/template");
    if (!res.ok) {
      toast.error("예시를 불러오지 못했습니다.");
      return;
    }
    const data = await res.json();
    setJson(JSON.stringify(data, null, 2));
    setPlan(null);
    toast.success("예시 envelope 을 텍스트 영역에 채웠습니다.");
  }

  async function handleDownloadTemplate() {
    const res = await fetch("/api/mock/apis/import/template");
    if (!res.ok) {
      toast.error("예시를 다운로드하지 못했습니다.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "apis-template.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function parseBody(): unknown | null {
    try {
      return JSON.parse(json);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "JSON 파싱 실패";
      toast.error(`JSON 형식 오류: ${msg}`);
      return null;
    }
  }

  async function postImport(dryRun: boolean): Promise<PlanResult | null> {
    const body = parseBody();
    if (body === null) return null;
    setBusy(true);
    try {
      const url = dryRun
        ? "/api/mock/apis/import?dryRun=1"
        : "/api/mock/apis/import";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: PlanResult = await res.json().catch(() => ({
        ok: false,
        summary: { inserted: 0, updated: 0, failed: 0, total: 0 },
        results: [],
      }));
      if (data.message === "INVALID_ENVELOPE") {
        const flat =
          Object.entries(data.issues?.fieldErrors ?? {})
            .map(([k, v]) => `${k}: ${v.join(", ")}`)
            .join(" / ") || "envelope 형식이 올바르지 않습니다.";
        toast.error(flat);
        return null;
      }
      return data;
    } finally {
      setBusy(false);
    }
  }

  async function handleValidate() {
    const result = await postImport(true);
    if (result) setPlan(result);
  }

  async function handleApply() {
    const result = await postImport(false);
    if (!result) return;
    setPlan(result);
    if (result.ok) {
      const { inserted, updated } = result.summary;
      toast.success(
        `import 완료 — 신규 ${inserted}건, 수정 ${updated}건`,
      );
      router.refresh();
      handleClose();
    } else {
      toast.error(`적용 실패 — ${result.summary.failed}건 거부`);
    }
  }

  const canApply = plan !== null && plan.ok && !busy;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="API 일괄 가져오기 (JSON)"
      size="lg"
      splitFooter
      footer={
        <>
          <button
            type="button"
            className="w-btn w-btn--ghost"
            onClick={handleClose}
          >
            취소
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="w-btn w-btn--ghost"
              onClick={handleValidate}
              disabled={busy || json.trim().length === 0}
            >
              <I name="Check" size={12} /> 검증
            </button>
            <button
              type="button"
              className="w-btn w-btn--primary"
              onClick={handleApply}
              disabled={!canApply}
            >
              {busy ? "적용 중…" : "적용"}
            </button>
          </div>
        </>
      }
    >
      <div className="w-stack">
        <div
          className="w-notice w-notice--info"
          style={{ alignItems: "flex-start" }}
        >
          <I name="Info" size={14} />
          <div>
            <b>upsert 모드</b> — <span className="w-mono">items[].no</span> 가
            일치하면 <b>update</b>, 누락하면 <b>insert</b> (오늘 날짜 기반 자동
            채번 — 예: <span className="w-mono">A20260510001</span>). 검증 통과
            시에만 일괄 반영(트랜잭션).
          </div>
        </div>

        <div className="w-field">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <label className="w-field__lbl" htmlFor="api-bulk-json">
              JSON envelope
            </label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                className="w-btn w-btn--ghost w-btn--sm"
                onClick={handleFillTemplate}
                data-testid="bulk-fill-template-btn"
              >
                <I name="Copy" size={12} /> 예시 채우기
              </button>
              <button
                type="button"
                className="w-btn w-btn--ghost w-btn--sm"
                onClick={handleDownloadTemplate}
                data-testid="bulk-download-template-btn"
              >
                <I name="Down" size={12} /> 예시 다운로드
              </button>
            </div>
          </div>
          <textarea
            id="api-bulk-json"
            className="w-input w-mono"
            data-testid="bulk-import-json"
            rows={12}
            placeholder={PLACEHOLDER}
            spellCheck={false}
            value={json}
            onChange={(e) => {
              setJson(e.target.value);
              setPlan(null);
            }}
            style={{ fontSize: 12, lineHeight: 1.6, height: "auto" }}
          />
          <p className="w-field__hint">
            <span className="w-mono">version: 1, kind: &quot;api&quot;</span>{" "}
            envelope 만 허용. 신규는 <span className="w-mono">no</span> 생략,
            수정은 기존 번호 그대로 유지.
          </p>
        </div>

        {plan && (
          <div
            className="w-card"
            style={{ borderColor: plan.ok ? undefined : "var(--w-tint-critical)" }}
          >
            <div className="w-card__head" style={{ flexWrap: "wrap", gap: 8 }}>
              <h3 className="w-card__title">
                {plan.dryRun ? "검증 결과" : "적용 결과"}
              </h3>
              <div
                style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                data-testid="bulk-import-summary"
              >
                <span className="w-badge w-badge--green">
                  신규 {plan.summary.inserted}
                </span>
                <span className="w-badge w-badge--blue">
                  수정 {plan.summary.updated}
                </span>
                <span
                  className={
                    plan.summary.failed > 0
                      ? "w-badge w-badge--red"
                      : "w-badge w-badge--neutral"
                  }
                >
                  실패 {plan.summary.failed}
                </span>
                <span className="w-badge w-badge--neutral">
                  전체 {plan.summary.total}
                </span>
              </div>
            </div>
            <div className="w-card__body w-card__body--tight">
              <div className="w-tbl-wrap" style={{ maxHeight: 260 }}>
                <table className="w-tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 50 }}>#</th>
                      <th>no</th>
                      <th>액션</th>
                      <th>오류</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.results.map((r) => (
                      <tr key={r.index} data-testid="bulk-import-row">
                        <td className="mono">{r.index}</td>
                        <td className="mono">{r.no ?? "—"}</td>
                        <td>
                          <span className={actionBadgeCls(r.action)}>
                            {r.ok
                              ? r.action === "inserted"
                                ? "신규"
                                : "수정"
                              : "실패"}
                          </span>
                        </td>
                        <td
                          className="muted"
                          style={{ fontSize: 12 }}
                        >
                          {r.ok ? "—" : `${r.error}: ${r.detail ?? ""}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
