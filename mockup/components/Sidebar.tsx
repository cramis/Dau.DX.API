// 관리자 콘솔 좌측 GNB 사이드바. 12개 메뉴 중 (auth) 3개를 제외한 admin 영역 9개를 노출한다.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

const NAV_ITEMS: NavItem[] = [
  { href: "/api-list", label: "API" },
  { href: "/datasource", label: "데이터소스" },
  { href: "/ext-system", label: "연계시스템" },
  { href: "/monitoring", label: "실시간 모니터링" },
  { href: "/docs", label: "API 문서" },
  { href: "/approvals/api", label: "API 승인" },
  { href: "/approvals/user", label: "사용자 승인" },
  { href: "/users", label: "사용자 관리" },
  { href: "/me", label: "본인 정보" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-56 flex-col gap-1 border-r bg-background p-3">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Menu
      </div>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            data-active={active}
            className={cn(
              "rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
