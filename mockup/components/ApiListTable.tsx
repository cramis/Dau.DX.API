// API 목록 테이블 (검색·정렬·페이징). 데이터는 server component 에서 받아온 초기값 + 이후 router.refresh.
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import type { ApiDef } from "@/types/api";

type SortKey = "no" | "name" | "group" | "method" | "path" | "status";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 10;

function compare(a: string, b: string): number {
  return a.localeCompare(b, "ko");
}

export function ApiListTable({ items }: { items: ApiDef[] }) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("no");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (a) =>
        a.no.toLowerCase().includes(term) ||
        a.name.toLowerCase().includes(term) ||
        a.path.toLowerCase().includes(term) ||
        a.group.toLowerCase().includes(term)
    );
  }, [items, q]);

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
  const pageItems = sorted.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="번호·이름·경로·그룹 검색"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <span className="text-sm text-muted-foreground">
          총 {sorted.length} 건
        </span>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <Th onClick={() => toggleSort("no")}>번호{arrow("no")}</Th>
            <Th onClick={() => toggleSort("name")}>이름{arrow("name")}</Th>
            <Th onClick={() => toggleSort("group")}>그룹{arrow("group")}</Th>
            <Th onClick={() => toggleSort("method")}>
              메서드{arrow("method")}
            </Th>
            <Th onClick={() => toggleSort("path")}>경로{arrow("path")}</Th>
            <Th onClick={() => toggleSort("status")}>
              상태{arrow("status")}
            </Th>
          </tr>
        </thead>
        <tbody>
          {pageItems.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                결과가 없습니다.
              </td>
            </tr>
          ) : (
            pageItems.map((api) => (
              <tr
                key={api.no}
                className="border-b transition-colors hover:bg-accent/40"
                data-testid="api-row"
              >
                <td className="px-2 py-2 font-mono text-xs">
                  <Link href={`/api-list/${api.no}`} className="hover:underline">
                    {api.no}
                  </Link>
                </td>
                <td className="px-2 py-2">
                  <Link href={`/api-list/${api.no}`} className="hover:underline">
                    {api.name}
                  </Link>
                </td>
                <td className="px-2 py-2">{api.group}</td>
                <td className="px-2 py-2 font-mono text-xs">{api.method}</td>
                <td className="px-2 py-2 font-mono text-xs">{api.path}</td>
                <td className="px-2 py-2">
                  <StatusBadge status={api.status} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {safePage} / {totalPages} 페이지
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            className="rounded-md border px-3 py-1 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
          >
            이전
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-1 disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <th
      className="cursor-pointer select-none px-2 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
      onClick={onClick}
    >
      {children}
    </th>
  );
}

function StatusBadge({ status }: { status: ApiDef["status"] }) {
  const cls =
    status === "ACTIVE"
      ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
      : status === "DRAFT"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
        : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200";
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}
