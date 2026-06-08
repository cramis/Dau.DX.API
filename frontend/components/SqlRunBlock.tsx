// API 폼의 SQL 실행 블록 — test-run 호출 + 결과 표시 + 응답 컬럼 자동세팅. SQL 탭·테스트 탭 공용.
"use client";

import { toast } from "sonner";
import type { UseFieldArrayReturn, UseFormReturn } from "react-hook-form";
import { TryItPanel, type TryItResponse } from "@/components/TryItPanel";
import type { ApiCreateInput } from "@/lib/schemas/api";

interface Props {
  form: UseFormReturn<ApiCreateInput>;
  resps: UseFieldArrayReturn<ApiCreateInput, "resps">;
  hint?: string;
}

export function SqlRunBlock({ form, resps, hint }: Props) {
  // 실행 성공 + 1행 이상 + 응답 컬럼이 비어 있을 때만, 결과 컬럼명을 대문자로 자동 세팅.
  function autoFillResps(res: TryItResponse) {
    if (res.body?.ok !== true) return;
    const d = res.body.data;
    const rows = d && !Array.isArray(d) ? d.rows : Array.isArray(d) ? d : undefined;
    if (!rows || rows.length === 0) return; // 0행이면 컬럼을 알 수 없어 자동세팅 불가
    const cur = form.getValues("resps");
    const isEmpty = cur.length === 0 || (cur.length === 1 && !(cur[0]?.col ?? "").trim());
    if (!isEmpty) return; // 이미 입력된 응답 컬럼은 건드리지 않음

    const first = rows[0] as Record<string, unknown>;
    const keys = Object.keys(first);
    if (keys.length === 0) return;
    resps.replace(
      keys.map((k) => ({
        col: k.toUpperCase(), // 백엔드는 결과 컬럼을 소문자로 반환 — Oracle 관행 맞춰 대문자
        type: typeof first[k] === "number" ? "NUMBER" : "VARCHAR",
        displayName: "",
        maskRule: "none" as const,
      }))
    );
    toast.success(`응답 컬럼 ${keys.length}개를 결과에서 자동 세팅했습니다.`);
  }

  return (
    <TryItPanel
      method={form.watch("method")}
      params={form.watch("params")}
      hint={hint ?? "현재 폼의 SQL·파라미터로 실제 실행합니다(저장 전 가능). 쓰기 SQL 은 실행 후 자동 롤백됩니다."}
      writeConfirmMessage={
        "쓰기 SQL 을 실행합니다. 결과 확인 후 자동 롤백되어 DB 는 원상복구됩니다.\n(주의: 시퀀스 소모 등 일부 부수효과는 롤백되지 않습니다)\n계속할까요?"
      }
      onResult={autoFillResps}
      execute={async (values) => {
        const res = await fetch("/api/mock/apis/test-run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: form.getValues("method"),
            sql: form.getValues("sql"),
            dataSrcId: form.getValues("dataSrcId"),
            params: values,
            resps: form.getValues("resps"),
          }),
        });
        return { status: res.status, body: await res.json().catch(() => ({})) };
      }}
    />
  );
}
