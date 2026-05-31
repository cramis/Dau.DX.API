// 연계시스템 관리 화면 — 목록 + 등록/수정/삭제 + 인증키 재발급.
"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHead } from "@/components/design/AppShell";
import { I } from "@/components/design/Icons";
import { Modal } from "@/components/design/Modal";
import { MetricTile } from "@/components/design/primitives";
import { BulkImportModal } from "@/components/BulkImportModal";
import { ExtSystemForm } from "@/components/ExtSystemForm";
import { CertKeyDialog } from "@/components/CertKeyDialog";
import { JsonEditModal } from "@/components/JsonEditModal";
import type { ExtSystemCreateInput } from "@/lib/schemas/extSystem";
import type { ApiDef, ExtSystem } from "@/types/api";

function statusBadgeCls(status: ExtSystem["status"]) {
  return status === "ACTIVE" ? "w-badge w-badge--green" : "w-badge w-badge--neutral";
}

function maskKey(k: string): string {
  // "AKAD0001-XXXXXXXX-..." → "AKAD0001-••••••••-•••• …" — 마지막 4글자만 노출.
  if (k.length <= 8) return "••••";
  const head = k.slice(0, 9); // "AKAD0001-"
  const tail = k.slice(-4);
  return `${head}••••••••-••••••••-••••${tail}`;
}

function formatDateRange(begin: string, end: string): string {
  return `${begin.slice(0, 10)} ~ ${end.slice(0, 10)}`;
}

export default function Page() {
  const [systems, setSystems] = useState<ExtSystem[]>([]);
  const [apis, setApis] = useState<ApiDef[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ExtSystem | null>(null);
  const [keyDialog, setKeyDialog] = useState<
    | {
        certKey: string;
        systemName: string;
        variant: "issued" | "regenerated";
      }
    | null
  >(null);
  const [importOpen, setImportOpen] = useState(false);
  const [jsonEditing, setJsonEditing] = useState<ExtSystem | null>(null);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/mock/ext-systems/export");
      if (!res.ok) {
        toast.error("내보내기에 실패했습니다.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ext-systems-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("ext-systems-*.json 다운로드를 시작했습니다.");
    } finally {
      setExporting(false);
    }
  }

  async function refresh() {
    const [esRes, apiRes] = await Promise.all([
      fetch("/api/mock/ext-systems"),
      fetch("/api/mock/apis"),
    ]);
    const [esData, apiData] = await Promise.all([
      esRes.json().catch(() => ({})),
      apiRes.json().catch(() => ({})),
    ]);
    if (esData?.ok) setSystems(esData.items);
    if (apiData?.ok) setApis(apiData.items);
    setLoaded(true);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return systems;
    return systems.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        (e.picgName ?? "").toLowerCase().includes(q),
    );
  }, [systems, search]);

  const activeCount = systems.filter((e) => e.status === "ACTIVE").length;
  const totalMappings = systems.reduce((sum, e) => sum + e.mappedApis.length, 0);

  async function handleCreate(input: ExtSystemCreateInput) {
    const res = await fetch("/api/mock/ext-systems", {
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
    toast.success(`${input.name} 연계시스템을 등록했습니다.`);
    setCreating(false);
    await refresh();
    if (data.freshCertKey) {
      setKeyDialog({
        certKey: data.freshCertKey,
        systemName: input.name,
        variant: "issued",
      });
    }
  }

  async function handleUpdate(input: ExtSystemCreateInput) {
    if (!editing) return;
    const res = await fetch(`/api/mock/ext-systems/${editing.id}`, {
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
    toast.success(`${input.name} 연계시스템을 수정했습니다.`);
    setEditing(null);
    await refresh();
  }

  async function handleDelete(e: ExtSystem) {
    const ok = window.confirm(
      `연계시스템 "${e.name}" 를 삭제하시겠습니까?\n발급된 인증키는 즉시 무효화됩니다.`,
    );
    if (!ok) return;
    const res = await fetch(`/api/mock/ext-systems/${e.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("삭제에 실패했습니다.");
      return;
    }
    toast.success(`${e.name} 연계시스템을 삭제했습니다.`);
    await refresh();
  }

  async function handleRegenerate(e: ExtSystem) {
    const ok = window.confirm(
      `"${e.name}" 의 인증키를 재발급하시겠습니까?\n기존 키는 즉시 무효화되며, 새 키는 한 번만 표시됩니다.`,
    );
    if (!ok) return;
    const res = await fetch(`/api/mock/ext-systems/${e.id}/regenerate-key`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.freshCertKey) {
      toast.error("재발급에 실패했습니다.");
      return;
    }
    await refresh();
    setKeyDialog({
      certKey: data.freshCertKey,
      systemName: e.name,
      variant: "regenerated",
    });
  }

  return (
    <>
      <PageHead
        breadcrumb={["서비스", "연계시스템"]}
        title="연계시스템 관리"
        sub={`${systems.length}개 등록 · 활성 ${activeCount}개`}
        actions={
          <>
            <button
              type="button"
              className="w-btn w-btn--ghost w-btn--sm"
              onClick={() => void handleExport()}
              disabled={exporting}
              data-testid="ext-export-btn"
            >
              <I name="Down" /> JSON 내보내기
            </button>
            <button
              type="button"
              className="w-btn w-btn--ghost w-btn--sm"
              onClick={() => setImportOpen(true)}
              data-testid="ext-import-btn"
            >
              <I name="Plus" /> JSON 가져오기
            </button>
            <button
              className="w-btn w-btn--primary w-btn--sm"
              onClick={() => setCreating(true)}
            >
              <I name="Plus" /> 연계시스템 추가
            </button>
          </>
        }
      />

      <div className="w-metrics" style={{ marginBottom: 16 }}>
        <MetricTile
          label="총 연계시스템"
          value={systems.length}
          delta={`활성 ${activeCount} · 비활성 ${systems.length - activeCount}`}
        />
        <MetricTile
          label="총 매핑 API"
          value={totalMappings}
          unit="건"
          delta="시스템당 평균 2건"
        />
        <MetricTile
          label="만료 임박"
          value={
            systems.filter((e) => {
              const days =
                (new Date(e.useEnd).getTime() - Date.now()) /
                (24 * 60 * 60 * 1000);
              return days >= 0 && days <= 30;
            }).length
          }
          unit="건"
          delta="30일 이내"
          deltaTone="down"
        />
        <MetricTile
          label="인증키 정책"
          value="X-Cert-Key"
          delta="HTTPS 헤더 매칭"
        />
      </div>

      <div className="w-card">
        <div className="w-card__head">
          <h3 className="w-card__title">연계시스템</h3>
          <input
            className="w-input"
            placeholder="이름·ID·담당자 검색…"
            style={{ width: 220 }}
            aria-label="연계시스템 검색"
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
                  <th>인증키</th>
                  <th>이용 기간</th>
                  <th>매핑 API</th>
                  <th>담당자</th>
                  <th>상태</th>
                  <th style={{ minWidth: 220 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="w-empty">
                        <p className="w-empty__title">
                          {loaded
                            ? systems.length === 0
                              ? "등록된 연계시스템이 없습니다"
                              : "검색 결과가 없습니다"
                            : "불러오는 중…"}
                        </p>
                        {loaded && systems.length === 0 && (
                          <p className="w-empty__sub">
                            우측 상단의 "연계시스템 추가" 버튼을 눌러 첫 시스템을
                            등록하세요.
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr key={e.id} className="is-row" data-testid="ext-row">
                      <td>
                        <div className="strong">{e.name}</div>
                        <div className="mono muted" style={{ fontSize: 11 }}>
                          {e.id}
                        </div>
                      </td>
                      <td className="mono" style={{ fontSize: 11.5 }}>
                        {maskKey(e.certKey)}
                      </td>
                      <td className="mono" style={{ fontSize: 11.5 }}>
                        {formatDateRange(e.useBegin, e.useEnd)}
                      </td>
                      <td>{e.mappedApis.length}건</td>
                      <td>
                        {e.picgName ? (
                          <>
                            <div>{e.picgName}</div>
                            {e.picgEmail && (
                              <div
                                className="muted"
                                style={{ fontSize: 11 }}
                              >
                                {e.picgEmail}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className={statusBadgeCls(e.status)}>
                          {e.status === "ACTIVE" ? "활성" : "비활성"}
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
                          <button
                            className="w-btn w-btn--soft w-btn--sm"
                            onClick={() => void handleRegenerate(e)}
                            aria-label={`${e.name} 인증키 재발급`}
                          >
                            <I name="Key" size={12} /> 키 재발급
                          </button>
                          <button
                            className="w-btn w-btn--ghost w-btn--sm"
                            onClick={() => setEditing(e)}
                            aria-label={`${e.name} 수정`}
                          >
                            <I name="Pencil" size={12} /> 수정
                          </button>
                          <button
                            className="w-btn w-btn--ghost w-btn--sm"
                            onClick={() => setJsonEditing(e)}
                            aria-label={`${e.name} JSON 편집`}
                            data-testid="ext-json-edit-btn"
                          >
                            <I name="Pencil" size={12} /> JSON
                          </button>
                          <button
                            className="w-btn w-btn--danger w-btn--sm"
                            onClick={() => void handleDelete(e)}
                            aria-label={`${e.name} 삭제`}
                          >
                            <I name="Trash" size={12} /> 삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="연계시스템 추가"
        size="lg"
      >
        <ExtSystemForm
          initial={null}
          apis={apis}
          onCancel={() => setCreating(false)}
          onSubmit={handleCreate}
        />
      </Modal>
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="연계시스템 수정"
        size="lg"
      >
        {editing && (
          <ExtSystemForm
            initial={editing}
            apis={apis}
            onCancel={() => setEditing(null)}
            onSubmit={handleUpdate}
          />
        )}
      </Modal>

      <CertKeyDialog
        certKey={keyDialog?.certKey ?? null}
        systemName={keyDialog?.systemName ?? ""}
        variant={keyDialog?.variant ?? "issued"}
        onClose={() => setKeyDialog(null)}
      />
      <BulkImportModal
        open={importOpen}
        onClose={() => {
          setImportOpen(false);
          void refresh();
        }}
        kind="extSystem"
      />
      <JsonEditModal
        initial={jsonEditing}
        identityValue={jsonEditing?.id ?? null}
        identityKey="id"
        putUrl={jsonEditing ? `/api/mock/ext-systems/${jsonEditing.id}` : ""}
        entityLabel="연계시스템"
        onClose={() => {
          setJsonEditing(null);
          void refresh();
        }}
      />
    </>
  );
}
