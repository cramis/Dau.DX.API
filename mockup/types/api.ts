// Mockup 단계 도메인 타입과 Zod 스키마. 백엔드 결정 후 컬럼 매핑은 다시 정렬한다.
import { z } from "zod";

export const userRoleSchema = z.enum(["ADMIN", "USER"]);
export const userStatusSchema = z.enum(["PENDING", "ACTIVE", "REJECTED", "INACTIVE"]);

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  org: z.string(),
  dept: z.string(),
  phone: z.string(),
  tel: z.string().optional(),
  role: userRoleSchema,
  status: userStatusSchema,
  lastLoginAt: z.string().optional(),
});
export type User = z.infer<typeof userSchema>;

export const dbTypeSchema = z.enum(["ORACLE", "POSTGRES", "MYSQL"]);

export const dataSourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  dbType: dbTypeSchema,
  jdbcUrl: z.string(),
  dbUser: z.string(),
  poolMin: z.number().int().nonnegative(),
  poolMax: z.number().int().positive(),
  queryTimeoutSec: z.number().int().positive(),
  useYn: z.enum(["Y", "N"]),
});
export type DataSource = z.infer<typeof dataSourceSchema>;

export const apiStatusSchema = z.enum(["DRAFT", "ACTIVE", "INACTIVE"]);
export const httpMethodSchema = z.enum(["GET", "POST", "PUT", "DELETE"]);

export const apiParamSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "date", "boolean"]),
  required: z.boolean(),
  defaultValue: z.string().optional(),
  desc: z.string().optional(),
});
export type ApiParam = z.infer<typeof apiParamSchema>;

export const apiRespSchema = z.object({
  col: z.string(),
  type: z.string(),
  displayName: z.string().optional(),
  maskRule: z.enum(["none", "name", "phone", "email", "rrn", "card", "addr"]).default("none"),
});
export type ApiResp = z.infer<typeof apiRespSchema>;

export const apiDefSchema = z.object({
  no: z.string(),
  name: z.string(),
  group: z.string(),
  method: httpMethodSchema,
  path: z.string(),
  status: apiStatusSchema,
  dataSrcId: z.string(),
  authRequired: z.boolean(),
  docVisible: z.boolean(),
  sql: z.string(),
  params: z.array(apiParamSchema).default([]),
  resps: z.array(apiRespSchema).default([]),
  desc: z.string().optional(),
});
export type ApiDef = z.infer<typeof apiDefSchema>;

export const extSystemStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const extSystemSchema = z.object({
  id: z.string(),
  name: z.string(),
  certKey: z.string(),
  allowedIps: z.array(z.string()),
  useBegin: z.string(),
  useEnd: z.string(),
  mappedApis: z.array(z.string()),
  picgName: z.string().optional(),
  picgEmail: z.string().optional(),
  remark: z.string().optional(),
  status: extSystemStatusSchema,
});
export type ExtSystem = z.infer<typeof extSystemSchema>;

export const callHistorySchema = z.object({
  seq: z.number(),
  calledAt: z.string(),
  extSysId: z.string().nullable(),
  apiNo: z.string().nullable(),
  reqPath: z.string(),
  method: httpMethodSchema,
  clientIp: z.string(),
  traceId: z.string(),
  paramJson: z.string(),
  statusCode: z.number(),
  errorCode: z.string().nullable(),
  elapsedMs: z.number(),
});
export type CallHistory = z.infer<typeof callHistorySchema>;

export const approvalTypeSchema = z.enum(["USER_SIGNUP", "API_USAGE"]);
export const approvalStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export const approvalSchema = z.object({
  seq: z.number(),
  type: approvalTypeSchema,
  targetId: z.string(),
  applicantId: z.string(),
  reviewerId: z.string().optional(),
  status: approvalStatusSchema,
  reason: z.string().optional(),
  appliedAt: z.string(),
  processedAt: z.string().optional(),
});
export type Approval = z.infer<typeof approvalSchema>;
