// 사용자 관리 화면 — admin 전용. 검색·상태 필터 + 상태 토글.
"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHead } from "@/components/design/AppShell";
import { I } from "@/components/design/Icons";
import { MetricTile } from "@/components/design/primitives";
import type { User } from "@/types/api";

const STATUS_LABEL: Record<User["status"], string> = {
  PENDING: "대기",
  ACTIVE: "활성",
  REJECTED: "반려",
  INACTIVE: "비활성",
};

function statusBadgeCls(s: User["status"]) {
  if (s === "ACTIVE") return "w-badge w-badge--green";
  if (s === "PENDING") return "w-badge w-badge--orange";
  if (s === "REJECTED") return "w-badge w-badge--red";
  return "w-badge w-badge--neutral";
}

export default function Page() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | User["status"]>("all");
  const [loaded, setLoaded] = useState(false);
  const [me, setMe] = useState<{ id: string } | null>(null);

  async function refresh() {
    const [listRes, meRes] = await Promise.all([
      fetch("/api/mock/users"),
      fetch("/api/mock/users/me"),
    ]);
    const [listData, meData] = await Promise.all([
      listRes.json().catch(() => ({})),
      meRes.json().catch(() => ({})),
    ]);
    if (listData?.ok) setUsers(listData.items);
    if (meData?.ok) setMe({ id: meData.user.id });
    setLoaded(true);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (q) {
        const hay = `${u.id} ${u.name} ${u.email} ${u.dept} ${u.org}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, search, statusFilter]);

  const counts = {
    total: users.length,
    active: users.filter((u) => u.status === "ACTIVE").length,
    pending: users.filter((u) => u.status === "PENDING").length,
    admin: users.filter((u) => u.role === "ADMIN").length,
  };

  async function handleStatus(u: User, next: User["status"]) {
    const verb =
      next === "ACTIVE"
        ? "활성화"
        : next === "INACTIVE"
        ? "비활성화"
        : next === "REJECTED"
        ? "반려"
        : "대기 전환";
    if (!window.confirm(`${u.name}(${u.id}) 사용자를 ${verb}하시겠습니까?`)) return;
    const res = await fetch(`/api/mock/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(
        data?.message === "CANNOT_UPDATE_SELF"
          ? "본인 계정은 직접 변경할 수 없습니다."
          : "상태 변경에 실패했습니다.",
      );
      return;
    }
    toast.success(`${u.name} 사용자를 ${verb} 처리했습니다.`);
    await refresh();
  }

  return (
    <>
      <PageHead
        breadcrumb={["서비스", "사용자 관리"]}
        title="사용자 관리"
        sub={`총 ${counts.total}명 · 활성 ${counts.active}명 · 관리자 ${counts.admin}명`}
      />

      <div className="w-metrics" style={{ marginBottom: 16 }}>
        <MetricTile label="전체" value={counts.total} unit="명" delta="시스템 등록" />
        <MetricTile
          label="활성"
          value={<span style={{ color: "var(--w-green)" }}>{counts.active}</span>}
          unit="명"
          delta="로그인 가능"
        />
        <MetricTile
          label="대기"
          value={<span style={{ color: "var(--w-orange)" }}>{counts.pending}</span>}
          unit="명"
          delta="승인 필요"
        />
        <MetricTile label="관리자" value={counts.admin} unit="명" delta="ADMIN 권한" />
      </div>

      <div className="w-card">
        <div className="w-card__head" style={{ flexWrap: "wrap", gap: 8 }}>
          <h3 className="w-card__title">사용자 목록</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select
              className="w-select"
              style={{ width: 140 }}
              aria-label="상태 필터"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as typeof statusFilter)
              }
            >
              <option value="all">전체 상태</option>
              <option value="ACTIVE">활성</option>
              <option value="PENDING">대기</option>
              <option value="INACTIVE">비활성</option>
              <option value="REJECTED">반려</option>
            </select>
            <input
              className="w-input"
              style={{ width: 220 }}
              placeholder="아이디·이름·부서 검색"
              aria-label="사용자 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="w-card__body w-card__body--tight">
          <div className="w-tbl-wrap">
            <table className="w-tbl">
              <thead>
                <tr>
                  <th>아이디</th>
                  <th>이름</th>
                  <th>역할</th>
                  <th>기관 / 부서</th>
                  <th>이메일</th>
                  <th>상태</th>
                  <th style={{ minWidth: 200 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="w-empty">
                        <p className="w-empty__title">
                          {loaded ? "조건에 맞는 사용자가 없습니다" : "불러오는 중…"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => {
                    const isSelf = me?.id === u.id;
                    return (
                      <tr key={u.id} className="is-row" data-testid="user-row">
                        <td className="mono strong">{u.id}</td>
                        <td>{u.name}</td>
                        <td>
                          <span
                            className={
                              u.role === "ADMIN"
                                ? "w-badge w-badge--blue"
                                : "w-badge w-badge--neutral"
                            }
                          >
                            {u.role}
                          </span>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          <div>{u.org}</div>
                          <div className="muted">{u.dept}</div>
                        </td>
                        <td className="mono" style={{ fontSize: 12 }}>
                          {u.email}
                        </td>
                        <td>
                          <span className={statusBadgeCls(u.status)}>
                            {STATUS_LABEL[u.status]}
                          </span>
                        </td>
                        <td>
                          {isSelf ? (
                            <span className="muted" style={{ fontSize: 11 }}>
                              본인 계정
                            </span>
                          ) : (
                            <div
                              style={{
                                display: "inline-flex",
                                gap: 4,
                                flexWrap: "wrap",
                              }}
                            >
                              {u.status !== "ACTIVE" && (
                                <button
                                  type="button"
                                  className="w-btn w-btn--primary w-btn--sm"
                                  onClick={() => void handleStatus(u, "ACTIVE")}
                                >
                                  <I name="Check" size={12} /> 활성화
                                </button>
                              )}
                              {u.status === "ACTIVE" && (
                                <button
                                  type="button"
                                  className="w-btn w-btn--ghost w-btn--sm"
                                  onClick={() => void handleStatus(u, "INACTIVE")}
                                >
                                  <I name="Lock" size={12} /> 비활성화
                                </button>
                              )}
                              {u.status === "PENDING" && (
                                <button
                                  type="button"
                                  className="w-btn w-btn--danger w-btn--sm"
                                  onClick={() => void handleStatus(u, "REJECTED")}
                                >
                                  <I name="X" size={12} /> 반려
                                </button>
                              )}
                            </div>
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
