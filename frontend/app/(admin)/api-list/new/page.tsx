// API 신규 등록 화면 — H1_S2~S5 위저드 디자인을 적용한 4탭 폼.
import { ApiForm } from "@/components/ApiForm";
import { PageHead } from "@/components/design/AppShell";
import { Stepper } from "@/components/design/Stepper";
import { mockData } from "@/lib/mockData";

export default function Page() {
  const dataSources = [...mockData.dataSources];
  return (
    <>
      <PageHead
        breadcrumb={["API 관리", "신규 등록"]}
        title="API 등록"
        sub="기본정보 → SQL 작성 → 파라미터/응답 → 테스트 실행 → 발급"
      />
      <Stepper
        steps={["기본정보", "SQL 작성", "파라미터/응답", "테스트 실행", "발급 완료"]}
        current={0}
      />
      <ApiForm mode="create" initial={null} dataSources={dataSources} />
    </>
  );
}
