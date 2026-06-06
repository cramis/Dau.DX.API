// backend REST 클라이언트 + AI 서비스계정 토큰 수명주기(로그인→만료 30초 전 refresh→재로그인 1회·백오프).
// 무한 재시도 금지 — 5회 로그인 실패 시 서버가 계정을 자동 INACTIVE 처리하므로(02_AI초안등록_PRD §3 R6).

export interface ApiEnvelope<T = unknown> {
  ok: boolean;
  data?: T;
  message?: string;
  issues?: unknown;
}

export class DxapiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issues?: unknown,
  ) {
    super(message);
    this.name = "DxapiError";
  }
}

const REFRESH_MARGIN_MS = 30_000; // 만료 30초 전 갱신
const RELOGIN_BACKOFF_MS = 2_000; // 재로그인 1회 전 대기

export class DxapiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private accessExpMs = 0;

  constructor(
    private readonly baseUrl: string,
    private readonly userId: string,
    private readonly password: string,
  ) {}

  static fromEnv(): DxapiClient {
    const baseUrl = process.env.DXAPI_BASE_URL ?? "http://localhost:8080";
    const userId = process.env.DXAPI_AI_USER ?? "";
    const password = process.env.DXAPI_AI_PASSWORD ?? "";
    if (!userId || !password) {
      // fail-fast — 자격증명 없이 기동하면 도구 호출마다 로그인 실패가 누적돼 계정이 잠긴다.
      throw new Error(
        "DXAPI_AI_USER / DXAPI_AI_PASSWORD 환경변수 필요 (AI 서비스계정. mcp/README.md 참고)",
      );
    }
    return new DxapiClient(baseUrl.replace(/\/+$/, ""), userId, password);
  }

  /** 관리 REST 호출. 토큰 자동 관리. 실패 시 DxapiError(백엔드 message·issues 보존). */
  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    await this.ensureToken();
    let res = await this.fetch(method, path, body);
    if (res.status === 401) {
      // access 무효(서버 재기동·revoke 등) — 재로그인 1회만, 백오프 후
      await sleep(RELOGIN_BACKOFF_MS);
      this.accessToken = null;
      this.refreshToken = null;
      await this.ensureToken();
      res = await this.fetch(method, path, body);
    }
    const env = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
    if (!res.ok || env.ok === false) {
      throw new DxapiError(env.message ?? `HTTP ${res.status}`, res.status, env.issues);
    }
    return env.data as T;
  }

  private async fetch(method: string, path: string, body?: unknown): Promise<Response> {
    return fetch(this.baseUrl + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  private async ensureToken(): Promise<void> {
    const now = Date.now();
    if (this.accessToken && now < this.accessExpMs - REFRESH_MARGIN_MS) {
      return;
    }
    if (this.refreshToken) {
      try {
        await this.doRefresh();
        return;
      } catch {
        // refresh 실패(회전 경합·만료) → 로그인으로 폴백
        this.refreshToken = null;
      }
    }
    await this.doLogin();
  }

  private async doLogin(): Promise<void> {
    const res = await fetch(this.baseUrl + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: this.userId, password: this.password }),
    });
    const env = (await res.json().catch(() => ({}))) as ApiEnvelope<{
      accessToken: string;
      refreshToken: string;
    }>;
    if (!res.ok || !env.ok || !env.data) {
      // 여기서 재시도하지 않는다 — 잘못된 자격증명 반복은 계정 잠금(5회) 유발.
      throw new DxapiError(
        `AI 계정 로그인 실패: ${env.message ?? `HTTP ${res.status}`} (자격증명·계정상태 확인. 반복 시도 금지 — 5회 실패 시 계정 잠금)`,
        res.status,
        env.issues,
      );
    }
    this.setTokens(env.data.accessToken, env.data.refreshToken);
  }

  private async doRefresh(): Promise<void> {
    const res = await fetch(this.baseUrl + "/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });
    const env = (await res.json().catch(() => ({}))) as ApiEnvelope<{
      accessToken: string;
      refreshToken: string;
    }>;
    if (!res.ok || !env.ok || !env.data) {
      throw new DxapiError(env.message ?? `refresh HTTP ${res.status}`, res.status);
    }
    // 회전 — 새 refresh 로 교체
    this.setTokens(env.data.accessToken, env.data.refreshToken ?? this.refreshToken!);
  }

  private setTokens(access: string, refresh: string): void {
    this.accessToken = access;
    this.refreshToken = refresh;
    this.accessExpMs = jwtExpMs(access) ?? Date.now() + 10 * 60_000; // exp 파싱 실패 시 보수적 10분
  }
}

/** JWT payload 의 exp(초) → epoch ms. 서명 검증은 서버 몫 — 만료 시각만 읽는다. */
function jwtExpMs(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
