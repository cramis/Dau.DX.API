// 헤더의 로그아웃 버튼. Day 2 의 정식 로그아웃 액션 전까지 단순 fetch 로 쿠키만 폐기한다.
"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await fetch("/api/mock/auth/logout", { method: "POST" });
          router.replace("/login");
          router.refresh();
        })
      }
    >
      로그아웃
    </Button>
  );
}
