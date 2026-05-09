// 정식 로그인 화면. react-hook-form + zod 검증 후 mock-jwt 발급.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

export default function LoginPage() {
  const router = useRouter();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { id: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    const res = await fetch("/api/mock/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(ERROR_MESSAGES[data?.message] ?? "로그인에 실패했습니다.");
      return;
    }
    router.replace("/api-list");
    router.refresh();
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
    </div>
  );
}
