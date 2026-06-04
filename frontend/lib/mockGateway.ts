// 샘플 게이트웨이 라우트가 공유하는 4단 검증 + 호출 이력 기록 헬퍼.
//
//   1) 인증키 (X-Cert-Key 헤더 ↔ extSystem.certKey)
//   2) 클라이언트 IP (X-Forwarded-For ↔ extSystem.allowedIps CIDR/IP)
//   3) 이용 기간 (현재 시각 ↔ extSystem.useBegin..useEnd)
//   4) 매핑 API (apiNo ∈ extSystem.mappedApis)
//
// X-Cert-Key 가 없으면 익명 호출로 간주하고 통과 — Mockup 단계에서 데모/연구용 호출을 쉽게 하기 위함.
// 백엔드에서는 인증키 필수 정책으로 강화될 예정.
import { NextResponse } from "next/server";
import { mockData } from "@/lib/mockData";
import { enqueueCall } from "@/lib/mockHistory";
import type { ApiDef, CallHistory, ExtSystem, HttpMethod } from "@/types/api";

interface VerifyResult {
  ok: boolean;
  errorCode: string | null;
  extSysId: string | null;
  detail?: string;
}

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "127.0.0.1";
}

function parseCidr(s: string): { base: number; bits: number } | null {
  // IPv4 only — 백엔드 결정 시 IPv6 추가 가능.
  const [ip, mask] = s.split("/");
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return null;
  }
  const base =
    ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  const bits = mask === undefined ? 32 : Number(mask);
  if (Number.isNaN(bits) || bits < 0 || bits > 32) return null;
  return { base, bits };
}

function ipInCidr(ip: string, cidr: string): boolean {
  const target = parseCidr(`${ip}/32`);
  const range = parseCidr(cidr);
  if (!target || !range) return false;
  if (range.bits === 0) return true;
  const mask = range.bits === 32 ? 0xffffffff : (~((1 << (32 - range.bits)) - 1)) >>> 0;
  return (target.base & mask) === (range.base & mask);
}

export function verifyExtSystem(
  req: Request,
  apiNo: string,
): VerifyResult {
  const certKey = req.headers.get("x-cert-key");
  if (!certKey) {
    // 익명 — 검증 스킵. extSysId=null 로 기록.
    return { ok: true, errorCode: null, extSysId: null };
  }

  const ext: ExtSystem | undefined = mockData.extSystems.find(
    (e) => e.certKey === certKey,
  );
  if (!ext) {
    return { ok: false, errorCode: "INVALID_CERT_KEY", extSysId: null };
  }

  if (ext.status !== "ACTIVE") {
    return {
      ok: false,
      errorCode: "EXT_SYSTEM_INACTIVE",
      extSysId: ext.id,
    };
  }

  const ip = getClientIp(req);
  const ipOk =
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "::ffff:127.0.0.1" || // localhost 는 시연 편의 위해 허용 (IPv6/IPv4-mapped 포함)
    ext.allowedIps.some((cidr) => ipInCidr(ip, cidr));
  if (!ipOk) {
    return {
      ok: false,
      errorCode: "IP_NOT_ALLOWED",
      extSysId: ext.id,
      detail: `클라이언트 IP ${ip} 는 허용 목록에 없습니다.`,
    };
  }

  const now = new Date();
  if (now < new Date(ext.useBegin) || now > new Date(ext.useEnd)) {
    return {
      ok: false,
      errorCode: "OUT_OF_PERIOD",
      extSysId: ext.id,
    };
  }

  if (!ext.mappedApis.includes(apiNo)) {
    return {
      ok: false,
      errorCode: "API_NOT_MAPPED",
      extSysId: ext.id,
    };
  }

  return { ok: true, errorCode: null, extSysId: ext.id };
}

interface RunOptions {
  apiPath: string; // 예: "sample-user-info"
  method: HttpMethod;
  // 검증 통과 시 실행할 핸들러. 응답 페이로드를 반환.
  handler: (req: Request, api: ApiDef) => Promise<unknown> | unknown;
}

export async function runSampleGateway(
  req: Request,
  opts: RunOptions,
): Promise<NextResponse> {
  const startedAt = Date.now();
  const traceId = `T${startedAt.toString(36).toUpperCase()}${Math.floor(
    Math.random() * 1e6,
  )
    .toString(36)
    .toUpperCase()}`;
  const clientIp = getClientIp(req);

  const api = mockData.apis.find(
    (a) => a.path === opts.apiPath && a.method === opts.method,
  );

  // params(쿼리/바디) 캡처
  const url = new URL(req.url);
  let paramJson = "{}";
  if (opts.method === "GET") {
    const obj: Record<string, string> = {};
    url.searchParams.forEach((v, k) => {
      obj[k] = v;
    });
    paramJson = JSON.stringify(obj);
  } else {
    const body = await req
      .clone()
      .text()
      .catch(() => "");
    paramJson = body || "{}";
  }

  function record(
    statusCode: number,
    errorCode: string | null,
    extSysId: string | null,
  ): CallHistory {
    return enqueueCall({
      calledAt: new Date().toISOString(),
      extSysId,
      apiNo: api?.no ?? null,
      reqPath: opts.apiPath,
      method: opts.method,
      clientIp,
      traceId,
      paramJson,
      statusCode,
      errorCode,
      elapsedMs: Date.now() - startedAt,
    });
  }

  if (!api) {
    record(404, "API_NOT_FOUND", null);
    return NextResponse.json(
      { ok: false, code: "API_NOT_FOUND", traceId },
      { status: 404 },
    );
  }

  if (api.status !== "ACTIVE") {
    record(403, "API_NOT_ACTIVE", null);
    return NextResponse.json(
      { ok: false, code: "API_NOT_ACTIVE", traceId },
      { status: 403 },
    );
  }

  const verify = verifyExtSystem(req, api.no);
  if (!verify.ok) {
    record(403, verify.errorCode, verify.extSysId);
    return NextResponse.json(
      {
        ok: false,
        code: verify.errorCode,
        detail: verify.detail,
        traceId,
      },
      { status: 403 },
    );
  }

  // params 누락 검증 — required 만 확인.
  const parsedParams = (() => {
    try {
      return JSON.parse(paramJson) as Record<string, unknown>;
    } catch {
      return {};
    }
  })();
  const missing = api.params
    .filter((p) => p.required && (parsedParams[p.name] === undefined || parsedParams[p.name] === ""))
    .map((p) => p.name);
  if (missing.length > 0) {
    record(400, "MISSING_PARAM", verify.extSysId);
    return NextResponse.json(
      {
        ok: false,
        code: "MISSING_PARAM",
        detail: `필수 파라미터 누락: ${missing.join(", ")}`,
        traceId,
      },
      { status: 400 },
    );
  }

  try {
    const data = await opts.handler(req, api);
    record(200, null, verify.extSysId);
    return NextResponse.json({ ok: true, data, traceId });
  } catch (err) {
    record(500, "INTERNAL_ERROR", verify.extSysId);
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR", detail: msg, traceId },
      { status: 500 },
    );
  }
}
