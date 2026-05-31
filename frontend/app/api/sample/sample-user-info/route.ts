// 샘플 GW — 사용자 정보 조회 (id 1건). mockData.users 시드를 응답으로 가공.
import { runSampleGateway } from "@/lib/mockGateway";
import { mockData } from "@/lib/mockData";

export async function GET(req: Request) {
  return runSampleGateway(req, {
    apiPath: "sample-user-info",
    method: "GET",
    handler: (r) => {
      const url = new URL(r.url);
      const id = url.searchParams.get("id") ?? "";
      const u = mockData.users.find((x) => x.id === id);
      if (!u) {
        throw new Error(`사용자 ${id} 를 찾을 수 없습니다.`);
      }
      return {
        user_id: u.id,
        user_nm: u.name,
        dept_nm: u.dept,
      };
    },
  });
}
