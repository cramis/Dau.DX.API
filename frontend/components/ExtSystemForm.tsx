// 연계시스템 등록·수정 폼. 매핑 API 는 체크박스 그리드.
"use client";

import { useState, useId } from "react";
import { toast } from "sonner";
import {
  extSystemCreateSchema,
  type ExtSystemCreateInput,
} from "@/lib/schemas/extSystem";
import type { ApiDef, ExtSystem } from "@/types/api";

type Errors = Partial<Record<keyof ExtSystemCreateInput | "allowedIpsRaw", string>>;

interface Props {
  initial: ExtSystem | null;
  apis: ApiDef[];
  onCancel: () => void;
  onSubmit: (input: ExtSystemCreateInput) => Promise<void>;
}

// "YYYY-MM-DDTHH:mm:ss" → "YYYY-MM-DD". (date input 용)
function ymd(iso: string): string {
  return iso.slice(0, 10);
}
// "YYYY-MM-DD" → "YYYY-MM-DDT00:00:00" (시작) / "T23:59:59" (종료).
function withBoundary(date: string, end: boolean): string {
  if (!date) return "";
  return `${date}T${end ? "23:59:59" : "00:00:00"}`;
}

export function ExtSystemForm({ initial, apis, onCancel, onSubmit }: Props) {
  const ids = {
    name: useId(),
    allowedIps: useId(),
    useBegin: useId(),
    useEnd: useId(),
    picgName: useId(),
    picgEmail: useId(),
    remark: useId(),
    status: useId(),
  };

  const [form, setForm] = useState<ExtSystemCreateInput>(() =>
    initial
      ? {
          name: initial.name,
          allowedIps: initial.allowedIps,
          useBegin: ymd(initial.useBegin),
          useEnd: ymd(initial.useEnd),
          mappedApis: initial.mappedApis,
          picgName: initial.picgName ?? "",
          picgEmail: initial.picgEmail ?? "",
          remark: initial.remark ?? "",
          status: initial.status,
        }
      : {
          name: "",
          allowedIps: [],
          useBegin: "",
          useEnd: "",
          mappedApis: [],
          picgName: "",
          picgEmail: "",
          remark: "",
          status: "ACTIVE",
        },
  );
  const [allowedIpsRaw, setAllowedIpsRaw] = useState(
    form.allowedIps.join("\n"),
  );
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof ExtSystemCreateInput>(
    key: K,
    value: ExtSystemCreateInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function toggleApi(no: string) {
    const next = form.mappedApis.includes(no)
      ? form.mappedApis.filter((x) => x !== no)
      : [...form.mappedApis, no];
    set("mappedApis", next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const allowedIps = allowedIpsRaw
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const candidate: ExtSystemCreateInput = {
      ...form,
      allowedIps,
      useBegin: form.useBegin ? withBoundary(form.useBegin, false) : "",
      useEnd: form.useEnd ? withBoundary(form.useEnd, true) : "",
    };
    const parsed = extSystemCreateSchema.safeParse(candidate);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ExtSystemCreateInput | undefined;
        if (key && !next[key]) next[key] = issue.message;
        if (key === "allowedIps" && !next.allowedIpsRaw) {
          next.allowedIpsRaw = issue.message;
        }
      }
      setErrors(next);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "저장에 실패했습니다.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      id="extsystem-form"
      onSubmit={handleSubmit}
      className="w-auth-form"
      noValidate
    >
      <div className="w-field">
        <label className="w-field__lbl" htmlFor={ids.name}>
          이름 <span className="w-field__req">*</span>
        </label>
        <input
          id={ids.name}
          className="w-input"
          placeholder="학사정보시스템"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />
        {errors.name && <p className="w-field__msg">{errors.name}</p>}
      </div>

      <div className="w-field">
        <label className="w-field__lbl" htmlFor={ids.allowedIps}>
          허용 IP / CIDR <span className="w-field__req">*</span>
        </label>
        <textarea
          id={ids.allowedIps}
          className="w-input"
          rows={3}
          placeholder={"10.0.0.0/24\n127.0.0.1/32"}
          value={allowedIpsRaw}
          onChange={(e) => {
            setAllowedIpsRaw(e.target.value);
            if (errors.allowedIpsRaw)
              setErrors((p) => ({ ...p, allowedIpsRaw: undefined }));
          }}
        />
        <p className="w-field__hint">
          한 줄에 하나씩 입력. 단일 IP 는 자동 /32 처리하지 않습니다 — 명시적으로
          작성하세요.
        </p>
        {errors.allowedIpsRaw && (
          <p className="w-field__msg">{errors.allowedIpsRaw}</p>
        )}
      </div>

      <div className="w-grid-2">
        <div className="w-field">
          <label className="w-field__lbl" htmlFor={ids.useBegin}>
            이용 시작일 <span className="w-field__req">*</span>
          </label>
          <input
            id={ids.useBegin}
            type="date"
            className="w-input"
            value={form.useBegin}
            onChange={(e) => set("useBegin", e.target.value)}
          />
          {errors.useBegin && <p className="w-field__msg">{errors.useBegin}</p>}
        </div>
        <div className="w-field">
          <label className="w-field__lbl" htmlFor={ids.useEnd}>
            이용 종료일 <span className="w-field__req">*</span>
          </label>
          <input
            id={ids.useEnd}
            type="date"
            className="w-input"
            value={form.useEnd}
            onChange={(e) => set("useEnd", e.target.value)}
          />
          {errors.useEnd && <p className="w-field__msg">{errors.useEnd}</p>}
        </div>
      </div>

      <div className="w-field">
        <span className="w-field__lbl">매핑 API</span>
        <div
          className="w-card__body"
          style={{
            border: "1px solid var(--w-line-normal)",
            borderRadius: 10,
            padding: 10,
            background: "var(--w-bg-alternative)",
          }}
        >
          {apis.length === 0 ? (
            <p className="w-muted" style={{ fontSize: 12, margin: 0 }}>
              등록된 API 가 없습니다.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 4,
              }}
            >
              {apis.map((a) => (
                <label
                  key={a.no}
                  className="w-checkbox-row"
                  style={{ fontSize: 12.5 }}
                >
                  <input
                    type="checkbox"
                    checked={form.mappedApis.includes(a.no)}
                    onChange={() => toggleApi(a.no)}
                  />
                  <span>
                    <span className="w-mono w-dim">{a.no}</span>{" "}
                    <span className="w-strong">{a.name}</span>{" "}
                    <span className="w-muted">/ {a.path}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
        <p className="w-field__hint">
          체크된 API 만 본 연계시스템이 호출 가능합니다. 비워 두면 차단.
        </p>
      </div>

      <div className="w-grid-2">
        <div className="w-field">
          <label className="w-field__lbl" htmlFor={ids.picgName}>
            담당자 이름
          </label>
          <input
            id={ids.picgName}
            className="w-input"
            value={form.picgName ?? ""}
            onChange={(e) => set("picgName", e.target.value)}
          />
        </div>
        <div className="w-field">
          <label className="w-field__lbl" htmlFor={ids.picgEmail}>
            담당자 이메일
          </label>
          <input
            id={ids.picgEmail}
            type="email"
            className="w-input"
            value={form.picgEmail ?? ""}
            onChange={(e) => set("picgEmail", e.target.value)}
          />
          {errors.picgEmail && (
            <p className="w-field__msg">{errors.picgEmail}</p>
          )}
        </div>
      </div>

      <div className="w-field">
        <label className="w-field__lbl" htmlFor={ids.remark}>
          비고
        </label>
        <textarea
          id={ids.remark}
          className="w-input"
          rows={2}
          value={form.remark ?? ""}
          onChange={(e) => set("remark", e.target.value)}
        />
      </div>

      <label className="w-checkbox-row" htmlFor={ids.status}>
        <input
          id={ids.status}
          type="checkbox"
          checked={form.status === "ACTIVE"}
          onChange={(e) =>
            set("status", e.target.checked ? "ACTIVE" : "INACTIVE")
          }
        />
        <span>활성화(ACTIVE)</span>
      </label>

      <div
        className="w-input-row"
        style={{ marginTop: 8, justifyContent: "flex-end" }}
      >
        <button
          type="button"
          className="w-btn w-btn--ghost"
          onClick={onCancel}
        >
          취소
        </button>
        <button
          type="submit"
          className="w-btn w-btn--primary"
          disabled={submitting}
        >
          {submitting ? "저장 중…" : initial ? "저장" : "등록"}
        </button>
      </div>
    </form>
  );
}
