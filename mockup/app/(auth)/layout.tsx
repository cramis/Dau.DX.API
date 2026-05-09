// 비로그인 화면(로그인/회원가입/비밀번호찾기) 의 중앙 정렬 컨테이너.
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
