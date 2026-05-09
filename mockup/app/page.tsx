// 루트 진입점. 인증 상태에 따라 admin 콘솔 또는 로그인 화면으로 redirect.
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/mockAuth";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/api-list");
  }
  redirect("/login");
}
