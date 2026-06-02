// API 문서 뷰어 — 비로그인 공개(FR7). 실 백엔드의 docVisible 목록을 조회해 표시.
// 서버 컴포넌트가 공개 목록을 fetch, 인터랙티브 부분은 DocsViewer(client) 가 담당.
import { DocsViewer } from "@/components/DocsViewer";
import { getCurrentUser } from "@/lib/mockAuth";
import { BACKEND_URL } from "@/lib/backend";
import type { ApiDef } from "@/types/api";

export const dynamic = "force-dynamic";

type DocApi = Pick<
  ApiDef,
  "no" | "name" | "group" | "method" | "path" | "authRequired" | "desc" | "params" | "resps"
>;

async function fetchPublicDocs(): Promise<DocApi[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/docs/apis`, { cache: "no-store" });
    const body = await res.json();
    return (body?.data?.items as DocApi[]) ?? [];
  } catch {
    return [];
  }
}

export default async function Page() {
  // 공개 화면 — 로그인 선택. 로그인돼 있으면 헤더에 사용자 표시(없으면 게스트).
  const user = await getCurrentUser().catch(() => null);
  const apis = await fetchPublicDocs();
  return (
    <DocsViewer
      user={user ? { id: user.id, name: user.name, role: user.role, email: user.email } : null}
      apis={apis}
    />
  );
}
