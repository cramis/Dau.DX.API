// API 문서 뷰어 — 로그인 필수(`proxy.ts` 의 PROTECTED_PREFIXES) + 사용자 권한별 필터링.
// 서버 컴포넌트로 사용자 + 접근 가능한 API 를 결정하고, 인터랙티브 부분은 DocsViewer(client) 가 담당.
import { redirect } from "next/navigation";
import { DocsViewer } from "@/components/DocsViewer";
import { getCurrentUser } from "@/lib/mockAuth";
import { getAccessibleDocs } from "@/lib/docsAccess";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) {
    // proxy.ts 가 차단해야 하지만, 직접 진입 케이스(테스트·재시도)에 대비한 fallback.
    redirect("/login");
  }
  const { apis, ownedExtSystems } = getAccessibleDocs(user);
  return (
    <DocsViewer
      user={{ id: user.id, name: user.name, role: user.role, email: user.email }}
      apis={apis}
      ownedExtSystems={ownedExtSystems.map((e) => ({ id: e.id, name: e.name }))}
    />
  );
}
