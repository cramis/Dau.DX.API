// 샘플 GW — 성적 목록(고정 mock).
import { runSampleGateway } from "@/lib/mockGateway";

const FIXED_GRADES = [
  { subject: "데이터구조", grade: "A+", semester: "2025-2" },
  { subject: "운영체제", grade: "A0", semester: "2025-2" },
  { subject: "데이터베이스", grade: "B+", semester: "2025-2" },
  { subject: "알고리즘", grade: "A0", semester: "2026-1" },
];

export async function GET(req: Request) {
  return runSampleGateway(req, {
    apiPath: "sample-grade-list",
    method: "GET",
    handler: () => ({ items: FIXED_GRADES }),
  });
}
