// 회원가입 화면. 9개 필드 + 동의 체크박스, ID 중복확인 버튼, 제출 시 PENDING 으로 등록.
// Wanted 디자인 — .w-auth-card--wide / .w-grid-2 / .w-input-row.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useId } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormBanner } from "@/components/FormBanner";
import { signupSchema, type SignupInput } from "@/lib/schemas/auth";

export default function SignupPage() {
  const router = useRouter();
  const [idChecked, setIdChecked] = useState(false);
  const [idCheckOk, setIdCheckOk] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const idInputId = useId();
  const pwInputId = useId();
  const pwConfirmId = useId();
  const nameInputId = useId();
  const phoneInputId = useId();
  const emailInputId = useId();
  const orgInputId = useId();
  const deptInputId = useId();
  const telInputId = useId();
  const agreedInputId = useId();

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      id: "",
      password: "",
      passwordConfirm: "",
      name: "",
      phone: "",
      email: "",
      org: "",
      dept: "",
      tel: "",
      agreed: false,
    },
  });

  async function checkId() {
    setServerError(null);
    setIdCheckOk(false);
    const id = getValues("id");
    if (!id) {
      setError("id", { message: "아이디를 입력해주세요." });
      return;
    }
    const res = await fetch(`/api/mock/users/check-id?id=${encodeURIComponent(id)}`);
    const data = await res.json().catch(() => ({}));
    if (data?.available) {
      // 성공 메시지는 필드 하단에 노출 — 사용자가 다음 단계로 진행 OK.
      clearErrors("id");
      setIdChecked(true);
      setIdCheckOk(true);
    } else {
      // 실패는 필드 하단의 에러 메시지로 노출 — toast 보다 시선이 자연스럽게 머무는 위치.
      setError("id", { message: "이미 사용 중인 아이디입니다." });
      setIdChecked(false);
    }
  }

  async function onSubmit(values: SignupInput) {
    setServerError(null);
    if (!idChecked) {
      setServerError("아이디 중복확인 버튼을 먼저 눌러 주세요.");
      return;
    }
    const res = await fetch("/api/mock/users/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data?.message === "ID_EXISTS") {
        // 중복 확인 이후 다른 사용자가 같은 ID 로 가입한 race 케이스. 필드 하단에 표기.
        setError("id", { message: "이미 사용 중인 아이디입니다." });
        setIdChecked(false);
        setIdCheckOk(false);
        setServerError(
          "선택한 아이디가 이미 사용 중입니다. 다른 아이디로 다시 시도해주세요."
        );
        return;
      }
      setServerError(
        "회원가입에 실패했습니다. 입력값을 확인하고 다시 시도해주세요."
      );
      return;
    }
    toast.success("회원가입 신청이 완료되었습니다. 관리자 승인을 기다려주세요.");
    router.replace("/login");
  }

  return (
    <section className="w-auth-card w-auth-card--wide">
      <header className="w-auth-head">
        <h1 className="w-auth-title">회원가입</h1>
        <p className="w-auth-sub">
          가입 후 관리자 승인이 완료되면 로그인할 수 있습니다.
        </p>
      </header>

      <form className="w-auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && <FormBanner variant="error">{serverError}</FormBanner>}

        <div className="w-field">
          <label className="w-field__lbl" htmlFor={idInputId}>
            아이디 <span className="w-field__req">*</span>
          </label>
          <div className="w-input-row">
            <input
              id={idInputId}
              type="text"
              placeholder="영소문자+숫자 5~16자"
              className="w-input"
              {...register("id", {
                onChange: () => {
                  setIdChecked(false);
                  setIdCheckOk(false);
                },
              })}
            />
            <button
              type="button"
              onClick={checkId}
              className="w-btn w-btn--ghost"
            >
              중복확인
            </button>
          </div>
          {idCheckOk && !errors.id && (
            <p
              data-testid="id-check-ok"
              className="w-field__msg w-field__msg--ok"
            >
              ✓ 사용 가능한 아이디입니다.
            </p>
          )}
          {errors.id?.message && (
            <p className="w-field__msg">{errors.id.message}</p>
          )}
        </div>

        <div className="w-grid-2">
          <div className="w-field">
            <label className="w-field__lbl" htmlFor={pwInputId}>
              비밀번호 <span className="w-field__req">*</span>
            </label>
            <input
              id={pwInputId}
              type="password"
              autoComplete="new-password"
              className="w-input"
              {...register("password")}
            />
            {errors.password?.message && (
              <p className="w-field__msg">{errors.password.message}</p>
            )}
          </div>
          <div className="w-field">
            <label className="w-field__lbl" htmlFor={pwConfirmId}>
              비밀번호 확인 <span className="w-field__req">*</span>
            </label>
            <input
              id={pwConfirmId}
              type="password"
              autoComplete="new-password"
              className="w-input"
              {...register("passwordConfirm")}
            />
            {errors.passwordConfirm?.message && (
              <p className="w-field__msg">{errors.passwordConfirm.message}</p>
            )}
          </div>
        </div>

        <div className="w-grid-2">
          <div className="w-field">
            <label className="w-field__lbl" htmlFor={nameInputId}>
              이름 <span className="w-field__req">*</span>
            </label>
            <input
              id={nameInputId}
              type="text"
              className="w-input"
              {...register("name")}
            />
            {errors.name?.message && (
              <p className="w-field__msg">{errors.name.message}</p>
            )}
          </div>
          <div className="w-field">
            <label className="w-field__lbl" htmlFor={phoneInputId}>
              휴대폰번호 <span className="w-field__req">*</span>
            </label>
            <input
              id={phoneInputId}
              type="text"
              placeholder="010-XXXX-XXXX"
              className="w-input"
              {...register("phone")}
            />
            {errors.phone?.message && (
              <p className="w-field__msg">{errors.phone.message}</p>
            )}
          </div>
        </div>

        <div className="w-field">
          <label className="w-field__lbl" htmlFor={emailInputId}>
            이메일 <span className="w-field__req">*</span>
          </label>
          <input
            id={emailInputId}
            type="email"
            className="w-input"
            {...register("email")}
          />
          {errors.email?.message && (
            <p className="w-field__msg">{errors.email.message}</p>
          )}
        </div>

        <div className="w-grid-2">
          <div className="w-field">
            <label className="w-field__lbl" htmlFor={orgInputId}>
              기관명 <span className="w-field__req">*</span>
            </label>
            <input
              id={orgInputId}
              type="text"
              className="w-input"
              {...register("org")}
            />
            {errors.org?.message && (
              <p className="w-field__msg">{errors.org.message}</p>
            )}
          </div>
          <div className="w-field">
            <label className="w-field__lbl" htmlFor={deptInputId}>
              부서명 <span className="w-field__req">*</span>
            </label>
            <input
              id={deptInputId}
              type="text"
              className="w-input"
              {...register("dept")}
            />
            {errors.dept?.message && (
              <p className="w-field__msg">{errors.dept.message}</p>
            )}
          </div>
        </div>

        <div className="w-field">
          <label className="w-field__lbl" htmlFor={telInputId}>
            전화번호
          </label>
          <input
            id={telInputId}
            type="text"
            placeholder="(선택)"
            className="w-input"
            {...register("tel")}
          />
        </div>

        <label className="w-checkbox-row" htmlFor={agreedInputId}>
          <input
            id={agreedInputId}
            type="checkbox"
            {...register("agreed")}
          />
          <span>개인정보 수집·이용 동의 (필수)</span>
        </label>
        {errors.agreed?.message && (
          <p className="w-field__msg">{errors.agreed.message}</p>
        )}

        <div className="w-input-row" style={{ marginTop: 4 }}>
          <button
            type="submit"
            className="w-btn w-btn--primary w-btn--lg"
            disabled={isSubmitting}
            style={{ flex: 1 }}
          >
            {isSubmitting ? "신청 중..." : "회원가입"}
          </button>
          <Link href="/login" className="w-btn w-btn--ghost w-btn--lg">
            취소
          </Link>
        </div>
      </form>
    </section>
  );
}
