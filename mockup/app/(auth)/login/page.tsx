// 정식 로그인 화면. react-hook-form + zod 검증 후 mock-jwt 발급.
// Wanted 디자인 — .w-auth-card / .w-input / .w-btn / .w-form-banner.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useId } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FormBanner } from "@/components/FormBanner";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "아이디 또는 비밀번호가 올바르지 않습니다.",
  USER_NOT_ACTIVE: "활성화되지 않은 계정입니다. 관리자 승인을 기다려주세요.",
  INVALID_INPUT: "입력값을 다시 확인해주세요.",
};

// Mockup 단계 한정 — Phase 2 의 정식 인증 도입 시 본 패널 통째로 제거.
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
  ADMIN: "w-badge w-badge--admin",
  USER: "w-badge w-badge--user",
  PENDING: "w-badge w-badge--pending",
};

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const idInputId = useId();
  const pwInputId = useId();

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
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
    setValue("id", id, { shouldDirty: true });
    setValue("password", password, { shouldDirty: true });
    clearErrors();
  }

  return (
    <section className="w-auth-card">
      <header className="w-auth-head">
        <h1 className="w-auth-title">로그인</h1>
        <p className="w-auth-sub">Dau.DX.API 관리자/사용자 콘솔.</p>
      </header>

      <form className="w-auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && <FormBanner variant="error">{serverError}</FormBanner>}

        <div className="w-field">
          <label className="w-field__lbl" htmlFor={idInputId}>
            아이디
          </label>
          <input
            id={idInputId}
            type="text"
            autoComplete="username"
            placeholder="영소문자+숫자 5~16자"
            className="w-input"
            {...register("id")}
          />
          {errors.id?.message && (
            <p className="w-field__msg">{errors.id.message}</p>
          )}
        </div>

        <div className="w-field">
          <label className="w-field__lbl" htmlFor={pwInputId}>
            비밀번호
          </label>
          <input
            id={pwInputId}
            type="password"
            autoComplete="current-password"
            className="w-input"
            {...register("password")}
          />
          {errors.password?.message && (
            <p className="w-field__msg">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          className="w-btn w-btn--primary w-btn--lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <div className="w-auth-actions">
        <Link href="/forgot-password">비밀번호 찾기</Link>
        <Link href="/signup">회원가입</Link>
      </div>

      <div className="w-auth-divider">Mockup 데모 계정</div>

      <section
        aria-label="데모 계정"
        data-testid="demo-accounts"
        className="w-auth-demo"
      >
        <div className="w-auth-demo__head">
          <h2 className="w-auth-demo__title">한 번 클릭하면 자동 입력</h2>
          <span className="w-auth-demo__hint">시드 계정</span>
        </div>
        <ul className="w-auth-demo__list">
          {DEMO_ACCOUNTS.map((acc) => (
            <li key={acc.id} className="w-auth-demo__item">
              <button
                type="button"
                onClick={() => fillDemo(acc.id, acc.password)}
                className="w-auth-demo__btn"
              >
                <span className={BADGE_CLS[acc.badge]}>{acc.badge}</span>
                <span className="id">{acc.id}</span>
                <span className="pw">/ {acc.password}</span>
                <span className="name">{acc.display}</span>
              </button>
              <p className="w-auth-demo__note">{acc.note}</p>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
