// /docs 화면의 인터랙티브 뷰. 좌측 트리 + 우측 상세. 데이터는 서버 컴포넌트가 권한 필터링 후 props 로 전달.
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { I } from "@/components/design/Icons";
import { CodeBlock } from "@/components/design/CodeBlock";
import { HttpMethod } from "@/components/design/primitives";
import type { ApiDef, User } from "@/types/api";

type DocApi = Pick<
  ApiDef,
  "no" | "name" | "group" | "method" | "path" | "authRequired" | "desc" | "params" | "resps"
>;

function buildCurl(api: DocApi): string[] {
  const base = `http://localhost:3000/api/sample/${api.path}`;
  if (api.method === "GET") {
    const params = api.params
      .map((p) => `${p.name}=${p.required ? "<value>" : ""}`)
      .filter(Boolean);
    const q = params.length > 0 ? `?${params.join("&")}` : "";
    return [
      `<span class="tk-key">curl</span> -H <span class="tk-str">"X-Cert-Key: AKAD..."</span> \\`,
      `  <span class="tk-str">"${base}${q}"</span>`,
    ];
  }
  const body = `{${api.params
    .map((p) => `"${p.name}":${p.required ? '"<value>"' : "null"}`)
    .join(",")}}`;
  return [
    `<span class="tk-key">curl</span> -X <span class="tk-key">${api.method}</span> \\`,
    `  -H <span class="tk-str">"X-Cert-Key: AKAD..."</span> \\`,
    `  -H <span class="tk-str">"Content-Type: application/json"</span> \\`,
    `  -d <span class="tk-str">'${body}'</span> \\`,
    `  <span class="tk-str">"${base}"</span>`,
  ];
}

interface Props {
  user?: Pick<User, "id" | "name" | "role" | "email"> | null;
  apis: DocApi[];
}

export function DocsViewer({ user, apis }: Props) {
  const [selected, setSelected] = useState<string | null>(
    apis.length > 0 ? apis[0].no : null,
  );
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return apis;
    return apis.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.path.toLowerCase().includes(q) ||
        a.group.toLowerCase().includes(q),
    );
  }, [apis, search]);

  const groups = useMemo(() => {
    const m = new Map<string, DocApi[]>();
    for (const a of filtered) {
      const arr = m.get(a.group) ?? [];
      arr.push(a);
      m.set(a.group, arr);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const current = apis.find((a) => a.no === selected) ?? null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--w-bg-alternative)",
        fontFamily: "var(--w-font-sans)",
      }}
    >
      <header
        style={{
          height: 56,
          padding: "0 24px",
          background: "#fff",
          borderBottom: "1px solid var(--w-line-normal)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Link href="/api-list" className="w-brand" style={{ textDecoration: "none" }}>
          <span className="w-brand__mark">Dx</span>
          <span>Dau.DX.API</span>
          <span className="w-brand__sub">Docs</span>
        </Link>
        <div style={{ flex: 1 }} />
        <a
          href="/api/openapi"
          download="openapi.json"
          className="w-btn w-btn--ghost w-btn--sm"
          data-testid="docs-openapi-download"
        >
          OpenAPI 다운로드
        </a>
        {user ? (
          <>
            <span
              className="w-topbar__user"
              style={{ background: "transparent" }}
              data-testid="docs-user"
            >
              <span className="avatar">{user.name.slice(0, 1)}</span>
              <span className="name">
                {user.name}{" "}
                <span className="w-dim" style={{ fontWeight: 400 }}>
                  ({user.role})
                </span>
              </span>
            </span>
            <Link href="/api-list" className="w-btn w-btn--ghost w-btn--sm">
              <I name="Right" size={12} /> 콘솔로
            </Link>
          </>
        ) : (
          <Link href="/login" className="w-btn w-btn--ghost w-btn--sm">
            <I name="Right" size={12} /> 로그인
          </Link>
        )}
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(240px, 280px) 1fr",
          gap: 0,
          alignItems: "stretch",
        }}
      >
        <aside
          style={{
            background: "#fff",
            borderRight: "1px solid var(--w-line-normal)",
            padding: 12,
            minHeight: "calc(100vh - 56px)",
          }}
        >
          <div className="w-field" style={{ marginBottom: 8 }}>
            <input
              className="w-input"
              placeholder="API 검색…"
              aria-label="API 문서 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div
            className="w-notice w-notice--info"
            style={{ marginBottom: 8, fontSize: 11.5 }}
          >
            <I name="Info" size={12} />
            <div>
              <b>공개 API 문서</b> — 문서 노출(docVisible)된 API 입니다. 호출하려면
              연계시스템 인증키(X-Cert-Key)가 필요합니다.
            </div>
          </div>
          {apis.length === 0 ? (
            <div className="w-empty" style={{ padding: 16 }}>
              <p className="w-empty__title">접근 가능한 API 가 없습니다</p>
              <p className="w-empty__sub">
                관리자에게 연계시스템 등록 또는 API 매핑을 요청하세요.
              </p>
            </div>
          ) : (
            groups.map(([groupName, list]) => (
              <div key={groupName} style={{ marginBottom: 8 }}>
                <div className="w-sidebar__group">{groupName}</div>
                {list.map((a) => (
                  <button
                    key={a.no}
                    type="button"
                    onClick={() => setSelected(a.no)}
                    className={`w-nav-item ${selected === a.no ? "is-active" : ""}`}
                    data-testid="docs-api-link"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13 }}>
                        {a.name}
                      </span>
                      <span
                        className="w-mono w-dim"
                        style={{ fontSize: 10.5, display: "block" }}
                      >
                        {a.path}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ))
          )}
        </aside>

        <main style={{ padding: "24px 32px 40px", overflow: "auto" }}>
          {!current ? (
            <div className="w-empty">
              <p className="w-empty__title">
                {apis.length === 0
                  ? "표시할 API 가 없습니다"
                  : "왼쪽에서 API 를 선택하세요"}
              </p>
            </div>
          ) : (
            <div className="w-stack w-stack--lg">
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <HttpMethod method={current.method} />
                  <span
                    className="w-mono"
                    style={{ fontSize: 13.5, color: "var(--w-fg-strong)" }}
                  >
                    /api/sample/{current.path}
                  </span>
                </div>
                <h1
                  style={{
                    fontFamily: "var(--w-font-display)",
                    fontSize: 24,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    margin: 0,
                  }}
                >
                  {current.name}
                </h1>
                <p
                  className="w-muted"
                  style={{ marginTop: 6, fontSize: 13.5 }}
                >
                  {current.desc ??
                    `${current.group} 그룹 · ${current.authRequired ? "인증키 필수" : "익명 호출 가능"}`}
                </p>
              </div>

              <div className="w-card">
                <div className="w-card__head">
                  <h3 className="w-card__title">요청 파라미터</h3>
                  <span className="w-muted" style={{ fontSize: 12 }}>
                    {current.params.length}개
                  </span>
                </div>
                <div className="w-card__body w-card__body--tight">
                  <div className="w-tbl-wrap">
                    <table className="w-tbl">
                      <thead>
                        <tr>
                          <th>이름</th>
                          <th>타입</th>
                          <th>필수</th>
                          <th>설명</th>
                        </tr>
                      </thead>
                      <tbody>
                        {current.params.length === 0 ? (
                          <tr>
                            <td colSpan={4}>
                              <div className="w-empty">
                                <p className="w-empty__sub">
                                  파라미터가 없습니다.
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          current.params.map((p) => (
                            <tr key={p.name}>
                              <td className="mono strong">{p.name}</td>
                              <td>{p.type}</td>
                              <td>
                                {p.required ? (
                                  <span className="w-badge w-badge--red">필수</span>
                                ) : (
                                  <span className="w-badge w-badge--neutral">
                                    선택
                                  </span>
                                )}
                              </td>
                              <td style={{ fontSize: 12 }}>{p.desc ?? "—"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="w-card">
                <div className="w-card__head">
                  <h3 className="w-card__title">응답 컬럼</h3>
                  <span className="w-muted" style={{ fontSize: 12 }}>
                    {current.resps.length}개
                  </span>
                </div>
                <div className="w-card__body w-card__body--tight">
                  <div className="w-tbl-wrap">
                    <table className="w-tbl">
                      <thead>
                        <tr>
                          <th>컬럼</th>
                          <th>타입</th>
                          <th>표시명</th>
                          <th>마스킹</th>
                        </tr>
                      </thead>
                      <tbody>
                        {current.resps.map((r) => (
                          <tr key={r.col}>
                            <td className="mono strong">{r.col}</td>
                            <td>{r.type}</td>
                            <td>{r.displayName ?? "—"}</td>
                            <td>
                              {r.maskRule === "none" ? (
                                <span className="muted">—</span>
                              ) : (
                                <span className="w-badge w-badge--orange">
                                  {r.maskRule}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="w-card">
                <div className="w-card__head">
                  <h3 className="w-card__title">호출 예시 (curl)</h3>
                  <span className="w-muted" style={{ fontSize: 12 }}>
                    localhost
                  </span>
                </div>
                <div className="w-card__body">
                  <CodeBlock title="curl" language="shell" lines={buildCurl(current)} />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
