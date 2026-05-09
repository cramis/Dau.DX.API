// e2e 및 데모 시드 복원용. 호출 시 mockData 컬렉션을 초기 상태로 되돌리고 mock-jwt 쿠키도 폐기한다.
// 폴더명은 `_reset` 가 아닌 `reset`. Next.js 16 의 private-folder 규칙(`_` prefix)으로
// `_reset` 은 라우팅에서 제외돼 404 가 된다. 본 라우트는 Mockup 한정 도구.
import { NextResponse } from "next/server";
import { resetMockData } from "@/lib/mockData";
import { clearMockJwt } from "@/lib/mockAuth";

export async function POST() {
  resetMockData();
  await clearMockJwt();
  return NextResponse.json({ ok: true });
}
