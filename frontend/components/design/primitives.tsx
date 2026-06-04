// 디자인 시스템 작은 표시용 컴포넌트(Notice, Checklist, MetricTile, Hypothesis, Method, TraceRow).
import type { ReactNode } from "react";

export function Notice({
  variant,
  icon,
  children,
}: {
  variant: "info" | "ok" | "warn" | "err";
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`w-notice w-notice--${variant}`} role={variant === "err" || variant === "warn" ? "alert" : undefined}>
      {icon}
      <div>{children}</div>
    </div>
  );
}

export type CheckItemVariant = "ok" | "err" | "run" | "neutral";
export function Checklist({ children }: { children: ReactNode }) {
  return <ul className="w-checklist">{children}</ul>;
}
export function CheckItem({
  variant = "neutral",
  icon,
  children,
}: {
  variant?: CheckItemVariant;
  icon?: ReactNode;
  children: ReactNode;
}) {
  const cls = variant === "neutral" ? "" : variant;
  return (
    <li className={cls}>
      {icon}
      <div>{children}</div>
    </li>
  );
}

export function MetricTile({
  label,
  value,
  unit,
  delta,
  deltaTone,
  accent,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  delta?: ReactNode;
  deltaTone?: "up" | "down" | "neutral";
  accent?: "critical" | "primary" | "positive";
}) {
  const accentBorder =
    accent === "critical" ? "var(--w-tint-critical)" :
    accent === "primary" ? "var(--w-tint-primary)" :
    accent === "positive" ? "var(--w-green)" : undefined;
  return (
    <div className="w-metric" style={accentBorder ? { borderColor: accentBorder } : undefined}>
      <div className="w-metric__lbl">{label}</div>
      <div className="w-metric__val">
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>
      {delta && (
        <div
          className={`w-metric__delta ${
            deltaTone === "up" ? "w-metric__delta--up" :
            deltaTone === "down" ? "w-metric__delta--down" : ""
          }`}
        >
          {delta}
        </div>
      )}
    </div>
  );
}

export function Hypothesis({
  tag,
  title,
  body,
  kpis,
}: {
  tag: string;
  title: ReactNode;
  body: ReactNode;
  kpis?: { v: ReactNode; l: ReactNode }[];
}) {
  return (
    <div className="w-hypo">
      <div style={{ flex: 1 }}>
        <div className="w-hypo__tag">{tag}</div>
        <div className="w-hypo__title">{title}</div>
        <div className="w-hypo__body">{body}</div>
        {kpis && (
          <div className="w-hypo__kpis">
            {kpis.map((k, i) => (
              <div key={i} className="w-hypo__kpi"><b>{k.v}</b> · {k.l}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function HttpMethod({ method }: { method: "GET" | "POST" | "PUT" | "DELETE" }) {
  const cls =
    method === "GET" ? "w-method--get" :
    method === "POST" ? "w-method--post" :
    method === "PUT" ? "w-method--put" :
    "w-method--del";
  return <span className={`w-method ${cls}`}>{method}</span>;
}

export function TraceRow({
  name,
  left,
  width,
  ms,
  color = "var(--w-tint-primary)",
  indent = 0,
}: {
  name: ReactNode;
  left: number;
  width: number;
  ms: ReactNode;
  color?: string;
  indent?: number;
}) {
  return (
    <div className="w-trace-row">
      <div className="name" style={indent ? { paddingLeft: indent } : undefined}>{name}</div>
      <div className="bar-track">
        <div
          className="bar"
          style={{ left: `${left}%`, width: `${width}%`, background: color }}
        />
      </div>
      <div className="ms">{ms}</div>
    </div>
  );
}
