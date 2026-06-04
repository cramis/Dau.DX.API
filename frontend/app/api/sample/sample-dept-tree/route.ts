// 샘플 GW — 부서 트리(고정 mock).
import { runSampleGateway } from "@/lib/mockGateway";

const FIXED_DEPTS = [
  { id: "01", name: "총장실", parent_id: null },
  { id: "10", name: "교무처", parent_id: null },
  { id: "11", name: "학사지원처", parent_id: "10" },
  { id: "12", name: "교양교육원", parent_id: "10" },
  { id: "20", name: "정보전산원", parent_id: null },
  { id: "21", name: "운영팀", parent_id: "20" },
  { id: "22", name: "보안팀", parent_id: "20" },
];

export async function GET(req: Request) {
  return runSampleGateway(req, {
    apiPath: "sample-dept-tree",
    method: "GET",
    handler: () => ({ items: FIXED_DEPTS }),
  });
}
