// 관리자 콘솔 공통 레이아웃 — Wanted 디자인 시스템 셸을 사용한다.
import type { ReactNode } from "react";
import { AppShell } from "@/components/design/AppShell";
import { LogoutButton } from "@/components/LogoutButton";
import { getCurrentUser } from "@/lib/mockAuth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const shellUser = user ? { name: user.name, role: user.role } : null;
  return (
    <AppShell user={shellUser} brandRight={user ? <LogoutButton /> : null}>
      {children}
    </AppShell>
  );
}
