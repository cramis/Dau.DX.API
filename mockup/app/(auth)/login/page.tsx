// 정식 로그인 화면. react-hook-form + zod 검증 후 mock-jwt 발급.
// 서버 에러는 인라인 배너(영구 노출)로, 데모 계정은 하단 패널에서 한 번 클릭으로 채워진다.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormBanner } from "@/components/FormBanner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "아이디 또는 비밀번호가 올바르지 않습니다.",
  USER_NOT_ACTIVE: "활성화되지 않은 계정입니다. 관리자 승인을 기다려주세요.",
  INVALID_INPUT: "입력값을 다시 확인해주세요.",
};

// Mockup 단계 한정 — Phase 2 의 정식 인증 도입 시 본 패널 통째로 제거.
// `lib/mockData.ts` 의 시드와 동기화 필요.
const DEMO_ACCOUNTS: Array<{
  id: string;
  password: string;
  display: string;
  note: string;
  badge: "ADMIN" | "USER" | "PENDING";
}> = [
  {
    id: "admin01",
    password: "admin01!",
    display: "관리자",
    note: "API 등록·승인·사용자 관리 등 전체 권한",
    badge: "ADMIN",
  },
  {
    id: "user01",
    password: "user01!",
    display: "홍길동",
    note: "일반 사용자 — 본인정보·문서·신청 흐름",
    badge: "USER",
  },
  {
    id: "user02",
    password: "user02!",
    display: "김신청",
    note: "PENDING — 활성화 전 로그인 차단 검증용",
    badge: "PENDING",
  },
];

const BADGE_CLS: Record<"ADMIN" | "USER" | "PENDING", string> = {
  ADMIN: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  USER: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
  PENDING:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
};

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { id: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    const res = await fetch("/api/mock/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(
        ERROR_MESSAGES[data?.message] ?? "로그인에 실패했습니다."
      );
      return;
    }
    router.replace("/api-list");
    router.refresh();
  }

  function fillDemo(id: string, password: string) {
    setServerError(null);
    form.setValue("id", id, { shouldDirty: true });
    form.setValue("password", password, { shouldDirty: true });
    // 시각적 확인 위해 즉시 검증 — 정상값이면 에러 메시지가 사라진다.
    form.clearErrors();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">로그인</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dau.DX.API 관리자/사용자 콘솔
        </p>
      </div>

      <Form {...form}>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          {serverError && <FormBanner variant="error">{serverError}</FormBanner>}

          <FormField
            control={form.control}
            name="id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>아이디</FormLabel>
                <FormControl>
                  <Input autoComplete="username" placeholder="영소문자+숫자 5~16자" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>비밀번호</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "로그인 중..." : "로그인"}
          </Button>
        </form>
      </Form>

      <div className="flex justify-between text-sm">
        <Link className="text-muted-foreground hover:text-foreground" href="/forgot-password">
          비밀번호 찾기
        </Link>
        <Link className="text-muted-foreground hover:text-foreground" href="/signup">
          회원가입
        </Link>
      </div>

      <section
        aria-label="데모 계정"
        data-testid="demo-accounts"
        className="rounded-md border border-dashed bg-muted/30 p-3"
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mockup 데모 계정
          </h2>
          <span className="text-[10px] text-muted-foreground">
            클릭 시 자동 입력
          </span>
        </div>
        <ul className="flex flex-col gap-1.5">
          {DEMO_ACCOUNTS.map((acc) => (
            <li key={acc.id}>
              <button
                type="button"
                onClick={() => fillDemo(acc.id, acc.password)}
                className="group flex w-full items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-left text-xs transition-colors hover:border-foreground/40 hover:bg-accent/40"
              >
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${BADGE_CLS[acc.badge]}`}
                >
                  {acc.badge}
                </span>
                <span className="font-mono font-medium text-foreground">
                  {acc.id}
                </span>
                <span className="font-mono text-muted-foreground">
                  / {acc.password}
                </span>
                <span className="ml-auto truncate text-[11px] text-muted-foreground group-hover:text-foreground">
                  {acc.display}
                </span>
              </button>
              <p className="mt-0.5 pl-2 text-[10px] text-muted-foreground">
                {acc.note}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
