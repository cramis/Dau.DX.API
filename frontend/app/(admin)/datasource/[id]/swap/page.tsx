// 무중단 변경 위저드 1단계 — 신규 접속 설정 입력(graceful·즉시). 입력은 sessionStorage(swap:{id})에 저장. 실 백엔드 연동.
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Stepper } from "@/components/design/Stepper";

const SWAP_STEPS = ["변경 정보", "연결 테스트", "영향도 검토", "Hot-swap 실행", "완료"];

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [f, setF] = useState({
    jdbcUrl: "",
    dbUser: "",
    dbPassword: "",
    dbType: "ORACLE",
    poolMin: 5,
    poolMax: 20,
    queryTimeoutSec: 10,
  });
  const [err, setErr] = useState("");

  function next() {
    if (!f.jdbcUrl.trim() || !f.dbUser.trim()) {
      setErr("JDBC URL 과 사용자는 필수입니다.");
      return;
    }
    sessionStorage.setItem(`swap:${id}`, JSON.stringify(f));
    router.push(`/datasource/${id}/swap/test`);
  }

  return (
    <>
      <h1 style={{ fontFamily: "var(--w-font-display)", fontSize: 22, margin: "8px 0" }}>
        {id} · 무중단 변경
      </h1>
      <p className="w-muted" style={{ marginBottom: 12, fontSize: 13 }}>
        기존 풀을 유지한 채 신규 풀로 graceful 전환합니다(전환 후 기존 풀은 drain 시간 뒤 정리).
      </p>
      <Stepper steps={SWAP_STEPS} current={0} />

      <div className="w-card" style={{ maxWidth: 640, marginTop: 12 }}>
        <div className="w-card__head"><h3 className="w-card__title">신규 연결 정보</h3></div>
        <div className="w-card__body">
          <div className="w-stack w-stack--lg">
            <div className="w-field">
              <label className="w-field__lbl">DB 종류</label>
              <select className="w-select" value={f.dbType} onChange={(e) => setF({ ...f, dbType: e.target.value })}>
                <option value="ORACLE">ORACLE</option>
                <option value="POSTGRES">POSTGRES</option>
                <option value="MYSQL">MYSQL</option>
              </select>
            </div>
            <div className="w-field">
              <label className="w-field__lbl">JDBC URL <span className="w-field__req">*</span></label>
              <input className="w-input w-mono" value={f.jdbcUrl}
                placeholder="jdbc:oracle:thin:@new-host:1521/SVC"
                onChange={(e) => setF({ ...f, jdbcUrl: e.target.value })} />
            </div>
            <div className="w-grid-2">
              <div className="w-field">
                <label className="w-field__lbl">사용자 <span className="w-field__req">*</span></label>
                <input className="w-input w-mono" value={f.dbUser}
                  onChange={(e) => setF({ ...f, dbUser: e.target.value })} />
              </div>
              <div className="w-field">
                <label className="w-field__lbl">비밀번호</label>
                <input className="w-input w-mono" type="password" value={f.dbPassword}
                  placeholder="비우면 기존 비번 유지"
                  onChange={(e) => setF({ ...f, dbPassword: e.target.value })} />
              </div>
            </div>
            <div className="w-grid-2">
              <div className="w-field">
                <label className="w-field__lbl">풀 최소/최대</label>
                <div className="w-input-row">
                  <input className="w-input w-mono" type="number" min={0} value={f.poolMin}
                    onChange={(e) => setF({ ...f, poolMin: Number(e.target.value) })} />
                  <input className="w-input w-mono" type="number" min={1} value={f.poolMax}
                    onChange={(e) => setF({ ...f, poolMax: Number(e.target.value) })} />
                </div>
              </div>
              <div className="w-field">
                <label className="w-field__lbl">쿼리 타임아웃(초)</label>
                <input className="w-input w-mono" type="number" min={1} value={f.queryTimeoutSec}
                  onChange={(e) => setF({ ...f, queryTimeoutSec: Number(e.target.value) })} />
              </div>
            </div>
            {err && <p className="w-field__msg">{err}</p>}
          </div>
        </div>
      </div>

      <div className="w-input-row" style={{ marginTop: 12, justifyContent: "flex-end", gap: 8 }}>
        <Link href="/datasource" className="w-btn w-btn--ghost">취소</Link>
        <button type="button" className="w-btn w-btn--primary" onClick={next}>다음: 연결 테스트</button>
      </div>
    </>
  );
}
