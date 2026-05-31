// 데이터소스 등록·수정 폼과 mock route 가 공유하는 Zod 스키마.
import { z } from "zod";
import { dbTypeSchema } from "@/types/api";

const baseFields = {
  name: z
    .string()
    .min(1, "이름을 입력해주세요.")
    .max(80)
    .regex(/^[A-Z0-9-]+$/, "대문자/숫자/하이픈만 허용합니다."),
  dbType: dbTypeSchema,
  jdbcUrl: z
    .string()
    .min(1, "JDBC URL 을 입력해주세요.")
    .startsWith("jdbc:", "jdbc: 로 시작해야 합니다."),
  dbUser: z.string().min(1, "DB 사용자를 입력해주세요.").max(64),
  poolMin: z.number().int().nonnegative("0 이상이어야 합니다."),
  poolMax: z.number().int().positive("1 이상이어야 합니다."),
  queryTimeoutSec: z.number().int().positive("1 이상이어야 합니다."),
  useYn: z.enum(["Y", "N"]),
};

const refinePool = (d: { poolMin: number; poolMax: number }) =>
  d.poolMax >= d.poolMin;

export const dataSourceCreateSchema = z
  .object(baseFields)
  .refine(refinePool, {
    path: ["poolMax"],
    message: "최대 풀은 최소 풀 이상이어야 합니다.",
  });
export type DataSourceCreateInput = z.infer<typeof dataSourceCreateSchema>;

export const dataSourceUpdateSchema = z
  .object(baseFields)
  .refine(refinePool, {
    path: ["poolMax"],
    message: "최대 풀은 최소 풀 이상이어야 합니다.",
  });
export type DataSourceUpdateInput = z.infer<typeof dataSourceUpdateSchema>;
