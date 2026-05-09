// 본인 정보 화면 진입점. 서버에서 현재 사용자 조회 후 클라이언트 탭으로 전달.
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/mockAuth";
import { MeTabs } from "./me-tabs";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const { password: _pw, ...safe } = user;
  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">본인 정보</h1>
      <MeTabs initialUser={safe} />
    </div>
  );
}
