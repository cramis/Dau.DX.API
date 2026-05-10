// 인메모리 호출 이력 큐. sample GW 라우트에서 enqueue, monitoring 라우트에서 query.
// HMR 으로 모듈이 재로드되어도 큐가 유지되도록 globalThis 에 보관한다.
import type { CallHistory } from "@/types/api";

const MAX_ENTRIES = 500;

interface CallStore {
  entries: CallHistory[]; // 최신이 앞.
  seq: number;
}

const GLOBAL_KEY = "__dauDxApiCallStore__";
type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: CallStore };
const g = globalThis as GlobalWithStore;
const store: CallStore = g[GLOBAL_KEY] ?? (g[GLOBAL_KEY] = { entries: [], seq: 0 });

export function enqueueCall(entry: Omit<CallHistory, "seq">): CallHistory {
  store.seq += 1;
  const next: CallHistory = { ...entry, seq: store.seq };
  store.entries.unshift(next);
  if (store.entries.length > MAX_ENTRIES) {
    store.entries.length = MAX_ENTRIES;
  }
  return next;
}

interface ListOptions {
  q?: string;
  statusCode?: number;
  apiNo?: string;
  extSysId?: string;
  fromIso?: string;
  toIso?: string;
  limit?: number;
}

export function listCalls(opts: ListOptions = {}): CallHistory[] {
  const { q, statusCode, apiNo, extSysId, fromIso, toIso, limit = 200 } = opts;
  const ql = q?.trim().toLowerCase() ?? "";
  return store.entries
    .filter((e) => {
      if (statusCode !== undefined && e.statusCode !== statusCode) return false;
      if (apiNo && e.apiNo !== apiNo) return false;
      if (extSysId && e.extSysId !== extSysId) return false;
      if (fromIso && e.calledAt < fromIso) return false;
      if (toIso && e.calledAt > toIso) return false;
      if (ql) {
        const hay =
          `${e.reqPath} ${e.traceId} ${e.clientIp} ${e.errorCode ?? ""} ${
            e.paramJson
          }`.toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    })
    .slice(0, limit);
}

export function findByTrace(traceId: string): CallHistory | undefined {
  return store.entries.find((e) => e.traceId === traceId);
}

export function statsSnapshot(windowMin = 60) {
  const now = Date.now();
  const since = now - windowMin * 60_000;
  const inWindow = store.entries.filter(
    (e) => new Date(e.calledAt).getTime() >= since,
  );
  const total = inWindow.length;
  const success = inWindow.filter(
    (e) => e.statusCode >= 200 && e.statusCode < 300,
  ).length;
  const errors = inWindow.filter((e) => e.statusCode >= 400).length;
  const lats = inWindow
    .map((e) => e.elapsedMs)
    .sort((a, b) => a - b);
  const p95 =
    lats.length === 0 ? 0 : lats[Math.min(lats.length - 1, Math.floor(lats.length * 0.95))];
  const successRate = total === 0 ? 100 : Math.round((success / total) * 1000) / 10;

  // 분당 시리즈 (최근 windowMin 분, 1분 bucket)
  // 2xx / 4xx / 5xx 분리 시리즈 + (호환용) seriesOk / seriesErr 합산.
  const series2xx: number[] = Array(windowMin).fill(0);
  const series4xx: number[] = Array(windowMin).fill(0);
  const series5xx: number[] = Array(windowMin).fill(0);
  for (const e of inWindow) {
    const t = new Date(e.calledAt).getTime();
    const bucket = Math.floor((t - since) / 60_000);
    if (bucket < 0 || bucket >= windowMin) continue;
    if (e.statusCode >= 500) series5xx[bucket] += 1;
    else if (e.statusCode >= 400) series4xx[bucket] += 1;
    else if (e.statusCode >= 200 && e.statusCode < 300) series2xx[bucket] += 1;
  }
  const seriesOk = series2xx;
  const seriesErr = series4xx.map((v, i) => v + series5xx[i]);

  // 5xx 비율
  const errors5xx = inWindow.filter((e) => e.statusCode >= 500).length;
  const errorRate5xx =
    total === 0 ? 0 : Math.round((errors5xx / total) * 1000) / 10;

  return {
    total,
    success,
    errors,
    errors5xx,
    errorRate5xx,
    p95,
    successRate,
    series2xx,
    series4xx,
    series5xx,
    seriesOk,
    seriesErr,
  };
}

export function resetCallStore(): void {
  store.entries.length = 0;
  store.seq = 0;
}
