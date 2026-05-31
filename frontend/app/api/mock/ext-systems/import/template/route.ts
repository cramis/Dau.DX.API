// 연계시스템 일괄 import 등록·수정 예시 envelope. 비로그인 가능.
import { NextResponse } from "next/server";
import type { ExtSystemImportEnvelope } from "@/lib/bulkImport";
import { API_BULK_VERSION } from "@/lib/bulkImport";

const TEMPLATE: ExtSystemImportEnvelope = {
  version: API_BULK_VERSION,
  kind: "extSystem",
  items: [
    // (1) 신규 등록 — id, certKey 모두 생략. 서버가 자동 채번 + 인증키 자동 발급.
    {
      name: "외부분석시스템",
      allowedIps: ["10.0.5.0/24", "127.0.0.1/32"],
      useBegin: "2026-06-01T00:00:00",
      useEnd: "2027-05-31T23:59:59",
      mappedApis: ["A20260509001", "A20260509002"],
      picgName: "이담당",
      picgEmail: "external@donga.ac.kr",
      remark: "BI 데이터 마트 적재용",
      status: "ACTIVE",
    },
    // (2) 기존 연계시스템 수정 — id 명시. certKey 생략하면 기존 키 유지.
    //     mappedApis 에 sample-grade-list 추가하는 예.
    {
      id: "E20260509001",
      name: "학사정보시스템",
      allowedIps: ["10.0.0.0/24", "127.0.0.1/32"],
      useBegin: "2026-01-01T00:00:00",
      useEnd: "2026-12-31T23:59:59",
      mappedApis: ["A20260509001", "A20260509002", "A20260509004"],
      picgName: "홍길동",
      picgEmail: "user01@donga.ac.kr",
      status: "ACTIVE",
    },
  ],
};

export async function GET() {
  return NextResponse.json(TEMPLATE, {
    headers: {
      "Content-Disposition": `attachment; filename="ext-systems-template.json"`,
    },
  });
}
