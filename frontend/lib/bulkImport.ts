// API 일괄 import/export 헬퍼. envelope 검증 + upsert + 충돌 검사.
//
// 페이로드 형식 (export 가 그대로 import 가능하도록 round-trip):
//   { version: 1, kind: "api", items: [ApiDef-like, ...] }
//
// upsert 규칙:
//   - item.no 가 기존 apis 에 매칭 → update
//   - item.no 가 없거나 매칭 실패 → insert (no 는 자동 생성)
//   - path 는 전역 유니크 — import 셋 내 충돌·기존 apis 와 충돌 모두 거부
//   - dataSrcId 는 현재 mockData.dataSources 에 존재해야 함
//
// 검증-우선 트랜잭션: 한 행이라도 실패하면 전체 반려 (mutation 0).
import { z } from "zod";
import { mockData } from "@/lib/mockData";
import { apiCreateSchema } from "@/lib/schemas/api";
import { generateCertKey } from "@/lib/certKey";
import { dbTypeSchema } from "@/types/api";
import type { ApiDef, DataSource, ExtSystem } from "@/types/api";

export const API_BULK_VERSION = 1;

// 단건 row 스키마 — `no` 는 옵션(누락 시 신규 insert).
const importRowSchema = apiCreateSchema.extend({
  no: z.string().optional(),
});

export const apiImportEnvelopeSchema = z.object({
  version: z.literal(API_BULK_VERSION),
  kind: z.literal("api"),
  items: z.array(importRowSchema).min(1, "items 가 비어있습니다."),
  mode: z.literal("upsert").optional(), // 향후 replace 추가 여지
});

export type ApiImportEnvelope = z.infer<typeof apiImportEnvelopeSchema>;
type ApiImportRow = z.infer<typeof importRowSchema>;

export interface RowResult {
  index: number;
  no?: string;
  action?: "inserted" | "updated";
  ok: boolean;
  error?: string;
  detail?: string;
}

export interface ImportResult {
  ok: boolean;
  summary: { inserted: number; updated: number; failed: number; total: number };
  results: RowResult[];
}

function nextApiNo(existing: ApiDef[]): string {
  const today = new Date();
  const yyyymmdd =
    today.getFullYear().toString() +
    (today.getMonth() + 1).toString().padStart(2, "0") +
    today.getDate().toString().padStart(2, "0");
  const prefix = `A${yyyymmdd}`;
  let max = 0;
  for (const a of existing) {
    if (!a.no.startsWith(prefix)) continue;
    const seq = Number(a.no.slice(prefix.length));
    if (Number.isFinite(seq) && seq > max) max = seq;
  }
  return `${prefix}${(max + 1).toString().padStart(3, "0")}`;
}

/**
 * envelope 을 검증 + plan 만 계산. mutation 은 발생하지 않는다.
 * 실제 적용은 applyApiImportPlan() 에서 수행. UI 의 [검증] 단계가 사용.
 */
export function planApiImport(envelope: ApiImportEnvelope): ImportResult {
  const results: RowResult[] = [];
  const existing = mockData.dataSources.map((d) => d.id);
  const dsValid = new Set(existing);

  // 동일 import 안의 path/no 충돌 사전 검사.
  const pathSeen = new Map<string, number>(); // path → first index
  const noSeen = new Map<string, number>();

  // 미리 신규 no 를 가상으로 채번 (시뮬레이션).
  const simExisting = [...mockData.apis];

  envelope.items.forEach((row, index) => {
    const result: RowResult = { index, no: row.no, ok: true };

    // 동일 import 내 충돌
    if (row.no) {
      const dup = noSeen.get(row.no);
      if (dup !== undefined) {
        result.ok = false;
        result.error = "DUP_NO_IN_PAYLOAD";
        result.detail = `행 ${dup} 와 같은 no(${row.no}) 가 또 있습니다.`;
        results.push(result);
        return;
      }
      noSeen.set(row.no, index);
    }
    const pathDup = pathSeen.get(row.path);
    if (pathDup !== undefined) {
      result.ok = false;
      result.error = "DUP_PATH_IN_PAYLOAD";
      result.detail = `행 ${pathDup} 와 같은 path(${row.path}) 가 또 있습니다.`;
      results.push(result);
      return;
    }
    pathSeen.set(row.path, index);

    // dataSrcId 존재 확인
    if (!dsValid.has(row.dataSrcId)) {
      result.ok = false;
      result.error = "DATASRC_NOT_FOUND";
      result.detail = `dataSrcId "${row.dataSrcId}" 가 존재하지 않습니다.`;
      results.push(result);
      return;
    }

    // upsert 분류
    const matchIdx = row.no
      ? simExisting.findIndex((a) => a.no === row.no)
      : -1;

    if (matchIdx >= 0) {
      // update — path 가 다른 기존 행과 겹치면 안 됨
      const conflict = simExisting.findIndex(
        (a, i) => i !== matchIdx && a.path === row.path,
      );
      if (conflict >= 0) {
        result.ok = false;
        result.error = "PATH_EXISTS";
        result.detail = `path "${row.path}" 가 다른 API(${simExisting[conflict].no}) 와 충돌합니다.`;
        results.push(result);
        return;
      }
      simExisting[matchIdx] = { ...row, no: row.no! } as ApiDef;
      result.action = "updated";
      result.no = row.no!;
    } else {
      // insert — path 가 기존과 충돌하면 안 됨
      const conflict = simExisting.findIndex((a) => a.path === row.path);
      if (conflict >= 0) {
        result.ok = false;
        result.error = "PATH_EXISTS";
        result.detail = `path "${row.path}" 가 기존 API(${simExisting[conflict].no}) 와 충돌합니다.`;
        results.push(result);
        return;
      }
      const newNo = row.no ?? nextApiNo(simExisting);
      simExisting.push({ ...row, no: newNo } as ApiDef);
      result.action = "inserted";
      result.no = newNo;
    }
    results.push(result);
  });

  const failed = results.filter((r) => !r.ok).length;
  const inserted = results.filter((r) => r.ok && r.action === "inserted").length;
  const updated = results.filter((r) => r.ok && r.action === "updated").length;
  return {
    ok: failed === 0,
    summary: {
      inserted,
      updated,
      failed,
      total: envelope.items.length,
    },
    results,
  };
}

/**
 * plan 이 ok 일 때만 호출 — 실제 mockData 에 반영.
 * 실패 시 반환값의 summary/results 를 호출자가 그대로 응답으로 사용.
 */
export function applyApiImportPlan(envelope: ApiImportEnvelope): ImportResult {
  const plan = planApiImport(envelope);
  if (!plan.ok) return plan;

  // 검증 통과 — 실제 적용. plan 결과 순서대로 처리.
  envelope.items.forEach((row, index) => {
    const r = plan.results[index];
    if (!r.ok || !r.action) return;
    if (r.action === "updated") {
      const idx = mockData.apis.findIndex((a) => a.no === r.no);
      if (idx >= 0) {
        mockData.apis[idx] = { ...row, no: r.no! } as ApiDef;
      }
    } else {
      mockData.apis.push({ ...row, no: r.no! } as ApiDef);
    }
  });
  return plan;
}

/**
 * 현재 mockData.apis 를 import 가능한 envelope 으로 직렬화.
 */
export function exportApiEnvelope(): ApiImportEnvelope & {
  exportedAt: string;
  count: number;
} {
  return {
    version: API_BULK_VERSION,
    kind: "api",
    items: mockData.apis.map((a) => ({ ...a })),
    exportedAt: new Date().toISOString(),
    count: mockData.apis.length,
  };
}

// ---------- DataSource ----------

const dsImportRowSchema = z
  .object({
    id: z.string().optional(),
    name: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[A-Z0-9-]+$/, "대문자/숫자/하이픈만 허용합니다."),
    dbType: dbTypeSchema,
    jdbcUrl: z.string().min(1).startsWith("jdbc:", "jdbc: 로 시작해야 합니다."),
    dbUser: z.string().min(1).max(64),
    poolMin: z.number().int().nonnegative(),
    poolMax: z.number().int().positive(),
    queryTimeoutSec: z.number().int().positive(),
    useYn: z.enum(["Y", "N"]),
  })
  .refine((d) => d.poolMax >= d.poolMin, {
    path: ["poolMax"],
    message: "최대 풀은 최소 풀 이상이어야 합니다.",
  });

export const dataSourceImportEnvelopeSchema = z.object({
  version: z.literal(API_BULK_VERSION),
  kind: z.literal("dataSource"),
  items: z.array(dsImportRowSchema).min(1, "items 가 비어있습니다."),
  mode: z.literal("upsert").optional(),
});
export type DataSourceImportEnvelope = z.infer<
  typeof dataSourceImportEnvelopeSchema
>;
type DsImportRow = z.infer<typeof dsImportRowSchema>;

function nextDsId(existing: DataSource[]): string {
  const t = new Date();
  const ymd =
    t.getFullYear().toString() +
    (t.getMonth() + 1).toString().padStart(2, "0") +
    t.getDate().toString().padStart(2, "0");
  const prefix = `DS${ymd}`;
  let max = 0;
  for (const d of existing) {
    if (!d.id.startsWith(prefix)) continue;
    const seq = Number(d.id.slice(prefix.length));
    if (Number.isFinite(seq) && seq > max) max = seq;
  }
  return `${prefix}${(max + 1).toString().padStart(3, "0")}`;
}

export function planDataSourceImport(
  envelope: DataSourceImportEnvelope,
): ImportResult {
  const results: RowResult[] = [];
  const idSeen = new Map<string, number>();
  const nameSeen = new Map<string, number>();
  const sim: DataSource[] = [...mockData.dataSources];

  envelope.items.forEach((row, index) => {
    const result: RowResult = { index, no: row.id, ok: true };

    if (row.id) {
      const dup = idSeen.get(row.id);
      if (dup !== undefined) {
        result.ok = false;
        result.error = "DUP_ID_IN_PAYLOAD";
        result.detail = `행 ${dup} 와 같은 id(${row.id}) 가 또 있습니다.`;
        results.push(result);
        return;
      }
      idSeen.set(row.id, index);
    }
    const nameDup = nameSeen.get(row.name);
    if (nameDup !== undefined) {
      result.ok = false;
      result.error = "DUP_NAME_IN_PAYLOAD";
      result.detail = `행 ${nameDup} 와 같은 name(${row.name}) 가 또 있습니다.`;
      results.push(result);
      return;
    }
    nameSeen.set(row.name, index);

    const matchIdx = row.id ? sim.findIndex((d) => d.id === row.id) : -1;

    if (matchIdx >= 0) {
      const conflict = sim.findIndex(
        (d, i) => i !== matchIdx && d.name === row.name,
      );
      if (conflict >= 0) {
        result.ok = false;
        result.error = "NAME_EXISTS";
        result.detail = `name "${row.name}" 가 다른 데이터소스(${sim[conflict].id}) 와 충돌합니다.`;
        results.push(result);
        return;
      }
      sim[matchIdx] = { id: row.id!, ...row } as DataSource;
      result.action = "updated";
      result.no = row.id!;
    } else {
      const conflict = sim.findIndex((d) => d.name === row.name);
      if (conflict >= 0) {
        result.ok = false;
        result.error = "NAME_EXISTS";
        result.detail = `name "${row.name}" 가 기존 데이터소스(${sim[conflict].id}) 와 충돌합니다.`;
        results.push(result);
        return;
      }
      const newId = row.id ?? nextDsId(sim);
      sim.push({ ...row, id: newId } as DataSource);
      result.action = "inserted";
      result.no = newId;
    }
    results.push(result);
  });

  const failed = results.filter((r) => !r.ok).length;
  const inserted = results.filter((r) => r.ok && r.action === "inserted").length;
  const updated = results.filter((r) => r.ok && r.action === "updated").length;
  return {
    ok: failed === 0,
    summary: { inserted, updated, failed, total: envelope.items.length },
    results,
  };
}

export function applyDataSourceImportPlan(
  envelope: DataSourceImportEnvelope,
): ImportResult {
  const plan = planDataSourceImport(envelope);
  if (!plan.ok) return plan;

  envelope.items.forEach((row, index) => {
    const r = plan.results[index];
    if (!r.ok || !r.action) return;
    if (r.action === "updated") {
      const idx = mockData.dataSources.findIndex((d) => d.id === r.no);
      if (idx >= 0) {
        mockData.dataSources[idx] = { id: r.no!, ...row } as DataSource;
      }
    } else {
      mockData.dataSources.push({ id: r.no!, ...row } as DataSource);
    }
  });
  return plan;
}

export function exportDataSourceEnvelope(): DataSourceImportEnvelope & {
  exportedAt: string;
  count: number;
} {
  return {
    version: API_BULK_VERSION,
    kind: "dataSource",
    items: mockData.dataSources.map((d) => ({ ...d })),
    exportedAt: new Date().toISOString(),
    count: mockData.dataSources.length,
  };
}

// ---------- ExtSystem ----------
//
// certKey 정책 (라운드트립 + 1회 노출 정책의 절충):
//   - export: 시드 평문 그대로 포함 (admin 전용 다운로드라 정책상 허용)
//   - import insert + certKey 누락 → 자동 발급
//   - import insert + certKey 명시 → 그대로 사용 (이관 시나리오)
//   - import update + certKey 누락 → 기존 키 유지
//   - import update + certKey 명시 → 새 키로 교체

const IP_OR_CIDR_REGEX = /^(\d{1,3}\.){3}\d{1,3}(\/(3[0-2]|[12]?\d))?$/;

const extImportRowSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1).max(100),
    certKey: z.string().optional(),
    allowedIps: z
      .array(
        z.string().regex(IP_OR_CIDR_REGEX, "IP 또는 CIDR 형식이어야 합니다."),
      )
      .min(1),
    useBegin: z.string().min(1),
    useEnd: z.string().min(1),
    mappedApis: z.array(z.string()),
    picgName: z.string().optional(),
    picgEmail: z
      .string()
      .email()
      .optional()
      .or(z.literal("")),
    remark: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
  })
  .refine((d) => new Date(d.useEnd) >= new Date(d.useBegin), {
    path: ["useEnd"],
    message: "이용 종료일은 시작일 이후여야 합니다.",
  });

export const extSystemImportEnvelopeSchema = z.object({
  version: z.literal(API_BULK_VERSION),
  kind: z.literal("extSystem"),
  items: z.array(extImportRowSchema).min(1, "items 가 비어있습니다."),
  mode: z.literal("upsert").optional(),
});
export type ExtSystemImportEnvelope = z.infer<
  typeof extSystemImportEnvelopeSchema
>;
type ExtImportRow = z.infer<typeof extImportRowSchema>;

function nextExtId(existing: ExtSystem[]): string {
  const t = new Date();
  const ymd =
    t.getFullYear().toString() +
    (t.getMonth() + 1).toString().padStart(2, "0") +
    t.getDate().toString().padStart(2, "0");
  const prefix = `E${ymd}`;
  let max = 0;
  for (const e of existing) {
    if (!e.id.startsWith(prefix)) continue;
    const seq = Number(e.id.slice(prefix.length));
    if (Number.isFinite(seq) && seq > max) max = seq;
  }
  return `${prefix}${(max + 1).toString().padStart(3, "0")}`;
}

export function planExtSystemImport(
  envelope: ExtSystemImportEnvelope,
): ImportResult {
  const results: RowResult[] = [];
  const idSeen = new Map<string, number>();
  const nameSeen = new Map<string, number>();
  const sim: ExtSystem[] = [...mockData.extSystems];
  const knownApis = new Set(mockData.apis.map((a) => a.no));

  envelope.items.forEach((row, index) => {
    const result: RowResult = { index, no: row.id, ok: true };

    if (row.id) {
      const dup = idSeen.get(row.id);
      if (dup !== undefined) {
        result.ok = false;
        result.error = "DUP_ID_IN_PAYLOAD";
        result.detail = `행 ${dup} 와 같은 id(${row.id}) 가 또 있습니다.`;
        results.push(result);
        return;
      }
      idSeen.set(row.id, index);
    }
    const nameDup = nameSeen.get(row.name);
    if (nameDup !== undefined) {
      result.ok = false;
      result.error = "DUP_NAME_IN_PAYLOAD";
      result.detail = `행 ${nameDup} 와 같은 name(${row.name}) 가 또 있습니다.`;
      results.push(result);
      return;
    }
    nameSeen.set(row.name, index);

    // mappedApis FK 검사 — 모든 항목이 기존 apis 에 있어야 함.
    const missing = row.mappedApis.filter((no) => !knownApis.has(no));
    if (missing.length > 0) {
      result.ok = false;
      result.error = "MAPPED_API_NOT_FOUND";
      result.detail = `다음 API 가 존재하지 않습니다: ${missing.join(", ")}`;
      results.push(result);
      return;
    }

    const matchIdx = row.id ? sim.findIndex((e) => e.id === row.id) : -1;

    if (matchIdx >= 0) {
      const conflict = sim.findIndex(
        (e, i) => i !== matchIdx && e.name === row.name,
      );
      if (conflict >= 0) {
        result.ok = false;
        result.error = "NAME_EXISTS";
        result.detail = `name "${row.name}" 가 다른 연계시스템(${sim[conflict].id}) 와 충돌합니다.`;
        results.push(result);
        return;
      }
      // certKey 누락 시 기존 키 유지
      const certKey = row.certKey ?? sim[matchIdx].certKey;
      sim[matchIdx] = { ...row, id: row.id!, certKey } as ExtSystem;
      result.action = "updated";
      result.no = row.id!;
    } else {
      const conflict = sim.findIndex((e) => e.name === row.name);
      if (conflict >= 0) {
        result.ok = false;
        result.error = "NAME_EXISTS";
        result.detail = `name "${row.name}" 가 기존 연계시스템(${sim[conflict].id}) 와 충돌합니다.`;
        results.push(result);
        return;
      }
      const newId = row.id ?? nextExtId(sim);
      const certKey = row.certKey ?? generateCertKey(newId);
      sim.push({ ...row, id: newId, certKey } as ExtSystem);
      result.action = "inserted";
      result.no = newId;
    }
    results.push(result);
  });

  const failed = results.filter((r) => !r.ok).length;
  const inserted = results.filter((r) => r.ok && r.action === "inserted").length;
  const updated = results.filter((r) => r.ok && r.action === "updated").length;
  return {
    ok: failed === 0,
    summary: { inserted, updated, failed, total: envelope.items.length },
    results,
  };
}

export function applyExtSystemImportPlan(
  envelope: ExtSystemImportEnvelope,
): ImportResult {
  const plan = planExtSystemImport(envelope);
  if (!plan.ok) return plan;

  envelope.items.forEach((row, index) => {
    const r = plan.results[index];
    if (!r.ok || !r.action) return;
    if (r.action === "updated") {
      const idx = mockData.extSystems.findIndex((e) => e.id === r.no);
      if (idx >= 0) {
        const certKey = row.certKey ?? mockData.extSystems[idx].certKey;
        mockData.extSystems[idx] = { ...row, id: r.no!, certKey } as ExtSystem;
      }
    } else {
      const certKey = row.certKey ?? generateCertKey(r.no!);
      mockData.extSystems.push({ ...row, id: r.no!, certKey } as ExtSystem);
    }
  });
  return plan;
}

export function exportExtSystemEnvelope(): ExtSystemImportEnvelope & {
  exportedAt: string;
  count: number;
} {
  return {
    version: API_BULK_VERSION,
    kind: "extSystem",
    items: mockData.extSystems.map((e) => ({ ...e })),
    exportedAt: new Date().toISOString(),
    count: mockData.extSystems.length,
  };
}
