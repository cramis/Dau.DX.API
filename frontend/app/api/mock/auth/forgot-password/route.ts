// 비밀번호 찾기 라우트. 이메일 존재 여부와 무관하게 항상 200 (존재 노출 방지).
import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/schemas/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  // Mockup 단계: 실제 메일 발송 없음. 항상 동일 응답으로 이메일 존재 여부 비노출.
  return NextResponse.json({ ok: true, message: "MAIL_SENT_IF_REGISTERED" });
}
