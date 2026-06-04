// 무중단 변경 5단계 — 완료. 실행 결과(swapResult) 요약. sessionStorage 정리.
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Stepper } from "@/components/design/Stepper";

const SWAP_STEPS = ["변경 정보", "연결 테스트", "영향도 검토", "Hot-swap 실행", "완료"];

type Result = { datasource?: { jdbcUrl: string; dbUser: string }; drainSeconds?: number; message?: string };

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const [r, setR] = useState<Result | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(`swapResult:${id}`);
    if (raw) setR(JSON.parse(raw));
    sessionStorage.removeItem(`swap:${id}`);
    sessionStorage.removeItem(`swapResult:${id}`);
  }, [id]);

  return (
    <>
      <h1 style={{ fontFamily: "var(--w-font-display)", fontSize: 22, margin: "8px 0" }}>{id} · 완료</h1>
      <Stepper steps={SWAP_STEPS} current={4} />

      <div className="w-notice w-notice--success" style={{ marginTop: 12 }}>
        무중단 변경 완료. {r?.message ?? "설정이 교체되었습니다."}
      </div>
      {r?.datasource && (
        <div className="w-card" style={{ maxWidth: 640, marginTop: 12 }}>
          <div className="w-card__head"><h3 className="w-card__title">전환 결과</h3></div>
          <div className="w-card__body">
            <table className="w-tbl"><tbody>
              <tr><td>신규 JDBC URL</td><td className="mono">{r.datasource.jdbcUrl}</td></tr>
              <tr><td>사용자</td><td className="mono">{r.datasource.dbUser}</td></tr>
              <tr><td>기존 풀 drain</td><td>{r.drainSeconds ?? 0}초 후 정리</td></tr>
            </tbody></table>
          </div>
        </div>
      )}

      <div className="w-input-row" style={{ marginTop: 12, justifyContent: "flex-end" }}>
        <Link href="/datasource" className="w-btn w-btn--primary">데이터소스 목록</Link>
      </div>
    </>
  );
}
