// H3 (데이터소스 hot-swap) 화면용 부가 메타데이터. mockData.dataSources 와 매핑되는 풀 사용률·지연·매핑 API 수.

export type DsRuntimeMeta = {
  pool: string;
  poolPct: number;
  latencyMs: number;
  status: "정상" | "주의" | "심각";
  apiCount: number;
};

export const DS_RUNTIME_META: Record<string, DsRuntimeMeta> = {
  DS20260509001: { pool: "30/50", poolPct: 60, latencyMs: 4,  status: "정상", apiCount: 48 },
  DS20260509002: { pool: "49/50", poolPct: 98, latencyMs: 12, status: "주의", apiCount: 36 },
  DS20260509003: { pool: "8/30",  poolPct: 27, latencyMs: 3,  status: "정상", apiCount: 14 },
  DS20260509004: { pool: "12/30", poolPct: 40, latencyMs: 6,  status: "정상", apiCount: 22 },
  DS20260509005: { pool: "5/20",  poolPct: 25, latencyMs: 8,  status: "정상", apiCount: 0 },
};

export const POOL_HISTORY_LMS = [20, 22, 28, 30, 32, 40, 48, 52, 58, 62, 72, 84, 90, 92, 94, 96, 97, 98, 98];
