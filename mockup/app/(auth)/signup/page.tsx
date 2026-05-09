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
    const id = form.getValues("id");
    if (!id) {
      form.setError("id", { message: "아이디를 입력해주세요." });
      return;
    }
    const res = await fetch(`/api/mock/users/check-id?id=${encodeURIComponent(id)}`);
    const data = await res.json().catch(() => ({}));
    if (data?.available) {
      toast.success("사용 가능한 아이디입니다.");
      setIdChecked(true);
    } else {
      toast.error("이미 사용 중인 아이디입니다.");
      setIdChecked(false);
    }
  }

  async function onSubmit(values: SignupInput) {
    if (!idChecked) {
      toast.error("아이디 중복확인을 먼저 해주세요.");
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
        toast.error("이미 사용 중인 아이디입니다.");
        setIdChecked(false);
        return;
      }
      toast.error("회원가입에 실패했습니다.");
      return;
    }
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
                      }}
                    />
                  </FormControl>
                  <Button type="button" variant="secondary" onClick={checkId}>
                    중복확인
                  </Button>
                </div>
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
