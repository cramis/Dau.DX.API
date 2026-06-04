// 비밀번호 찾기 화면. 이메일 입력 → mock 응답을 인라인 배너로 노출(이메일 존재 여부 비노출).
// Wanted 디자인 — .w-auth-card / .w-input / .w-form-banner.
"use client";

import Link from "next/link";
import { useState, useId } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FormBanner } from "@/components/FormBanner";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/schemas/auth";

export default function ForgotPasswordPage() {
  const [result, setResult] = useState<
    { variant: "success" | "error"; message: string } | null
  >(null);
  const emailInputId = useId();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
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
      setResult({
        variant: "error",
        message: "요청에 실패했습니다. 잠시 후 다시 시도해주세요.",
      });
      return;
    }
    setResult({
      variant: "success",
      message:
        "입력하신 이메일이 등록되어 있다면 재설정 메일을 발송합니다.\n메일함을 확인해주세요.",
    });
    reset();
  }

  return (
    <section className="w-auth-card">
      <header className="w-auth-head">
        <h1 className="w-auth-title">비밀번호 찾기</h1>
        <p className="w-auth-sub">가입 시 등록한 이메일을 입력하세요.</p>
      </header>

      <form className="w-auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {result && (
          <FormBanner variant={result.variant}>{result.message}</FormBanner>
        )}

        <div className="w-field">
          <label className="w-field__lbl" htmlFor={emailInputId}>
            이메일
          </label>
          <input
            id={emailInputId}
            type="email"
            autoComplete="email"
            className="w-input"
            {...register("email")}
          />
          {errors.email?.message && (
            <p className="w-field__msg">{errors.email.message}</p>
          )}
        </div>

        <div className="w-input-row" style={{ marginTop: 4 }}>
          <button
            type="submit"
            className="w-btn w-btn--primary w-btn--lg"
            disabled={isSubmitting}
            style={{ flex: 1 }}
          >
            {isSubmitting ? "발송 중..." : "재설정 메일 발송"}
          </button>
          <Link href="/login" className="w-btn w-btn--ghost w-btn--lg">
            로그인으로
          </Link>
        </div>
      </form>
    </section>
  );
}
