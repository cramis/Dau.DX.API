// 샘플 GW — 알림 발송(mock — DRAFT 상태라 verifyExtSystem 직전에 API_NOT_ACTIVE 로 차단됨).
import { runSampleGateway } from "@/lib/mockGateway";

export async function POST(req: Request) {
  return runSampleGateway(req, {
    apiPath: "sample-notification-send",
    method: "POST",
    handler: () => ({
      messageId: `MSG${Date.now().toString(36).toUpperCase()}`,
      sentAt: new Date().toISOString(),
    }),
  });
}
