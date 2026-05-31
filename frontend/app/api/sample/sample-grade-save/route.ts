// 샘플 GW — 성적 저장(mock — saved=1 응답).
import { runSampleGateway } from "@/lib/mockGateway";

export async function POST(req: Request) {
  return runSampleGateway(req, {
    apiPath: "sample-grade-save",
    method: "POST",
    handler: () => ({ saved: 1 }),
  });
}
