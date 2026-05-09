// Day 1 임시 로그인 화면. Day 2 에 react-hook-form 정식 폼으로 교체.
"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const loginAs = (id: string) =>
    startTransition(async () => {
      const res = await fetch("/api/mock/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        alert("로그인 실패 (mock).");
        return;
      }
      router.replace("/api-list");
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">로그인</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Day 1 임시 화면. Day 2 에서 ID/PW 정식 폼으로 교체됩니다.
        </p>
      </div>
      <div className="flex flex-col gap-2 pt-2">
        <Button disabled={pending} onClick={() => loginAs("admin01")}>
          관리자로 로그인 (admin01)
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => loginAs("user01")}>
          일반 사용자로 로그인 (user01)
        </Button>
      </div>
    </div>
  );
}
