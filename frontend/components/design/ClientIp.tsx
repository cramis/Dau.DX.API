// 사이드바 하단에 현재 클라이언트의 공인 IP를 표시하는 클라이언트 컴포넌트.
// 서버는 로컬/NAT 환경에서 공인 IP를 알 수 없으므로 브라우저가 외부 echo 서비스(api.ipify.org)로 조회한다.
"use client";

import { useEffect, useState } from "react";

export function ClientIp() {
  const [ip, setIp] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("https://api.ipify.org?format=json")
      .then((r) => r.json())
      .then((d) => {
        if (alive) setIp(typeof d?.ip === "string" ? d.ip : null);
      })
      .catch(() => {
        if (alive) setErr(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div
      style={{
        marginTop: "auto",
        padding: "10px 8px 2px",
        borderTop: "1px solid var(--w-line-normal)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "var(--w-fg-alternative)",
          marginBottom: 2,
        }}
      >
        접속 IP
      </div>
      <div
        className="w-mono"
        style={{ fontSize: 12.5, color: "var(--w-fg-strong)" }}
      >
        {ip ?? (err ? "확인 불가" : "확인 중…")}
      </div>
    </div>
  );
}
