// 사용자 가입 승인 화면. PENDING 사용자를 ACTIVE 또는 REJECTED 로 처리.
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHead } from "@/components/design/AppShell";
import { I } from "@/components/design/Icons";
import { MetricTile } from "@/components/design/primitives";
import type { Approval, User } from "@/types/api";

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
  const [users, setUsers] = useState<User[]>([]);
  const [tab, setTab] = useState<TabValue>("PENDING");
  const [loaded, setLoaded] = useState(false);

  async function refresh() {
    const [apprRes, userRes] = await Promise.all([
      fetch("/api/mock/approvals/user"),
      fetch("/api/mock/users"),
    ]);
    const [apprData, userData] = await Promise.all([
      apprRes.json().catch(() => ({})),
      userRes.json().catch(() => ({})),
    ]);
    if (apprData?.ok) setItems(apprData.items);
    if (userData?.ok) setUsers(userData.items);
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

  function getUser(id: string): User | undefined {
    return users.find((u) => u.id === id);
  }

  async function handleAction(a: Approval, action: "approve" | "reject") {
    const verb = action === "approve" ? "승인" : "반려";
    if (!window.confirm(`이 가입 신청을 ${verb}하시겠습니까?`)) return;
    let body: BodyInit | undefined;
    if (action === "reject") {
      const reason = window.prompt("반려 사유를 입력하세요.", "")?.trim();
      if (reason) body = JSON.stringify({ reason });
    }
    const res = await fetch(`/api/mock/approvals/user/${a.seq}/${action}`, {
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
        breadcrumb={["서비스", "사용자 승인"]}
        title="사용자 가입 승인"
        sub={`총 ${items.length}건 · 대기 ${counts.PENDING}건`}
      />

      <div className="w-metrics" style={{ marginBottom: 16 }}>
        <MetricTile
          label="대기"
          value={<span style={{ color: "var(--w-orange)" }}>{counts.PENDING}</span>}
          unit="건"
          delta="검토 필요"
        />
        <MetricTile label="승인" value={counts.APPROVED} unit="건" delta="누적" />
        <MetricTile label="반려" value={counts.REJECTED} unit="건" delta="누적" />
        <MetricTile label="활성 사용자" value={users.filter((u) => u.status === "ACTIVE").length} unit="명" delta="현재" />
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
                  <th>아이디</th>
                  <th>이름</th>
                  <th>기관 / 부서</th>
                  <th>이메일</th>
                  <th>사유</th>
                  <th>신청일</th>
                  <th>상태</th>
                  <th style={{ minWidth: 160 }}></th>
                </tr>
              </thead>
              <tbody>
                {tabbed.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
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
                  tabbed.map((a) => {
                    const u = getUser(a.targetId);
                    return (
                      <tr key={a.seq} className="is-row" data-testid="appr-user-row">
                        <td className="mono strong">{a.targetId}</td>
                        <td>{u?.name ?? "—"}</td>
                        <td style={{ fontSize: 12 }}>
                          {u ? (
                            <>
                              <div>{u.org}</div>
                              <div className="muted">{u.dept}</div>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="mono" style={{ fontSize: 12 }}>
                          {u?.email ?? "—"}
                        </td>
                        <td className="muted" style={{ fontSize: 12, maxWidth: 240 }}>
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
