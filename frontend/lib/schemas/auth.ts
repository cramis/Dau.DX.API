// 인증·본인정보 폼들의 Zod 스키마. 클라이언트와 서버 라우트가 공유한다.
import { z } from "zod";

export const ID_REGEX = /^[a-z][a-z0-9]{4,15}$/;
export const PHONE_REGEX = /^010-\d{4}-\d{4}$/;

const passwordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 합니다.")
  .regex(/[~!@#$%^&*()=+]/, "특수문자(~!@#$%^&*()=+) 1개 이상 포함해야 합니다.");

export const loginSchema = z.object({
  id: z.string().regex(ID_REGEX, "영소문자 시작, 5~16자입니다."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    id: z.string().regex(ID_REGEX, "영소문자 시작, 5~16자입니다."),
    password: passwordSchema,
    passwordConfirm: z.string(),
    name: z.string().min(1, "이름을 입력해주세요.").max(50),
    phone: z.string().regex(PHONE_REGEX, "010-XXXX-XXXX 형식이어야 합니다."),
    email: z.string().email("이메일 형식이 아닙니다."),
    org: z.string().min(1, "기관명을 입력해주세요.").max(100),
    dept: z.string().min(1, "부서명을 입력해주세요.").max(100),
    tel: z.string().optional(),
    agreed: z
      .boolean()
      .refine((v) => v === true, "개인정보 수집·이용 동의가 필수입니다."),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "비밀번호가 일치하지 않습니다.",
  });
export type SignupInput = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("이메일 형식이 아닙니다."),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(50),
  phone: z.string().regex(PHONE_REGEX, "010-XXXX-XXXX 형식이어야 합니다."),
  email: z.string().email("이메일 형식이 아닙니다."),
  org: z.string().min(1).max(100),
  dept: z.string().min(1).max(100),
  tel: z.string().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "현재 비밀번호를 입력해주세요."),
    newPassword: passwordSchema,
    newPasswordConfirm: z.string(),
  })
  .refine((d) => d.newPassword === d.newPasswordConfirm, {
    path: ["newPasswordConfirm"],
    message: "신규 비밀번호가 일치하지 않습니다.",
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
