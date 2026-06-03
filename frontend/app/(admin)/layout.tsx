// 관리자 콘솔 공통 레이아웃 — Wanted 디자인 시스템 셸을 사용한다.
import type { ReactNode } from "react";
import { AppShell } from "@/components/design/AppShell";
import { LogoutButton } from "@/components/LogoutButton";
import { getCurrentUser } from "@/lib/mockAuth";
import { BACKEND_URL } from "@/lib/backend";

// 상단 환경/버전 칩 값. 백엔드 /api/_ops/version(공개)에서 활성 프로필(env)·빌드를 읽는다. 실패 시 미표시.
async function fetchVersion(): Promise<{ env?: string; version?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/_ops/version`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.ok) return {};
    return { env: body.data?.env, version: body.data?.build };
  } catch {
    return {};
  }
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [user, { env, version }] = await Promise.all([getCurrentUser(), fetchVersion()]);
  const shellUser = user ? { name: user.name, role: user.role } : null;
  return (
    <AppShell user={shellUser} brandRight={user ? <LogoutButton /> : null} env={env} version={version}>
      {children}
    </AppShell>
  );
}
