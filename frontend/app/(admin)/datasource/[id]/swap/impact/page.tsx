// 무중단 변경 3단계 — 영향도 검토. 이 DS 를 쓰는 API·연계시스템 실 목록(백엔드 /swap/impact).
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Stepper } from "@/components/design/Stepper";

const SWAP_STEPS = ["변경 정보", "연결 테스트", "영향도 검토", "Hot-swap 실행", "완료"];

type Impact = {
  apis: { no: string; name: string; path: string; status: string }[];
  extSystems: { id: string; name: string }[];
  apiCount: number;
  extCount: number;
};

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Impact | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!sessionStorage.getItem(`swap:${id}`)) {
      router.replace(`/datasource/${id}/swap`);
      return;
    }
    fetch(`/api/mock/datasources/${id}/swap/impact`, { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => (b?.ok ? setData(b) : setErr(b?.message ?? "영향도 조회 실패")))
      .catch(() => setErr("영향도 조회 실패"));
  }, [id, router]);

  return (
    <>
      <h1 style={{ fontFamily: "var(--w-font-display)", fontSize: 22, margin: "8px 0" }}>{id} · 영향도 검토</h1>
      <Stepper steps={SWAP_STEPS} current={2} />

      {err && <div className="w-notice w-notice--danger" style={{ marginTop: 12 }}>{err}</div>}
      {data && (
        <div className="w-notice w-notice--info" style={{ marginTop: 12 }}>
          이 데이터소스를 쓰는 <b>API {data.apiCount}건</b>, 영향받는 <b>연계시스템 {data.extCount}곳</b>. graceful 전환이라 진행 중 호출은 보호됩니다.
        </div>
      )}

      <div className="w-grid-2" style={{ marginTop: 12 }}>
        <div className="w-card">
          <div className="w-card__head"><h3 className="w-card__title">영향 API</h3>
            <span className="w-muted" style={{ fontSize: 12 }}>{data?.apiCount ?? 0}개</span></div>
          <div className="w-card__body w-card__body--tight">
            <table className="w-tbl"><thead><tr><th>API</th><th>경로</th><th>상태</th></tr></thead>
              <tbody>
                {(data?.apis ?? []).map((a) => (
                  <tr key={a.no}><td className="strong">{a.name}</td><td className="mono">{a.path}</td><td>{a.status}</td></tr>
                ))}
                {data && data.apis.length === 0 && <tr><td colSpan={3}><span className="w-muted">없음</span></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="w-card">
          <div className="w-card__head"><h3 className="w-card__title">영향 연계시스템</h3>
            <span className="w-muted" style={{ fontSize: 12 }}>{data?.extCount ?? 0}개</span></div>
          <div className="w-card__body w-card__body--tight">
            <table className="w-tbl"><thead><tr><th>ID</th><th>이름</th></tr></thead>
              <tbody>
                {(data?.extSystems ?? []).map((e) => (
                  <tr key={e.id}><td className="mono">{e.id}</td><td>{e.name}</td></tr>
                ))}
                {data && data.extSystems.length === 0 && <tr><td colSpan={2}><span className="w-muted">없음</span></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="w-input-row" style={{ marginTop: 12, justifyContent: "flex-end", gap: 8 }}>
        <Link href={`/datasource/${id}/swap/test`} className="w-btn w-btn--ghost">이전</Link>
        <button type="button" className="w-btn w-btn--primary" disabled={!data}
          onClick={() => router.push(`/datasource/${id}/swap/run`)}>다음: 실행</button>
      </div>
    </>
  );
}
