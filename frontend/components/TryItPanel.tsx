// API Try-it 공용 패널 — params 메타 기반 입력폼 자동 생성 + 실행 + 응답 JSON 뷰.
// 콘솔(test-run, DML 롤백)과 /docs(실제 게이트웨이 호출) 양쪽에서 execute 함수만 주입해 재사용. 03_API테스트실행_PRD §6.
"use client";

import { useMemo, useState } from "react";
import { I } from "@/components/design/Icons";

export interface TryItParamMeta {
  name: string;
  type: "string" | "number" | "date" | "boolean";
  required: boolean;
  defaultValue?: string;
  desc?: string;
}

interface TestRunData {
  rows?: Record<string, unknown>[];
  affected?: number;
  rowCount?: number;
  limited?: boolean;
  elapsedMs?: number;
  rolledBack?: boolean;
  [k: string]: unknown;
}

export interface TryItResponse {
  status: number;
  body: {
    ok?: boolean;
    // 콘솔(test-run) = 객체, 게이트웨이(/api/try) = rows 배열
    data?: TestRunData | Record<string, unknown>[];
    message?: string;
    issues?: unknown;
    [k: string]: unknown;
  };
}

interface Props {
  method: string;
  params: TryItParamMeta[];
  /** 실행 — 입력값(타입 변환 완료)을 받아 호출 결과를 반환. 콘솔=test-run BFF / docs=/api/try */
  execute: (values: Record<string, unknown>) => Promise<TryItResponse>;
  /** 非GET 실행 전 confirm 문구. 미지정 시 확인 없이 실행 */
  writeConfirmMessage?: string;
  /** 실행 결과 위에 표시할 안내 한 줄 */
  hint?: string;
}

function convert(meta: TryItParamMeta, raw: string): unknown {
  if (meta.type === "number") return raw === "" ? null : Number(raw);
  if (meta.type === "boolean") return raw === "true";
  return raw;
}

export function TryItPanel({ method, params, execute, writeConfirmMessage, hint }: Props) {
  const initial = useMemo(() => {
    const v: Record<string, string> = {};
    for (const p of params) v[p.name] = p.defaultValue ?? "";
    return v;
  }, [params]);
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TryItResponse | null>(null);

  async function run() {
    for (const p of params) {
      if (p.required && !(values[p.name] ?? "").trim()) {
        setResult({ status: 0, body: { ok: false, message: `필수 파라미터 누락: ${p.name}` } });
        return;
      }
    }
    if (method !== "GET" && writeConfirmMessage && !confirm(writeConfirmMessage)) return;
    const payload: Record<string, unknown> = {};
    for (const p of params) {
      const raw = values[p.name] ?? "";
      if (raw === "" && !p.required) continue;   // 선택 파라미터 빈값은 미전송
      payload[p.name] = convert(p, raw);
    }
    setRunning(true);
    try {
      setResult(await execute(payload));
    } catch (e) {
      setResult({ status: 0, body: { ok: false, message: String(e) } });
    } finally {
      setRunning(false);
    }
  }

  const raw = result?.body?.data;
  const data: TestRunData | null = raw && !Array.isArray(raw) ? (raw as TestRunData) : null;
  const gatewayRows = Array.isArray(raw) ? raw : null;
  const ok = result?.body?.ok === true;

  return (
    <div data-testid="tryit-panel">
      <div className="w-form-toolbar">
        <p className="w-muted" style={{ fontSize: 13, margin: 0 }}>
          {hint ?? "입력 파라미터를 채우고 실행하면 실제 결과를 확인할 수 있습니다."}
        </p>
        <button
          type="button"
          className="w-btn w-btn--sm"
          onClick={run}
          disabled={running}
          data-testid="tryit-run-btn"
        >
          <I name="Play" size={12} /> {running ? "실행 중..." : "실행"}
        </button>
      </div>

      {params.length === 0 ? (
        <p className="w-muted" style={{ fontSize: 12.5 }}>입력 파라미터가 없는 API 입니다.</p>
      ) : (
        <div className="w-tbl-wrap">
          <table className="w-form-table">
            <thead>
              <tr>
                <th style={{ width: 160 }}>파라미터</th>
                <th style={{ width: 90 }}>타입</th>
                <th>값</th>
                <th>설명</th>
              </tr>
            </thead>
            <tbody>
              {params.map((p) => (
                <tr key={p.name}>
                  <td className="mono">
                    {p.name}
                    {p.required && <span style={{ color: "var(--w-tint-critical)" }}> *</span>}
                  </td>
                  <td className="w-muted">{p.type}</td>
                  <td>
                    {p.type === "boolean" ? (
                      <select
                        className="w-select"
                        value={values[p.name] ?? ""}
                        onChange={(e) => setValues((v) => ({ ...v, [p.name]: e.target.value }))}
                      >
                        <option value="">(미지정)</option>
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : (
                      <input
                        className="w-input"
                        value={values[p.name] ?? ""}
                        placeholder={p.defaultValue ? `기본값: ${p.defaultValue}` : ""}
                        onChange={(e) => setValues((v) => ({ ...v, [p.name]: e.target.value }))}
                        aria-label={`파라미터 ${p.name}`}
                      />
                    )}
                  </td>
                  <td className="w-muted" style={{ fontSize: 12 }}>{p.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result && (
        <div style={{ marginTop: 14 }} data-testid="tryit-result">
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
            <span className={`w-badge ${ok ? "w-badge--green" : "w-badge--red"}`}>
              {ok ? "성공" : "실패"}{result.status ? ` · ${result.status}` : ""}
            </span>
            {data?.rowCount !== undefined && (
              <span className="w-badge w-badge--neutral">{data.rowCount}건</span>
            )}
            {gatewayRows && (
              <span className="w-badge w-badge--neutral">{gatewayRows.length}건</span>
            )}
            {data?.elapsedMs !== undefined && (
              <span className="w-badge w-badge--neutral">{data.elapsedMs}ms</span>
            )}
            {data?.limited && (
              <span className="w-badge w-badge--orange" title="maxRows 한도로 일부만 표시됨">행 제한</span>
            )}
            {data?.rolledBack && (
              <span className="w-badge w-badge--violet" title="쓰기 결과는 확인 후 자동 롤백 — DB 원상복구됨">
                롤백됨
              </span>
            )}
          </div>
          <pre
            className="w-mono"
            style={{
              background: "var(--w-bg-alternative)",
              padding: 12,
              borderRadius: 8,
              fontSize: 12,
              maxHeight: 360,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {JSON.stringify(result.body, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
