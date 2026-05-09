// 관리자/사용자 콘솔 공통 레이아웃. 헤더 + 좌측 사이드바 + 메인 컨테이너.
import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Sidebar } from "@/components/Sidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-muted/20">{children}</main>
      </div>
    </div>
  );
}
