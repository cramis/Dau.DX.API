// API 등록·수정 폼과 mock route 가 공유하는 Zod 스키마.
import { z } from "zod";
import {
  apiParamSchema,
  apiRespSchema,
  apiStatusSchema,
  httpMethodSchema,
} from "@/types/api";

// path 는 영소문자/숫자/하이픈, 슬래시 없이 1~64자. 백엔드 결정 후 변경 가능.
export const API_PATH_REGEX = /^[a-z][a-z0-9-]{0,63}$/;

const baseApiFields = {
  name: z.string().min(1, "이름을 입력해주세요.").max(100),
  group: z.string().min(1, "그룹을 입력해주세요.").max(50),
  method: httpMethodSchema,
  path: z
    .string()
    .regex(API_PATH_REGEX, "영소문자 시작, 영소문자/숫자/하이픈만 1~64자."),
  status: apiStatusSchema,
  dataSrcId: z.string().min(1, "데이터소스를 선택해주세요."),
  authRequired: z.boolean(),
  docVisible: z.boolean(),
  sql: z.string().min(1, "SQL 을 입력해주세요."),
  desc: z.string().optional(),
  params: z.array(apiParamSchema),
  resps: z.array(apiRespSchema).min(1, "응답 컬럼을 1개 이상 추가해주세요."),
};

export const apiCreateSchema = z.object(baseApiFields);
export type ApiCreateInput = z.infer<typeof apiCreateSchema>;

export const apiUpdateSchema = z.object(baseApiFields);
export type ApiUpdateInput = z.infer<typeof apiUpdateSchema>;
