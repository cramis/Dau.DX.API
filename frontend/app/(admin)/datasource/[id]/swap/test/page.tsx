// 무중단 변경 2단계 — 신규 접속 실제 연결 테스트(백엔드 test-connection). 통과해야 다음 진행.
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Stepper } from "@/components/design/Stepper";

const SWAP_STEPS = ["변경 정보", "연결 테스트", "영향도 검토", "Hot-swap 실행", "완료"];

type Form = { jdbcUrl: string; dbUser: string; dbPassword: string; dbType: string };

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ success: boolean; latencyMs: number; detail: string } | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(`swap:${id}`);
    if (!raw) router.replace(`/datasource/${id}/swap`);
    else setForm(JSON.parse(raw));
  }, [id, router]);

  async function test() {
    if (!form) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/mock/datasources/test-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jdbcUrl: form.jdbcUrl, dbUser: form.dbUser, dbPassword: form.dbPassword, dbType: form.dbType,
        }),
      });
      const body = await res.json().catch(() => null);
      setResult(body?.success !== undefined ? body : { success: false, latencyMs: 0, detail: body?.message ?? "테스트 실패" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 style={{ fontFamily: "var(--w-font-display)", fontSize: 22, margin: "8px 0" }}>{id} · 연결 테스트</h1>
      <Stepper steps={SWAP_STEPS} current={1} />

      <div className="w-card" style={{ maxWidth: 640, marginTop: 12 }}>
        <div className="w-card__head"><h3 className="w-card__title">신규 풀 연결 검증</h3></div>
        <div className="w-card__body w-stack w-stack--lg">
          {form && (
            <p className="w-mono w-muted" style={{ fontSize: 12 }}>{form.jdbcUrl} · {form.dbUser}</p>
          )}
          <button type="button" className="w-btn w-btn--primary" onClick={test} disabled={busy || !form}>
            {busy ? "테스트 중…" : "연결 테스트 실행"}
          </button>
          {result && (
            <div className={`w-notice ${result.success ? "w-notice--success" : "w-notice--danger"}`}>
              {result.success ? `연결 성공 (${result.latencyMs}ms)` : `연결 실패 — ${result.detail}`}
            </div>
          )}
        </div>
      </div>

      <div className="w-input-row" style={{ marginTop: 12, justifyContent: "flex-end", gap: 8 }}>
        <Link href={`/datasource/${id}/swap`} className="w-btn w-btn--ghost">이전</Link>
        <button type="button" className="w-btn w-btn--primary" disabled={!result?.success}
          onClick={() => router.push(`/datasource/${id}/swap/impact`)}>
          다음: 영향도 검토
        </button>
      </div>
    </>
  );
}
