// Wanted 디자인 시스템 기반 관리자 콘솔 셸. 사이드바(데스크톱 고정 / 모바일 드로어) + 토픈바 + 메인.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { I, type IconName } from "@/components/design/Icons";
import { ClientIp } from "@/components/design/ClientIp";

type NavKey = "home" | "apis" | "ds" | "ext" | "mon" | "doc" | "appr" | "user" | "set";

const PRIMARY: { k: NavKey; label: string; href: string; icon: IconName }[] = [
  { k: "home", label: "대시보드", href: "/dashboard", icon: "Home" },
  { k: "apis", label: "API 관리", href: "/api-list", icon: "Api" },
  { k: "ds",   label: "데이터소스", href: "/datasource", icon: "Ds" },
  { k: "ext",  label: "연계시스템", href: "/ext-system", icon: "Ext" },
  { k: "mon",  label: "실시간 모니터링", href: "/monitoring", icon: "Mon" },
  { k: "doc",  label: "API 문서", href: "/docs", icon: "Doc" },
];
const SECONDARY: { k: NavKey; label: string; href: string; icon: IconName }[] = [
  { k: "appr", label: "승인 관리", href: "/approvals/api", icon: "Appr" },
  { k: "user", label: "사용자", href: "/users", icon: "User" },
  { k: "set",  label: "설정", href: "/me", icon: "Set" },
];

function isActiveLink(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/" || pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export type ShellUser = { name: string; role: string } | null;

export function AppShell({
  user,
  badges,
  children,
  brandRight,
  env,
  version,
}: {
  user: ShellUser;
  badges?: Partial<Record<NavKey, string | number>>;
  children: ReactNode;
  brandRight?: ReactNode;
  env?: string;
  version?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // 라우트가 바뀌면 모바일 드로어를 자동으로 닫는다.
  useEffect(() => { setOpen(false); }, [pathname]);

  const initial = user?.name?.[0] ?? "A";

  return (
    <div className="w-app">
      <header className="w-topbar">
        <button
          type="button"
          className="w-burger"
          aria-label="메뉴 열기"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <I name="Menu" size={18}/>
        </button>
        <Link href="/dashboard" className="w-brand">
          <span className="w-brand__mark">DX</span>
          <span>Dau.DX.API</span>
          <span className="w-brand__sub">관리자 콘솔</span>
        </Link>
        <div className="w-topbar__spacer" />
        {brandRight}
        <div className="w-topbar__chip"><span className="dot"/>{env ?? "unknown"}</div>
        {version ? <div className="w-topbar__chip">{version}</div> : null}
        {user ? (
          <div className="w-topbar__user">
            <span className="avatar" aria-hidden>{initial}</span>
            <span className="name">
              {user.name}
              <span style={{ marginLeft: 4, fontSize: 11, color: "var(--w-fg-alternative)" }}>
                ({user.role})
              </span>
            </span>
          </div>
        ) : (
          <Link href="/login" className="w-btn w-btn--ghost w-btn--sm">로그인</Link>
        )}
      </header>

      <button
        type="button"
        aria-hidden={!open}
        tabIndex={-1}
        className={`w-sidebar-backdrop ${open ? "is-open" : ""}`}
        onClick={() => setOpen(false)}
      />
      <aside className={`w-sidebar ${open ? "is-open" : ""}`} aria-label="주 메뉴">
        <div className="w-sidebar__group">서비스</div>
        {PRIMARY.map((n) => {
          const active = isActiveLink(pathname, n.href);
          const badge = badges?.[n.k];
          return (
            <Link
              key={n.k}
              href={n.href}
              className={`w-nav-item ${active ? "is-active" : ""}`}
              data-active={active}
            >
              <I name={n.icon}/>
              <span>{n.label}</span>
              {badge != null && <span className="badge">{badge}</span>}
            </Link>
          );
        })}
        <div className="w-sidebar__group">운영</div>
        {SECONDARY.map((n) => {
          const active = isActiveLink(pathname, n.href);
          const badge = badges?.[n.k];
          return (
            <Link
              key={n.k}
              href={n.href}
              className={`w-nav-item ${active ? "is-active" : ""}`}
              data-active={active}
            >
              <I name={n.icon}/>
              <span>{n.label}</span>
              {badge != null && <span className="badge">{badge}</span>}
            </Link>
          );
        })}
        <ClientIp />
      </aside>

      <main className="w-main">{children}</main>
    </div>
  );
}

export function PageHead({
  breadcrumb,
  title,
  sub,
  actions,
}: {
  breadcrumb?: ReactNode[];
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <>
      {breadcrumb && breadcrumb.length > 0 && (
        <div className="w-crumb">
          {breadcrumb.map((b, i) => (
            <span key={i} style={{ display: "inline-flex", gap: 6 }}>
              {i > 0 && <span className="sep">/</span>}
              <span>{b}</span>
            </span>
          ))}
        </div>
      )}
      <div className="w-page-head">
        <div>
          <h1 className="w-page-head__title">{title}</h1>
          {sub && <p className="w-page-head__sub">{sub}</p>}
        </div>
        {actions && <div className="w-page-head__actions">{actions}</div>}
      </div>
    </>
  );
}
