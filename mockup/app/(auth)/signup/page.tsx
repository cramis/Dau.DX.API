// 회원가입 화면. 9개 필드 + 동의 체크박스, ID 중복확인 버튼, 제출 시 PENDING 으로 등록.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { signupSchema, type SignupInput } from "@/lib/schemas/auth";

export default function SignupPage() {
  const router = useRouter();
  const [idChecked, setIdChecked] = useState(false);
  const [idCheckOk, setIdCheckOk] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<SignupInput>({
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
    const id = form.getValues("id");
    if (!id) {
      form.setError("id", { message: "아이디를 입력해주세요." });
      return;
    }
    const res = await fetch(`/api/mock/users/check-id?id=${encodeURIComponent(id)}`);
    const data = await res.json().catch(() => ({}));
    if (data?.available) {
      // 성공 메시지는 필드 하단 + 폼 상단 양쪽에 노출 — 사용자가 다음 단계로 진행 OK.
      form.clearErrors("id");
      setIdChecked(true);
      setIdCheckOk(true);
    } else {
      // 실패는 필드 하단의 FormMessage 로 노출 — toast 보다 시선이 자연스럽게 머무는 위치.
      form.setError("id", { message: "이미 사용 중인 아이디입니다." });
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
        form.setError("id", { message: "이미 사용 중인 아이디입니다." });
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
    // 회원가입 성공은 다음 화면(로그인)으로 이동하므로 toast 로 흔적만 남김.
    toast.success("회원가입 신청이 완료되었습니다. 관리자 승인을 기다려주세요.");
    router.replace("/login");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">회원가입</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          가입 후 관리자 승인이 완료되면 로그인할 수 있습니다.
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
                <FormLabel>아이디 *</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      placeholder="영소문자+숫자 5~16자"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setIdChecked(false);
                        setIdCheckOk(false);
                      }}
                    />
                  </FormControl>
                  <Button type="button" variant="secondary" onClick={checkId}>
                    중복확인
                  </Button>
                </div>
                {idCheckOk && !form.formState.errors.id && (
                  <p
                    data-testid="id-check-ok"
                    className="text-sm text-green-700 dark:text-green-300"
                  >
                    ✓ 사용 가능한 아이디입니다.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>비밀번호 *</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="passwordConfirm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>비밀번호 확인 *</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이름 *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>휴대폰번호 *</FormLabel>
                <FormControl>
                  <Input placeholder="010-XXXX-XXXX" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이메일 *</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="org"
            render={({ field }) => (
              <FormItem>
                <FormLabel>기관명 *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dept"
            render={({ field }) => (
              <FormItem>
                <FormLabel>부서명 *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>전화번호</FormLabel>
                <FormControl>
                  <Input placeholder="(선택)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="agreed"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(v === true)}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer">
                    개인정보 수집·이용 동의 (필수)
                  </FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={form.formState.isSubmitting} className="flex-1">
              {form.formState.isSubmitting ? "신청 중..." : "회원가입"}
            </Button>
            <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
              취소
            </Link>
          </div>
        </form>
      </Form>
    </div>
  );
}
