// 데이터소스 등록·수정 폼 (모달 안에서 사용). 연결 테스트 버튼 포함.
"use client";

import { useState, useId } from "react";
import { toast } from "sonner";
import { I } from "@/components/design/Icons";
import {
  dataSourceCreateSchema,
  type DataSourceCreateInput,
} from "@/lib/schemas/datasource";
import type { DataSource } from "@/types/api";

type Errors = Partial<Record<keyof DataSourceCreateInput, string>>;

interface Props {
  initial: DataSource | null;
  onCancel: () => void;
  onSubmit: (input: DataSourceCreateInput) => Promise<void>;
}

const DB_TYPES = [
  { value: "ORACLE", label: "Oracle 19c" },
  { value: "POSTGRES", label: "PostgreSQL 15" },
  { value: "MYSQL", label: "MySQL 8" },
] as const;

export function DataSourceForm({ initial, onCancel, onSubmit }: Props) {
  const ids = {
    name: useId(),
    dbType: useId(),
    jdbcUrl: useId(),
    dbUser: useId(),
    dbPassword: useId(),
    poolMin: useId(),
    poolMax: useId(),
    queryTimeoutSec: useId(),
    useYn: useId(),
  };

  const [form, setForm] = useState<DataSourceCreateInput>(() =>
    initial
      ? {
          name: initial.name,
          dbType: initial.dbType,
          jdbcUrl: initial.jdbcUrl,
          dbUser: initial.dbUser,
          dbPassword: "",
          poolMin: initial.poolMin,
          poolMax: initial.poolMax,
          queryTimeoutSec: initial.queryTimeoutSec,
          useYn: initial.useYn,
        }
      : {
          name: "",
          dbType: "ORACLE",
          jdbcUrl: "",
          dbUser: "",
          dbPassword: "",
          poolMin: 5,
          poolMax: 50,
          queryTimeoutSec: 5,
          useYn: "Y",
        },
  );
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    { ok: boolean; detail: string; latencyMs: number } | null
  >(null);

  function set<K extends keyof DataSourceCreateInput>(
    key: K,
    value: DataSourceCreateInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/mock/datasources/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jdbcUrl: form.jdbcUrl,
          dbUser: form.dbUser,
          dbPassword: form.dbPassword,
          dbType: form.dbType,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setTestResult({
        ok: !!data.ok,
        detail: data.detail ?? data.message ?? "응답 없음",
        latencyMs: data.latencyMs ?? 0,
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = dataSourceCreateSchema.safeParse(form);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof DataSourceCreateInput | undefined;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    // 등록 시 dbPassword 필수(백엔드 @NotBlank). 수정 시 공란이면 기존 비밀번호 유지 → payload 제외.
    if (!initial && !parsed.data.dbPassword?.trim()) {
      setErrors({ dbPassword: "DB 비밀번호를 입력해주세요." });
      return;
    }
    const payload = { ...parsed.data };
    if (initial && !payload.dbPassword?.trim()) delete payload.dbPassword;
    setSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "저장에 실패했습니다.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      id="datasource-form"
      onSubmit={handleSubmit}
      className="w-auth-form"
      noValidate
    >
      <div className="w-grid-2">
        <div className="w-field">
          <label className="w-field__lbl" htmlFor={ids.name}>
            이름 <span className="w-field__req">*</span>
          </label>
          <input
            id={ids.name}
            className="w-input"
            placeholder="DAU-CORE-PROD"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
          {errors.name && <p className="w-field__msg">{errors.name}</p>}
        </div>
        <div className="w-field">
          <label className="w-field__lbl" htmlFor={ids.dbType}>
            종류 <span className="w-field__req">*</span>
          </label>
          <select
            id={ids.dbType}
            className="w-select"
            value={form.dbType}
            onChange={(e) =>
              set("dbType", e.target.value as DataSourceCreateInput["dbType"])
            }
          >
            {DB_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="w-field">
        <label className="w-field__lbl" htmlFor={ids.jdbcUrl}>
          JDBC URL <span className="w-field__req">*</span>
        </label>
        <input
          id={ids.jdbcUrl}
          className="w-input"
          placeholder="jdbc:oracle:thin:@host:1521/SID"
          value={form.jdbcUrl}
          onChange={(e) => set("jdbcUrl", e.target.value)}
        />
        {errors.jdbcUrl && <p className="w-field__msg">{errors.jdbcUrl}</p>}
      </div>

      <div className="w-grid-2">
        <div className="w-field">
          <label className="w-field__lbl" htmlFor={ids.dbUser}>
            DB 사용자 <span className="w-field__req">*</span>
          </label>
          <input
            id={ids.dbUser}
            className="w-input"
            value={form.dbUser}
            onChange={(e) => set("dbUser", e.target.value)}
          />
          {errors.dbUser && <p className="w-field__msg">{errors.dbUser}</p>}
        </div>
        <div className="w-field">
          <label className="w-field__lbl" htmlFor={ids.queryTimeoutSec}>
            쿼리 타임아웃(초) <span className="w-field__req">*</span>
          </label>
          <input
            id={ids.queryTimeoutSec}
            type="number"
            className="w-input"
            min={1}
            value={form.queryTimeoutSec}
            onChange={(e) =>
              set("queryTimeoutSec", Number(e.target.value) || 0)
            }
          />
          {errors.queryTimeoutSec && (
            <p className="w-field__msg">{errors.queryTimeoutSec}</p>
          )}
        </div>
      </div>

      <div className="w-field">
        <label className="w-field__lbl" htmlFor={ids.dbPassword}>
          DB 비밀번호{" "}
          {initial ? (
            <span className="w-dim" style={{ fontSize: 11 }}>
              (변경 시에만 입력 · 비워두면 유지)
            </span>
          ) : (
            <span className="w-field__req">*</span>
          )}
        </label>
        <input
          id={ids.dbPassword}
          type="password"
          className="w-input"
          autoComplete="new-password"
          placeholder={initial ? "변경하지 않으면 비워두세요" : "DB 접속 비밀번호"}
          value={form.dbPassword ?? ""}
          onChange={(e) => set("dbPassword", e.target.value)}
        />
        {errors.dbPassword && <p className="w-field__msg">{errors.dbPassword}</p>}
      </div>

      <div className="w-grid-2">
        <div className="w-field">
          <label className="w-field__lbl" htmlFor={ids.poolMin}>
            최소 풀 <span className="w-field__req">*</span>
          </label>
          <input
            id={ids.poolMin}
            type="number"
            className="w-input"
            min={0}
            value={form.poolMin}
            onChange={(e) => set("poolMin", Number(e.target.value) || 0)}
          />
          {errors.poolMin && <p className="w-field__msg">{errors.poolMin}</p>}
        </div>
        <div className="w-field">
          <label className="w-field__lbl" htmlFor={ids.poolMax}>
            최대 풀 <span className="w-field__req">*</span>
          </label>
          <input
            id={ids.poolMax}
            type="number"
            className="w-input"
            min={1}
            value={form.poolMax}
            onChange={(e) => set("poolMax", Number(e.target.value) || 0)}
          />
          {errors.poolMax && <p className="w-field__msg">{errors.poolMax}</p>}
        </div>
      </div>

      <label className="w-checkbox-row" htmlFor={ids.useYn}>
        <input
          id={ids.useYn}
          type="checkbox"
          checked={form.useYn === "Y"}
          onChange={(e) => set("useYn", e.target.checked ? "Y" : "N")}
        />
        <span>운영 중(useYn=Y)</span>
      </label>

      <div
        className="w-notice w-notice--info"
        style={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <span>
          저장 전 <b>연결 테스트</b> 로 호스트 / 포트 / 인증을 확인하세요.
        </span>
        <button
          type="button"
          className="w-btn w-btn--ghost w-btn--sm"
          onClick={handleTest}
          disabled={testing || !form.jdbcUrl || !form.dbUser}
        >
          <I name={testing ? "Refresh" : "Bolt"} size={12} />
          {testing ? "테스트 중…" : "연결 테스트"}
        </button>
      </div>
      {testResult && (
        <div
          className={`w-form-banner w-form-banner--${testResult.ok ? "success" : "error"}`}
          data-testid="ds-test-result"
        >
          <span className="w-form-banner__ico">
            {testResult.ok ? "✓" : "⚠"}
          </span>
          <div className="w-form-banner__body">
            {testResult.detail}{" "}
            <span className="w-mono w-dim">({testResult.latencyMs}ms)</span>
          </div>
        </div>
      )}

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
