// API 문서 뷰어 — 로그인 필요(proxy 가드). 실 백엔드의 docVisible 목록을 조회해 표시.
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

// 게이트웨이 외부 호출 base URL — openapi.json servers[0].url (백엔드 public-base-url 설정).
async function fetchGatewayBase(): Promise<string> {
  try {
    const res = await fetch(`${BACKEND_URL}/openapi.json`, { cache: "no-store" });
    const spec = await res.json();
    const url = spec?.servers?.[0]?.url;
    return typeof url === "string" && url.length > 0 ? url : BACKEND_URL;
  } catch {
    return BACKEND_URL;
  }
}

export default async function Page() {
  // 공개 화면 — 로그인 선택. 로그인돼 있으면 헤더에 사용자 표시(없으면 게스트).
  const user = await getCurrentUser().catch(() => null);
  const [apis, gatewayBase] = await Promise.all([fetchPublicDocs(), fetchGatewayBase()]);
  return (
    <DocsViewer
      user={user ? { id: user.id, name: user.name, role: user.role, email: user.email } : null}
      apis={apis}
      gatewayBase={gatewayBase}
    />
  );
}
