// /docs 접근 정책 — 사용자 역할별로 노출 가능한 API 목록을 계산한다.
//   ADMIN: 모든 docVisible API
//   USER : docVisible 이면서, 본인이 picgEmail 로 등록된 ACTIVE 연계시스템의 mappedApis 에 포함된 API
//   기타  : 빈 배열
import { mockData } from "@/lib/mockData";
import type { ApiDef, ExtSystem, User } from "@/types/api";

export interface AccessibleDocs {
  apis: ApiDef[];
  // 사용자가 담당하는 ACTIVE 연계시스템(USER 만 사용). 디버깅·도움말 표시용.
  ownedExtSystems: ExtSystem[];
}

export function getAccessibleDocs(user: User): AccessibleDocs {
  if (user.status !== "ACTIVE") {
    return { apis: [], ownedExtSystems: [] };
  }
  if (user.role === "ADMIN") {
    const apis = mockData.apis.filter((a) => a.docVisible);
    return { apis, ownedExtSystems: [] };
  }
  const owned = mockData.extSystems.filter(
    (e) => e.status === "ACTIVE" && e.picgEmail === user.email,
  );
  const allowed = new Set<string>();
  for (const e of owned) {
    for (const no of e.mappedApis) allowed.add(no);
  }
  const apis = mockData.apis.filter(
    (a) => a.docVisible && allowed.has(a.no),
  );
  return { apis, ownedExtSystems: owned };
}
