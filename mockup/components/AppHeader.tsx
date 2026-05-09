// 관리자 콘솔 상단 헤더. 좌측 로고, 우측 본인 정보 + 로그아웃 드롭다운.
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { getCurrentUser } from "@/lib/mockAuth";

export async function AppHeader() {
  const user = await getCurrentUser();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <Link href="/" className="text-base font-semibold">
        Dau.DX.API
        <span className="ml-2 text-xs font-normal text-muted-foreground">Mockup</span>
      </Link>
      <div className="flex items-center gap-3 text-sm">
        {user ? (
          <>
            <span className="text-muted-foreground">
              {user.name}
              <span className="ml-1 text-xs">({user.role})</span>
            </span>
            <LogoutButton />
          </>
        ) : (
          <Link href="/login" className="text-muted-foreground hover:text-foreground">
            로그인
          </Link>
        )}
      </div>
    </header>
  );
}
