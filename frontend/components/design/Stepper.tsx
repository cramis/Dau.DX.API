// 위저드 진행 상태 표시 stepper. current 인덱스 이전은 done, 동일은 active.
import { Fragment } from "react";

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="w-stepper" role="list">
      {steps.map((s, i) => (
        <Fragment key={i}>
          <div
            role="listitem"
            className={`w-step ${i < current ? "is-done" : ""} ${i === current ? "is-active" : ""}`}
          >
            <div className="dot">{i < current ? "✓" : i + 1}</div>
            <div className="lbl">{s}</div>
          </div>
          {i < steps.length - 1 && <div className="w-step__bar" aria-hidden/>}
        </Fragment>
      ))}
    </div>
  );
}
