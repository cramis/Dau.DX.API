// H3_S1 — 데이터소스 목록 + 풀 포화 감지 + 풀 사용률 차트 + CRUD 다이얼로그.
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHead } from "@/components/design/AppShell";
import { I } from "@/components/design/Icons";
import { LineChart } from "@/components/design/LineChart";
import { Modal } from "@/components/design/Modal";
import { MetricTile } from "@/components/design/primitives";
import { BulkImportModal } from "@/components/BulkImportModal";
import { DataSourceForm } from "@/components/DataSourceForm";
import { JsonEditModal } from "@/components/JsonEditModal";
import { DS_RUNTIME_META, POOL_HISTORY_LMS } from "@/lib/datasourceMeta";
import type { DataSourceCreateInput } from "@/lib/schemas/datasource";
import type { DataSource } from "@/types/api";

const DB_TYPE_LABEL: Record<string, string> = {
  ORACLE: "Oracle 19c",
  POSTGRES: "PostgreSQL 15",
  MYSQL: "MySQL 8",
};

function statusBadgeCls(s: "정상" | "주의" | "심각") {
  if (s === "정상") return "w-badge w-badge--green";
  if (s === "주의") return "w-badge w-badge--orange";
  return "w-badge w-badge--red";
}

export default function Page() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<DataSource | null>(null);
  const [creating, setCreating] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [jsonEditing, setJsonEditing] = useState<DataSource | null>(null);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/mock/datasources/export");
      if (!res.ok) {
        toast.error("내보내기에 실패했습니다.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `datasources-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("datasources-*.json 다운로드를 시작했습니다.");
    } finally {
      setExporting(false);
    }
  }

  async function refresh() {
    const res = await fetch("/api/mock/datasources");
    const data = await res.json().catch(() => ({}));
    if (data?.ok) setSources(data.items);
    setLoaded(true);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sources;
    return sources.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.jdbcUrl.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q),
    );
  }, [sources, search]);

  const oracleCount = sources.filter((d) => d.dbType === "ORACLE").length;
  const pgCount = sources.filter((d) => d.dbType === "POSTGRES").length;
  const avgPoolPct =
    sources.length > 0
      ? Math.round(
          sources.reduce(
            (sum, d) => sum + (DS_RUNTIME_META[d.id]?.poolPct ?? 0),
            0,
          ) / sources.length,
        )
      : 0;

  async function handleCreate(input: DataSourceCreateInput) {
    const res = await fetch("/api/mock/datasources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        data?.message === "NAME_EXISTS"
          ? "이미 사용 중인 이름입니다."
          : "등록에 실패했습니다.",
      );
    }
    toast.success(`${input.name} 데이터소스를 등록했습니다.`);
    setCreating(false);
    await refresh();
  }

  async function handleUpdate(input: DataSourceCreateInput) {
    if (!editing) return;
    const res = await fetch(`/api/mock/datasources/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        data?.message === "NAME_EXISTS"
          ? "이미 사용 중인 이름입니다."
          : "수정에 실패했습니다.",
      );
    }
    toast.success(`${input.name} 데이터소스를 수정했습니다.`);
    setEditing(null);
    await refresh();
  }

  async function handleDelete(d: DataSource) {
    const ok = window.confirm(
      `데이터소스 "${d.name}" 를 삭제하시겠습니까?\n매핑된 API 가 있으면 삭제할 수 없습니다.`,
    );
    if (!ok) return;
    const res = await fetch(`/api/mock/datasources/${d.id}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(
        data?.detail ??
          (data?.message === "IN_USE"
            ? "매핑된 API 가 있어 삭제할 수 없습니다."
            : "삭제에 실패했습니다."),
      );
      return;
    }
    toast.success(`${d.name} 데이터소스를 삭제했습니다.`);
    await refresh();
  }

  return (
    <>
      <PageHead
        breadcrumb={["서비스", "데이터소스"]}
        title="데이터소스 관리"
        sub={`${sources.length}개 풀 · 무중단 hot-swap 지원`}
        actions={
          <>
            <button
              className="w-btn w-btn--ghost w-btn--sm"
              onClick={() => void refresh()}
            >
              <I name="Refresh" /> 헬스체크
            </button>
            <button
              type="button"
              className="w-btn w-btn--ghost w-btn--sm"
              onClick={() => void handleExport()}
              disabled={exporting}
              data-testid="ds-export-btn"
            >
              <I name="Down" /> JSON 내보내기
            </button>
            <button
              type="button"
              className="w-btn w-btn--ghost w-btn--sm"
              onClick={() => setImportOpen(true)}
              data-testid="ds-import-btn"
            >
              <I name="Plus" /> JSON 가져오기
            </button>
            <button
              className="w-btn w-btn--primary w-btn--sm"
              onClick={() => setCreating(true)}
            >
              <I name="Plus" /> 데이터소스 추가
            </button>
          </>
        }
      />

      <div className="w-metrics" style={{ marginBottom: 16 }}>
        <MetricTile
          label="총 데이터소스"
          value={sources.length}
          delta={`Oracle ${oracleCount} · PG ${pgCount}`}
        />
        <MetricTile
          label="올해 재시작 사례"
          value={<span style={{ color: "var(--w-green)" }}>0</span>}
          unit="건"
          delta="목표 0건 유지"
          deltaTone="up"
        />
        <MetricTile
          label="진행 중 hot-swap"
          value="0"
          delta="최근 변경: 4일 전"
        />
        <MetricTile
          label="평균 풀 사용률"
          value={avgPoolPct}
          unit="%"
          delta="건강한 수준"
        />
      </div>

      <div className="w-card">
        <div className="w-card__head">
          <h3 className="w-card__title">데이터소스</h3>
          <input
            className="w-input"
            placeholder="이름·JDBC·ID 검색…"
            style={{ width: 220 }}
            aria-label="데이터소스 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-card__body w-card__body--tight">
          <div className="w-tbl-wrap">
            <table className="w-tbl">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>종류</th>
                  <th>JDBC URL</th>
                  <th>풀 사용</th>
                  <th>지연</th>
                  <th>매핑 API</th>
                  <th>상태</th>
                  <th style={{ minWidth: 200 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="w-empty">
                        <p className="w-empty__title">
                          {loaded ? "검색 결과가 없습니다" : "불러오는 중…"}
                        </p>
                        {loaded && (
                          <p className="w-empty__sub">
                            다른 키워드로 다시 시도하거나, 새 데이터소스를
                            추가하세요.
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((d) => {
                    const meta = DS_RUNTIME_META[d.id];
                    const isLms = d.id === "DS20260509002";
                    return (
                      <tr
                        key={d.id}
                        className={`is-row ${isLms ? "is-selected" : ""}`}
                        data-testid="ds-row"
                      >
                        <td className="strong">{d.name}</td>
                        <td>{DB_TYPE_LABEL[d.dbType] ?? d.dbType}</td>
                        <td
                          className="mono muted"
                          style={{ fontSize: 11.5 }}
                        >
                          {d.jdbcUrl}
                        </td>
                        <td className="mono">{meta?.pool ?? "—"}</td>
                        <td className="mono">
                          {meta ? `${meta.latencyMs}ms` : "—"}
                        </td>
                        <td>{meta?.apiCount ?? 0}</td>
                        <td>
                          <span
                            className={statusBadgeCls(meta?.status ?? "정상")}
                          >
                            {meta?.status ?? "정상"}
                          </span>
                        </td>
                        <td>
                          <div
                            style={{
                              display: "inline-flex",
                              gap: 4,
                              flexWrap: "wrap",
                            }}
                          >
                            <Link
                              href={`/datasource/${d.id}/swap`}
                              className="w-btn w-btn--soft w-btn--sm"
                            >
                              <I name="Swap" /> 무중단 변경
                            </Link>
                            <button
                              className="w-btn w-btn--ghost w-btn--sm"
                              onClick={() => setEditing(d)}
                              aria-label={`${d.name} 수정`}
                            >
                              <I name="Pencil" size={12} /> 수정
                            </button>
                            <button
                              className="w-btn w-btn--ghost w-btn--sm"
                              onClick={() => setJsonEditing(d)}
                              aria-label={`${d.name} JSON 편집`}
                              data-testid="ds-json-edit-btn"
                            >
                              <I name="Pencil" size={12} /> JSON
                            </button>
                            <button
                              className="w-btn w-btn--danger w-btn--sm"
                              onClick={() => void handleDelete(d)}
                              aria-label={`${d.name} 삭제`}
                            >
                              <I name="Trash" size={12} /> 삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="w-card" style={{ marginTop: 16 }}>
        <div className="w-card__head">
          <h3 className="w-card__title">DAU-LMS-PROD · 풀 사용률 추이</h3>
          <span className="w-badge w-badge--orange">
            <I name="Alert" size={11} /> 풀 포화 임박
          </span>
        </div>
        <div className="w-card__body">
          <LineChart values={POOL_HISTORY_LMS} h={100} color="var(--w-orange)" />
          <div className="w-muted" style={{ fontSize: 12, marginTop: 8 }}>
            최근 60분 사용률이 한도(50)에 근접합니다. 풀 크기 확장 또는 인스턴스
            마이그레이션이 권장됩니다.
          </div>
        </div>
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="데이터소스 추가"
        size="lg"
      >
        <DataSourceForm
          initial={null}
          onCancel={() => setCreating(false)}
          onSubmit={handleCreate}
        />
      </Modal>
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="데이터소스 수정"
        size="lg"
      >
        {editing && (
          <DataSourceForm
            initial={editing}
            onCancel={() => setEditing(null)}
            onSubmit={handleUpdate}
          />
        )}
      </Modal>
      <BulkImportModal
        open={importOpen}
        onClose={() => {
          setImportOpen(false);
          void refresh();
        }}
        kind="dataSource"
      />
      <JsonEditModal
        initial={jsonEditing}
        identityValue={jsonEditing?.id ?? null}
        identityKey="id"
        putUrl={jsonEditing ? `/api/mock/datasources/${jsonEditing.id}` : ""}
        entityLabel="데이터소스"
        onClose={() => {
          setJsonEditing(null);
          void refresh();
        }}
      />
    </>
  );
}
