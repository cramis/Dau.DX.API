// API 사용 신청 승인 화면. 외부 시스템이 새 API 매핑을 요청한 건들을 검토.
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHead } from "@/components/design/AppShell";
import { I } from "@/components/design/Icons";
import { MetricTile } from "@/components/design/primitives";
import type { ApiDef, Approval, ExtSystem } from "@/types/api";

const TABS = [
  { value: "PENDING", label: "대기" },
  { value: "APPROVED", label: "승인" },
  { value: "REJECTED", label: "반려" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

function statusBadgeCls(s: Approval["status"]) {
  if (s === "PENDING") return "w-badge w-badge--orange";
  if (s === "APPROVED") return "w-badge w-badge--green";
  return "w-badge w-badge--red";
}

export default function Page() {
  const [items, setItems] = useState<Approval[]>([]);
  const [exts, setExts] = useState<ExtSystem[]>([]);
  const [apis, setApis] = useState<ApiDef[]>([]);
  const [tab, setTab] = useState<TabValue>("PENDING");
  const [loaded, setLoaded] = useState(false);

  async function refresh() {
    const [apprRes, extRes, apiRes] = await Promise.all([
      fetch("/api/mock/approvals/api"),
      fetch("/api/mock/ext-systems"),
      fetch("/api/mock/apis"),
    ]);
    const [apprData, extData, apiData] = await Promise.all([
      apprRes.json().catch(() => ({})),
      extRes.json().catch(() => ({})),
      apiRes.json().catch(() => ({})),
    ]);
    if (apprData?.ok) setItems(apprData.items);
    if (extData?.ok) setExts(extData.items);
    if (apiData?.ok) setApis(apiData.items);
    setLoaded(true);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const tabbed = items.filter((a) => a.status === tab);
  const counts = {
    PENDING: items.filter((a) => a.status === "PENDING").length,
    APPROVED: items.filter((a) => a.status === "APPROVED").length,
    REJECTED: items.filter((a) => a.status === "REJECTED").length,
  };

  function extName(id: string) {
    return exts.find((e) => e.id === id)?.name ?? id;
  }
  function apiName(no: string) {
    return apis.find((a) => a.no === no)?.name ?? no;
  }

  async function handleAction(a: Approval, action: "approve" | "reject") {
    const verb = action === "approve" ? "승인" : "반려";
    if (!window.confirm(`이 신청을 ${verb}하시겠습니까?`)) return;
    let body: BodyInit | undefined;
    if (action === "reject") {
      const reason = window.prompt("반려 사유를 입력하세요.", "")?.trim();
      if (reason) body = JSON.stringify({ reason });
    }
    const res = await fetch(`/api/mock/approvals/api/${a.seq}/${action}`, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body,
    });
    if (!res.ok) {
      toast.error(`${verb}에 실패했습니다.`);
      return;
    }
    toast.success(`${verb} 처리되었습니다.`);
    await refresh();
  }

  return (
    <>
      <PageHead
        breadcrumb={["서비스", "API 승인"]}
        title="API 사용 신청 승인"
        sub={`총 ${items.length}건 · 대기 ${counts.PENDING}건`}
      />

      <div className="w-metrics" style={{ marginBottom: 16 }}>
        <MetricTile
          label="대기"
          value={
            <span style={{ color: "var(--w-orange)" }}>{counts.PENDING}</span>
          }
          unit="건"
          delta="검토 필요"
        />
        <MetricTile label="승인" value={counts.APPROVED} unit="건" delta="누적" />
        <MetricTile label="반려" value={counts.REJECTED} unit="건" delta="누적" />
        <MetricTile
          label="평균 처리 시간"
          value="3.2"
          unit="시간"
          delta="목표 4시간 이내"
          deltaTone="up"
        />
      </div>

      <div className="w-card">
        <div className="w-tabs" style={{ paddingTop: 8 }}>
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`w-tab ${tab === t.value ? "is-active" : ""}`}
              onClick={() => setTab(t.value)}
            >
              {t.label} ({counts[t.value]})
            </button>
          ))}
        </div>
        <div className="w-card__body w-card__body--tight">
          <div className="w-tbl-wrap">
            <table className="w-tbl">
              <thead>
                <tr>
                  <th>신청 시스템</th>
                  <th>대상 API</th>
                  <th>사유</th>
                  <th>신청일</th>
                  <th>상태</th>
                  <th style={{ minWidth: 160 }}></th>
                </tr>
              </thead>
              <tbody>
                {tabbed.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="w-empty">
                        <p className="w-empty__title">
                          {loaded
                            ? `${TABS.find((t) => t.value === tab)?.label} 항목이 없습니다`
                            : "불러오는 중…"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tabbed.map((a) => (
                    <tr key={a.seq} className="is-row" data-testid="appr-api-row">
                      <td className="strong">{extName(a.applicantId)}</td>
                      <td>
                        <div>{apiName(a.targetId)}</div>
                        <div className="mono muted" style={{ fontSize: 11 }}>
                          {a.targetId}
                        </div>
                      </td>
                      <td className="muted" style={{ fontSize: 12, maxWidth: 320 }}>
                        {a.reason ?? "—"}
                      </td>
                      <td className="mono" style={{ fontSize: 11.5 }}>
                        {a.appliedAt.slice(0, 16).replace("T", " ")}
                      </td>
                      <td>
                        <span className={statusBadgeCls(a.status)}>{a.status}</span>
                      </td>
                      <td>
                        {a.status === "PENDING" ? (
                          <div style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="w-btn w-btn--primary w-btn--sm"
                              onClick={() => void handleAction(a, "approve")}
                            >
                              <I name="Check" size={12} /> 승인
                            </button>
                            <button
                              type="button"
                              className="w-btn w-btn--danger w-btn--sm"
                              onClick={() => void handleAction(a, "reject")}
                            >
                              <I name="X" size={12} /> 반려
                            </button>
                          </div>
                        ) : (
                          <span className="muted" style={{ fontSize: 11 }}>
                            {a.processedAt
                              ? a.processedAt.slice(0, 16).replace("T", " ")
                              : "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
