// 도메인 공용 단건 JSON 편집 모달. PUT [id] 단건 라우트를 호출하며, 식별자는 URL 에 박혀 있어 body 에서 제외.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/design/Modal";
import { I } from "@/components/design/Icons";

interface Props<T extends Record<string, unknown>> {
  /** 편집 대상. null 이면 모달 닫힘. */
  initial: T | null;
  /** 모달 헤더 표시용 식별자. 보통 `no` 또는 `id`. */
  identityValue: string | null;
  /** body 직렬화 시 제외할 식별자 키 — `no` (api) / `id` (datasource·extSystem). */
  identityKey: string;
  /** PUT 라우트 (예: `/api/mock/apis/A20260509001`). */
  putUrl: string;
  /** 토스트에 표시할 도메인 명 — `API` / `데이터소스` / `연계시스템` */
  entityLabel: string;
  onClose: () => void;
}

export function JsonEditModal<T extends Record<string, unknown>>({
  initial,
  identityValue,
  identityKey,
  putUrl,
  entityLabel,
  onClose,
}: Props<T>) {
  const router = useRouter();
  const [json, setJson] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      const copy: Record<string, unknown> = { ...initial };
      delete copy[identityKey];
      setJson(JSON.stringify(copy, null, 2));
      setError(null);
    }
  }, [initial, identityKey]);

  async function handleSave() {
    if (!initial) return;
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
      const res = await fetch(putUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.message === "PATH_EXISTS") {
          setError("이미 사용 중인 경로입니다.");
        } else if (data?.message === "NAME_EXISTS") {
          setError("이미 사용 중인 이름입니다.");
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
      toast.success(`${entityLabel} ${identityValue} 를 JSON 으로 수정했습니다.`);
      router.refresh();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={!!initial}
      onClose={onClose}
      title={
        identityValue
          ? `${entityLabel} JSON 편집 — ${identityValue}`
          : `${entityLabel} JSON 편집`
      }
      size="lg"
      splitFooter
      footer={
        <>
          <button type="button" className="w-btn w-btn--ghost" onClick={onClose}>
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
      {initial && (
        <div className="w-stack">
          <div className="w-notice w-notice--info">
            <I name="Info" size={14} />
            <div>
              본 {entityLabel} 의 모든 필드를 직접 편집합니다.{" "}
              <span className="w-mono">{identityKey}</span> 는 변경 불가 — URL
              경로의 식별자로 고정.
            </div>
          </div>
          <div className="w-field">
            <label className="w-field__lbl" htmlFor="json-edit-textarea">
              본문 (JSON)
            </label>
            <textarea
              id="json-edit-textarea"
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
