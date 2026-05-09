// 대시보드 — 3가지 가설 배너 + 핵심 지표 요약. 각 가설은 대표 화면으로 진입.
import Link from "next/link";
import { PageHead } from "@/components/design/AppShell";
import { I } from "@/components/design/Icons";
import { Hypothesis, MetricTile } from "@/components/design/primitives";

export default function Page() {
  return (
    <>
      <PageHead
        breadcrumb={["서비스", "대시보드"]}
        title="Dau.DX.API · 차세대 API 게이트웨이"
        sub="PRD 기반 3가지 가설 · 셀프서비스 · 통합 모니터링 · 무중단 hot-swap"
        actions={
          <>
            <Link href="/api-list/new" className="w-btn w-btn--primary w-btn--sm">
              <I name="Plus"/> 신규 API 등록
            </Link>
          </>
        }
      />

      <div className="w-metrics" style={{ marginBottom: 16 }}>
        <MetricTile
          label="셀프서비스 등록 비율"
          value="71"
          unit="%"
          delta="목표 70% 달성"
          deltaTone="up"
          accent="primary"
        />
        <MetricTile
          label="평균 MTTR"
          value="3분 12초"
          delta="목표 5분 이내"
          deltaTone="up"
          accent="primary"
        />
        <MetricTile
          label="올해 재시작"
          value={<span style={{ color: "var(--w-green)" }}>0</span>}
          unit="건"
          delta="hot-swap 100% 성공"
          deltaTone="up"
          accent="positive"
        />
        <MetricTile label="진행 중 인시던트" value="1" delta="DAU-LMS-PROD" accent="critical"/>
      </div>

      <div className="w-stack" style={{ gap: 16 }}>
        <Link href="/api-list" style={{ textDecoration: "none", color: "inherit" }}>
          <Hypothesis
            tag="가설 1 · 셀프서비스 발급"
            title="신규 API의 70%가 관리자 개입 없이 셀프서비스로 등록될 것이다"
            body={
              <>
                비개발자가 SQL만 알면 <b>30분 안에 REST API</b>를 발급할 수 있는 위저드 플로우.
                자동 검증과 OpenAPI 문서 자동 생성으로 검증.
              </>
            }
            kpis={[
              { v: "71%", l: "셀프서비스 비율" },
              { v: "22분", l: "평균 발급 소요" },
              { v: "142", l: "발급된 API" },
            ]}
          />
        </Link>

        <Link href="/monitoring" style={{ textDecoration: "none", color: "inherit" }}>
          <Hypothesis
            tag="가설 2 · 통합 모니터링"
            title="trace-id 통합 모니터링으로 장애 원인 5분 이내 파악"
            body={
              <>
                실시간 대시보드 → 자동 알림 → 호출이력 검색 → trace-id 상세 → SQL 원인 분석을
                <b> 한 흐름</b>으로 묶어 평균 5분 미만으로 단축.
              </>
            }
            kpis={[
              { v: "3분 12초", l: "평균 MTTR" },
              { v: "14건", l: "활성 알림 규칙" },
              { v: "0.02%", l: "기준 오류율" },
            ]}
          />
        </Link>

        <Link href="/datasource" style={{ textDecoration: "none", color: "inherit" }}>
          <Hypothesis
            tag="가설 3 · 무중단 Hot-swap"
            title="데이터소스 hot-swap으로 재시작 0건 운영"
            body={
              <>
                신규 풀 워밍업 + graceful 라우팅 전환 + in-flight 호출 보호 + 자동 롤백 정책으로
                <b> 연간 재시작 0건</b>을 유지.
              </>
            }
            kpis={[
              { v: "0건", l: "올해 재시작" },
              { v: "14건", l: "올해 무중단 전환" },
              { v: "100%", l: "성공률" },
            ]}
          />
        </Link>
      </div>
    </>
  );
}
