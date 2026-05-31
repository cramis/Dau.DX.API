// 연계시스템 등록·수정 폼과 mock route 가 공유하는 Zod 스키마.
import { z } from "zod";
import { extSystemStatusSchema } from "@/types/api";

// IP 또는 CIDR. 단순 검증 — 본격 검증은 백엔드에서.
const IP_OR_CIDR_REGEX =
  /^(\d{1,3}\.){3}\d{1,3}(\/(3[0-2]|[12]?\d))?$/;

const baseFields = {
  name: z.string().min(1, "이름을 입력해주세요.").max(100),
  allowedIps: z
    .array(z.string().regex(IP_OR_CIDR_REGEX, "IP 또는 CIDR 형식이어야 합니다."))
    .min(1, "허용 IP 를 1개 이상 입력해주세요."),
  useBegin: z.string().min(1, "이용 시작일을 입력해주세요."),
  useEnd: z.string().min(1, "이용 종료일을 입력해주세요."),
  mappedApis: z.array(z.string()),
  picgName: z.string().optional(),
  picgEmail: z
    .string()
    .email("이메일 형식이 아닙니다.")
    .optional()
    .or(z.literal("")),
  remark: z.string().optional(),
  status: extSystemStatusSchema,
};

const refineDates = (d: { useBegin: string; useEnd: string }) =>
  new Date(d.useEnd) >= new Date(d.useBegin);

export const extSystemCreateSchema = z.object(baseFields).refine(refineDates, {
  path: ["useEnd"],
  message: "이용 종료일은 시작일 이후여야 합니다.",
});
export type ExtSystemCreateInput = z.infer<typeof extSystemCreateSchema>;

export const extSystemUpdateSchema = z.object(baseFields).refine(refineDates, {
  path: ["useEnd"],
  message: "이용 종료일은 시작일 이후여야 합니다.",
});
export type ExtSystemUpdateInput = z.infer<typeof extSystemUpdateSchema>;
