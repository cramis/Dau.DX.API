// API 단건 수정 화면 — 위저드 진행 상태 모두 완료된 형태로 표시.
import { notFound } from "next/navigation";
import { ApiForm } from "@/components/ApiForm";
import { PageHead } from "@/components/design/AppShell";
import { Stepper } from "@/components/design/Stepper";
import { backendProxy, fetchItems } from "@/lib/bff";
import type { ApiDef, DataSource } from "@/types/api";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  const [{ body }, dataSources] = await Promise.all([
    backendProxy(`/api/apis/${id}`),
    fetchItems<DataSource>("/api/datasources"),
  ]);
  if (!body?.ok) notFound();
  const api = body.data as ApiDef;

  return (
    <>
      <PageHead
        breadcrumb={["API 관리", "수정"]}
        title="API 수정"
        sub={
          <>
            번호: <span className="w-mono">{api.no}</span>
          </>
        }
      />
      <Stepper
        steps={["기본정보", "SQL 작성", "파라미터/응답", "테스트 실행", "발급 완료"]}
        current={4}
      />
      <ApiForm mode="edit" initial={api} dataSources={dataSources} />
    </>
  );
}
