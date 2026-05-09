// e2e 및 데모 시드 복원용. 호출 시 mockData 컬렉션을 초기 상태로 되돌리고 mock-jwt 쿠키도 폐기한다.
import { NextResponse } from "next/server";
import { resetMockData } from "@/lib/mockData";
import { clearMockJwt } from "@/lib/mockAuth";

export async function POST() {
  resetMockData();
  await clearMockJwt();
  return NextResponse.json({ ok: true });
}
