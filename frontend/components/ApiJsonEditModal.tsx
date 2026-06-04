// 단건 API JSON 편집 모달 — 폼이 부담스러울 때 직접 JSON 으로 수정 (PUT 단건 라우트 호출).
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/design/Modal";
import { I } from "@/components/design/Icons";
import type { ApiDef } from "@/types/api";

interface Props {
  api: ApiDef | null;
  onClose: () => void;
}

export function ApiJsonEditModal({ api, onClose }: Props) {
  const router = useRouter();
  const [json, setJson] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (api) {
      // no 는 path param 으로 가므로 body 에서 제외 — 사용자가 헷갈리지 않게 한다.
      const { no: _no, ...rest } = api;
      setJson(JSON.stringify(rest, null, 2));
      setError(null);
    }
  }, [api]);

  async function handleSave() {
    if (!api) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "JSON 파싱 실패";
      setError(`JSON 형식 오류: ${msg}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/mock/apis/${api.no}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.message === "PATH_EXISTS") {
          setError("이미 사용 중인 경로입니다.");
        } else if (data?.message === "INVALID_INPUT") {
          const flat = Object.entries(data?.issues?.fieldErrors ?? {})
            .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
            .join(" / ");
          setError(`검증 실패 — ${flat || "필드 오류"}`);
        } else {
          setError("저장에 실패했습니다.");
        }
        return;
      }
      toast.success(`${api.no} 를 JSON 으로 수정했습니다.`);
      router.refresh();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={!!api}
      onClose={onClose}
      title={api ? `JSON 편집 — ${api.no}` : "JSON 편집"}
      size="lg"
      splitFooter
      footer={
        <>
          <button
            type="button"
            className="w-btn w-btn--ghost"
            onClick={onClose}
          >
            취소
          </button>
          <button
            type="button"
            className="w-btn w-btn--primary"
            onClick={handleSave}
            disabled={busy}
          >
            <I name="Check" size={12} /> {busy ? "저장 중…" : "저장"}
          </button>
        </>
      }
    >
      {api && (
        <div className="w-stack">
          <div className="w-notice w-notice--info">
            <I name="Info" size={14} />
            <div>
              본 API 의 모든 필드를 직접 편집합니다.{" "}
              <span className="w-mono">no</span> 는 변경 불가 — URL 경로(
              <span className="w-mono">/api/mock/apis/{api.no}</span>) 의
              식별자로 고정.
            </div>
          </div>
          <div className="w-field">
            <label className="w-field__lbl" htmlFor="api-json-edit">
              본문 (JSON)
            </label>
            <textarea
              id="api-json-edit"
              className="w-input w-mono"
              data-testid="json-edit-textarea"
              rows={18}
              spellCheck={false}
              value={json}
              onChange={(e) => {
                setJson(e.target.value);
                setError(null);
              }}
              style={{ fontSize: 12, lineHeight: 1.6, height: "auto" }}
            />
          </div>
          {error && (
            <div
              className="w-form-banner w-form-banner--error"
              role="alert"
              data-testid="json-edit-error"
            >
              <span className="w-form-banner__ico">⚠</span>
              <div className="w-form-banner__body">{error}</div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
