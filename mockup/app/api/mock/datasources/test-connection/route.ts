// 데이터소스 연결 테스트 mock — 호스트의 첫 글자에 따라 결과 분기 (시연 일관성).
//   호스트가 stg / dev / qa / lab 으로 시작하면 75% 확률 실패, 그 외 90% 성공.
//   결정적 시연이 필요할 때는 jdbcUrl 에 "BREAK" 문자열을 포함시키면 항상 실패.
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  jdbcUrl: z.string().min(1),
  dbUser: z.string().min(1),
  dbType: z.enum(["ORACLE", "POSTGRES", "MYSQL"]),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  const { jdbcUrl } = parsed.data;
  const forceFail = jdbcUrl.includes("BREAK");
  const lower = jdbcUrl.toLowerCase();
  const flaky = /(stg|dev|qa|lab)\b/.test(lower);

  // 응답 지연 흉내 — 80~220ms.
  const delay = 80 + Math.floor(Math.random() * 140);
  await new Promise((r) => setTimeout(r, delay));

  const failChance = forceFail ? 1 : flaky ? 0.75 : 0.1;
  const fail = Math.random() < failChance;

  if (fail) {
    return NextResponse.json({
      ok: false,
      message: "CONNECTION_FAILED",
      detail:
        "TCP 연결이 거부되었습니다. 방화벽 또는 호스트네임을 확인하세요.",
      latencyMs: delay,
    });
  }
  return NextResponse.json({
    ok: true,
    message: "CONNECTION_OK",
    detail: `핸드셰이크 성공 (${parsed.data.dbType})`,
    latencyMs: delay,
  });
}
