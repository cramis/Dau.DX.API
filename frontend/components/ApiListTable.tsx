// API 목록 테이블 — Wanted 디자인 시스템 스타일. 검색·정렬·페이징 + e2e contract (data-testid="api-row") 유지.
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { I } from "@/components/design/Icons";
import { HttpMethod } from "@/components/design/primitives";
import { JsonEditModal } from "@/components/JsonEditModal";
import type { ApiDef } from "@/types/api";

type SortKey = "no" | "name" | "group" | "method" | "path" | "status";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 10;

function compare(a: string, b: string) {
  return a.localeCompare(b, "ko");
}

function statusBadgeCls(status: ApiDef["status"]) {
  if (status === "ACTIVE") return "w-badge w-badge--green";
  if (status === "DRAFT") return "w-badge w-badge--orange";
  return "w-badge w-badge--neutral";
}

const STATUS_LABEL: Record<ApiDef["status"], string> = {
  ACTIVE: "운영",
  DRAFT: "검토",
  INACTIVE: "비활성",
};

// AI 서비스계정(role=AI)이 등록한 초안 식별 — 계정 ID 'ai-' prefix 관례 (02_AI초안등록_PRD §9).
function isAiCreated(api: ApiDef) {
  return api.regId?.startsWith("ai-") ?? false;
}

export function ApiListTable({
  items,
  dsNameById,
}: {
  items: ApiDef[];
  dsNameById: Record<string, string>;
}) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("no");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | ApiDef["status"]>("all");
  const [editing, setEditing] = useState<ApiDef | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!term) return true;
      return (
        a.no.toLowerCase().includes(term) ||
        a.name.toLowerCase().includes(term) ||
        a.path.toLowerCase().includes(term) ||
        a.group.toLowerCase().includes(term)
      );
    });
  }, [items, q, statusFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const r = compare(a[sortKey], b[sortKey]);
      return sortDir === "asc" ? r : -r;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  return (
    <div className="w-card">
      <div className="w-card__head">
        <div>
          <h3 className="w-card__title">API 목록</h3>
          <div className="w-card__sub">번호·이름·경로·그룹으로 검색</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <input
              className="w-input"
              placeholder="번호·이름·경로·그룹 검색"
              style={{ width: 240, paddingLeft: 32 }}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              aria-label="API 검색"
            />
            <div style={{ position: "absolute", left: 10, top: 9, color: "var(--w-coolgray-600)" }}>
              <I name="Search"/>
            </div>
          </div>
          <select
            className="w-select"
            style={{ width: 120 }}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter);
              setPage(1);
            }}
            aria-label="상태 필터"
          >
            <option value="all">전체 상태</option>
            <option value="ACTIVE">운영</option>
            <option value="DRAFT">검토</option>
            <option value="INACTIVE">비활성</option>
          </select>
          <span className="w-muted" style={{ fontSize: 12 }}>
            총 {sorted.length} 건
          </span>
        </div>
      </div>
      <div className="w-card__body w-card__body--tight">
        <div className="w-tbl-wrap">
          <table className="w-tbl">
            <thead>
              <tr>
                <SortableTh active={sortKey === "no"} onClick={() => toggleSort("no")}>
                  API 번호{arrow("no")}
                </SortableTh>
                <SortableTh active={sortKey === "name"} onClick={() => toggleSort("name")}>
                  API명 / 경로{arrow("name")}
                </SortableTh>
                <SortableTh active={sortKey === "group"} onClick={() => toggleSort("group")}>
                  그룹{arrow("group")}
                </SortableTh>
                <SortableTh active={sortKey === "method"} onClick={() => toggleSort("method")}>
                  메서드{arrow("method")}
                </SortableTh>
                <th>데이터소스</th>
                <SortableTh active={sortKey === "status"} onClick={() => toggleSort("status")}>
                  상태{arrow("status")}
                </SortableTh>
                <th>인증</th>
                <th style={{ width: 90 }}></th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 32, textAlign: "center" }} className="w-muted">
                    결과가 없습니다.
                  </td>
                </tr>
              ) : (
                pageItems.map((api) => (
                  <tr key={api.no} className="is-row" data-testid="api-row">
                    <td className="mono">
                      <Link href={`/api-list/${api.no}`} style={{ color: "inherit" }}>
                        {api.no}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/api-list/${api.no}`} style={{ color: "inherit", textDecoration: "none" }}>
                        <div className="strong">{api.name}</div>
                        <div className="mono w-muted">/{api.path}</div>
                      </Link>
                    </td>
                    <td>{api.group}</td>
                    <td>
                      <HttpMethod method={api.method}/>
                    </td>
                    <td className="mono">{dsNameById[api.dataSrcId] ?? api.dataSrcId}</td>
                    <td>
                      <span className={statusBadgeCls(api.status)}>{STATUS_LABEL[api.status]}</span>
                      {isAiCreated(api) && (
                        <span
                          className="w-badge w-badge--violet"
                          style={{ marginLeft: 4 }}
                          title={`AI 서비스계정(${api.regId})이 등록한 초안 — 승인 전 SQL 검토 필수`}
                          data-testid="ai-badge"
                        >
                          AI
                        </span>
                      )}
                    </td>
                    <td>
                      {api.authRequired ? (
                        <span className="w-badge w-badge--blue">인증키</span>
                      ) : (
                        <span className="w-badge w-badge--neutral">공개</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="w-btn w-btn--ghost w-btn--sm"
                        onClick={() => setEditing(api)}
                        aria-label={`${api.no} JSON 편집`}
                        data-testid="json-edit-btn"
                      >
                        <I name="Pencil" size={12} /> JSON
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div
          style={{
            padding: "12px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid var(--w-line-neutral)",
            fontSize: 12,
            color: "var(--w-fg-alternative)",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span>
            {safePage} / {totalPages} 페이지 · 총 {sorted.length}건
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              type="button"
              className="w-btn w-btn--ghost w-btn--sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              이전
            </button>
            <button
              type="button"
              className="w-btn w-btn--ghost w-btn--sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              다음
            </button>
          </div>
        </div>
      </div>
      <JsonEditModal
        initial={editing}
        identityValue={editing?.no ?? null}
        identityKey="no"
        putUrl={editing ? `/api/mock/apis/${editing.no}` : ""}
        entityLabel="API"
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function SortableTh({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <th
      style={{ cursor: "pointer", userSelect: "none", color: active ? "var(--w-fg-strong)" : undefined }}
      onClick={onClick}
    >
      {children}
    </th>
  );
}
