// 무중단 변경 4단계 — 실행. 저장된 신규 설정으로 백엔드 /swap/run 호출(설정 교체 + graceful drain). 동기 결과.
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Stepper } from "@/components/design/Stepper";

const SWAP_STEPS = ["변경 정보", "연결 테스트", "영향도 검토", "Hot-swap 실행", "완료"];

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem(`swap:${id}`);
    if (!raw) router.replace(`/datasource/${id}/swap`);
    else setForm(JSON.parse(raw));
  }, [id, router]);

  async function run() {
    if (!form) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/mock/datasources/${id}/swap/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => null);
      if (body?.ok) {
        sessionStorage.setItem(`swapResult:${id}`, JSON.stringify(body));
        router.push(`/datasource/${id}/swap/done`);
      } else {
        setErr(body?.message ?? "교체 실패");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 style={{ fontFamily: "var(--w-font-display)", fontSize: 22, margin: "8px 0" }}>{id} · Hot-swap 실행</h1>
      <Stepper steps={SWAP_STEPS} current={3} />

      <div className="w-card" style={{ maxWidth: 640, marginTop: 12 }}>
        <div className="w-card__body w-stack w-stack--lg">
          <p style={{ fontSize: 13 }}>
            신규 설정으로 교체합니다. 새 호출은 즉시 신규 풀을 쓰고, 기존 풀은 진행 중 쿼리가 끝나도록 <b>drain</b> 후 정리됩니다(graceful).
          </p>
          {form && <p className="w-mono w-muted" style={{ fontSize: 12 }}>{String((form as { jdbcUrl?: string }).jdbcUrl)}</p>}
          {err && <div className="w-notice w-notice--danger">{err}</div>}
          <button type="button" className="w-btn w-btn--primary" onClick={run} disabled={busy || !form}>
            {busy ? "교체 중…" : "Hot-swap 실행"}
          </button>
        </div>
      </div>

      <div className="w-input-row" style={{ marginTop: 12, justifyContent: "flex-start" }}>
        <Link href={`/datasource/${id}/swap/impact`} className="w-btn w-btn--ghost">이전</Link>
      </div>
    </>
  );
}
