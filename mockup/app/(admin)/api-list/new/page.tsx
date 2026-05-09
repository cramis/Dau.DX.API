// API 신규 등록 화면. 4탭 폼.
import { ApiForm } from "@/components/ApiForm";
import { mockData } from "@/lib/mockData";

export default function Page() {
  const dataSources = [...mockData.dataSources];
  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">API 신규 등록</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          기본정보 / SQL / 입력 파라미터 / 응답 컬럼 4개 탭을 채운 후 저장하세요.
        </p>
      </div>
      <ApiForm mode="create" initial={null} dataSources={dataSources} />
    </div>
  );
}
