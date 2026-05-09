// API 단건 수정 화면. mode="edit" 로 ApiForm 재사용.
import { notFound } from "next/navigation";
import { ApiForm } from "@/components/ApiForm";
import { mockData } from "@/lib/mockData";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  const api = mockData.apis.find((a) => a.no === id);
  if (!api) notFound();
  const dataSources = [...mockData.dataSources];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">API 수정</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          번호: <span className="font-mono">{api.no}</span>
        </p>
      </div>
      <ApiForm mode="edit" initial={api} dataSources={dataSources} />
    </div>
  );
}
