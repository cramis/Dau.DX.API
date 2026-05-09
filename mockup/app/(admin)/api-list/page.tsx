// API 목록 화면. 시드 + 등록한 API 를 검색·정렬·페이징하여 표시.
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ApiListTable } from "@/components/ApiListTable";
import { mockData } from "@/lib/mockData";

export default function Page() {
  // mockData 는 in-memory 이므로 server component 에서 직접 읽는다.
  const items = [...mockData.apis];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">API 목록</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            등록된 API 정의를 조회·검색·관리합니다.
          </p>
        </div>
        <Link
          href="/api-list/new"
          className={buttonVariants({ variant: "default" })}
        >
          + 신규 등록
        </Link>
      </div>
      <ApiListTable items={items} />
    </div>
  );
}
