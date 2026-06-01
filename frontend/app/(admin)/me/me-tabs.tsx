// 본인 정보의 3탭 컨테이너. 기본정보 / 비밀번호 변경 / 세션.
"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  changePasswordSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type UpdateProfileInput,
} from "@/lib/schemas/auth";
import type { User } from "@/types/api";

type SafeUser = Omit<User, "password">;

export function MeTabs({ initialUser }: { initialUser: SafeUser }) {
  return (
    <Tabs defaultValue="profile" className="max-w-xl">
      <TabsList>
        <TabsTrigger value="profile">기본 정보</TabsTrigger>
        <TabsTrigger value="password">비밀번호 변경</TabsTrigger>
        <TabsTrigger value="session">세션</TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="pt-4">
        <ProfileForm initialUser={initialUser} />
      </TabsContent>
      <TabsContent value="password" className="pt-4">
        <PasswordForm />
      </TabsContent>
      <TabsContent value="session" className="pt-4">
        <SessionPanel />
      </TabsContent>
    </Tabs>
  );
}

function ProfileForm({ initialUser }: { initialUser: SafeUser }) {
  const router = useRouter();
  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: initialUser.name,
      phone: initialUser.phone,
      email: initialUser.email,
      org: initialUser.org,
      dept: initialUser.dept,
      tel: initialUser.tel ?? "",
    },
  });

  async function onSubmit(values: UpdateProfileInput) {
    const res = await fetch("/api/mock/users/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      toast.error("정보 수정에 실패했습니다.");
      return;
    }
    toast.success("정보가 저장되었습니다.");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이름</FormLabel>
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
              <FormLabel>휴대폰번호</FormLabel>
              <FormControl>
                <Input {...field} />
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
              <FormLabel>이메일</FormLabel>
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
              <FormLabel>기관명</FormLabel>
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
              <FormLabel>부서명</FormLabel>
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
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "저장 중..." : "저장"}
        </Button>
      </form>
    </Form>
  );
}

function PasswordForm() {
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      newPasswordConfirm: "",
    },
  });

  async function onSubmit(values: ChangePasswordInput) {
    const res = await fetch("/api/mock/users/me/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data?.message === "WRONG_PASSWORD") {
        form.setError("currentPassword", { message: "현재 비밀번호가 틀립니다." });
        return;
      }
      toast.error("비밀번호 변경에 실패했습니다.");
      return;
    }
    toast.success("비밀번호가 변경되었습니다.");
    form.reset();
  }

  return (
    <Form {...form}>
      <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>현재 비밀번호</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>신규 비밀번호</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPasswordConfirm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>신규 비밀번호 확인</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "변경 중..." : "비밀번호 변경"}
        </Button>
      </form>
    </Form>
  );
}

function SessionPanel() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function logout() {
    startTransition(async () => {
      await fetch("/api/mock/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Mockup 단계에는 단일 세션만 존재합니다. 모든 기기 로그아웃은 Phase 2 에서
        다중 세션 관리 도입 후 활성화됩니다.
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={logout} disabled={pending}>
          {pending ? "로그아웃 중..." : "로그아웃"}
        </Button>
      </div>
    </div>
  );
}
