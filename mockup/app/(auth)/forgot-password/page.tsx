// 비밀번호 찾기 화면. 이메일 입력 → mock 응답을 인라인 배너로 노출(이메일 존재 여부 비노출).
"use client";

import Link from "next/link";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/schemas/auth";

export default function ForgotPasswordPage() {
  const [result, setResult] = useState<
    { variant: "success" | "error"; message: string } | null
  >(null);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setResult(null);
    const res = await fetch("/api/mock/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      setResult({ variant: "error", message: "요청에 실패했습니다. 잠시 후 다시 시도해주세요." });
      return;
    }
    setResult({
      variant: "success",
      message:
        "입력하신 이메일이 등록되어 있다면 재설정 메일을 발송합니다.\n메일함을 확인해주세요.",
    });
    form.reset();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">비밀번호 찾기</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          가입 시 등록한 이메일을 입력하세요.
        </p>
      </div>

      <Form {...form}>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          {result && (
            <FormBanner variant={result.variant}>{result.message}</FormBanner>
          )}

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이메일</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={form.formState.isSubmitting} className="flex-1">
              {form.formState.isSubmitting ? "발송 중..." : "재설정 메일 발송"}
            </Button>
            <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
              로그인으로
            </Link>
          </div>
        </form>
      </Form>
    </div>
  );
}
