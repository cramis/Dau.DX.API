// API 목록 화면 — H1_S1 셀프서비스 발급 비율 KPI + 검색·정렬·페이징.
import { ApiListPageActions } from "@/components/ApiListPageActions";
import { ApiListTable } from "@/components/ApiListTable";
import { PageHead } from "@/components/design/AppShell";
import { MetricTile } from "@/components/design/primitives";
import { mockData } from "@/lib/mockData";

export default function Page() {
  const items = [...mockData.apis];
  const dsNameById: Record<string, string> = Object.fromEntries(
    mockData.dataSources.map((d) => [d.id, d.name]),
  );
  const total = items.length;
  const active = items.filter((a) => a.status === "ACTIVE").length;
  const activePct = total > 0 ? Math.round((active / total) * 100) : 0;

  return (
    <>
      <PageHead
        breadcrumb={["서비스", "API 관리"]}
        title="API 관리"
        sub={`등록된 ${total}개의 API · 셀프서비스 발급 활성화`}
        actions={<ApiListPageActions />}
      />

      <div className="w-metrics" style={{ marginBottom: 16 }}>
        <MetricTile
          label="전체 API"
          value={total}
          delta={<>이번 주 신규 +{Math.max(0, total - 4)}</>}
          deltaTone="up"
        />
        <MetricTile
          label="운영 중"
          value={active}
          delta={`${activePct}%`}
        />
        <MetricTile
          label="셀프서비스 등록 비율"
          value="71"
          unit="%"
          delta="목표 70% 달성"
          deltaTone="up"
        />
        <MetricTile
          label="평균 발급 소요"
          value="22"
          unit="분"
          delta="▼ 38% (vs EzAPI)"
          deltaTone="up"
        />
      </div>

      <ApiListTable items={items} dsNameById={dsNameById}/>
    </>
  );
}
