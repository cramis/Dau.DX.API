// 데이터소스 일괄 import 등록·수정 예시 envelope. 비로그인 가능.
import { NextResponse } from "next/server";
import type { DataSourceImportEnvelope } from "@/lib/bulkImport";
import { API_BULK_VERSION } from "@/lib/bulkImport";

const TEMPLATE: DataSourceImportEnvelope = {
  version: API_BULK_VERSION,
  kind: "dataSource",
  items: [
    // (1) 신규 등록 — id 생략. 서버가 `DS` + 오늘 YYYYMMDD + 시퀀스로 자동 채번.
    //     export 엔 비번이 없으므로, 신규 등록 행에는 dbPassword 를 직접 채워야 한다(필수).
    {
      name: "DAU-WAREHOUSE-PROD",
      dbType: "POSTGRES",
      jdbcUrl: "jdbc:postgresql://wh-prd.donga.ac.kr:5432/warehouse",
      dbUser: "dxapi",
      dbPassword: "<신규 등록 시 DB 비밀번호 입력>",
      poolMin: 5,
      poolMax: 60,
      queryTimeoutSec: 10,
      useYn: "Y",
    },
    // (2) 기존 데이터소스 수정 — id 명시. 시드의 DAU-CORE-STG 풀 크기를 늘리는 예.
    {
      id: "DS20260509005",
      name: "DAU-CORE-STG",
      dbType: "ORACLE",
      jdbcUrl: "jdbc:oracle:thin:@core-stg.donga.ac.kr:1521/CORE",
      dbUser: "dxapi",
      poolMin: 3,
      poolMax: 40,
      queryTimeoutSec: 5,
      useYn: "Y",
    },
  ],
};

export async function GET() {
  return NextResponse.json(TEMPLATE, {
    headers: {
      "Content-Disposition": `attachment; filename="datasources-template.json"`,
    },
  });
}
