// API 일괄 import 의 등록·수정 예시 envelope. 다운로드 / 화면 채우기 양쪽에서 사용.
import { NextResponse } from "next/server";
import type { ApiImportEnvelope } from "@/lib/bulkImport";
import { API_BULK_VERSION } from "@/lib/bulkImport";

const TEMPLATE: ApiImportEnvelope = {
  version: API_BULK_VERSION,
  kind: "api",
  items: [
    // (1) 신규 등록 예시 — `no` 필드 생략. 서버가 `A` + 오늘 YYYYMMDD + 3자리 시퀀스로 자동 채번.
    {
      name: "도서 검색",
      group: "LIB",
      method: "GET",
      path: "library-book-search",
      status: "DRAFT",
      dataSrcId: "DS20260509003",
      authRequired: true,
      docVisible: true,
      sql:
        "SELECT book_id, title, author FROM v_book WHERE title LIKE '%' || #{q} || '%' AND ROWNUM <= 50",
      desc: "도서명에 키워드를 포함하는 도서를 최대 50건 반환.",
      params: [
        { name: "q", type: "string", required: true, desc: "검색 키워드" },
      ],
      resps: [
        { col: "book_id", type: "VARCHAR", displayName: "도서ID", maskRule: "none" },
        { col: "title", type: "VARCHAR", displayName: "제목", maskRule: "none" },
        { col: "author", type: "VARCHAR", displayName: "저자", maskRule: "none" },
      ],
    },
    // (2) 기존 API 수정 예시 — `no` 필드를 기존 시드와 일치시켜 update 로 분류.
    //     본 예시는 시드의 `사용자 정보 조회` 를 그대로 다시 쓴 것 — 변경하려는 필드만 바꾸면 된다.
    {
      no: "A20260509001",
      name: "사용자 정보 조회",
      group: "USER",
      method: "GET",
      path: "sample-user-info",
      status: "ACTIVE",
      dataSrcId: "DS20260509001",
      authRequired: true,
      docVisible: true,
      sql:
        "SELECT user_id, user_nm, dept_nm FROM v_user WHERE user_id = #{id}",
      params: [
        { name: "id", type: "string", required: true, desc: "사용자 ID" },
      ],
      resps: [
        { col: "user_id", type: "VARCHAR", displayName: "사용자ID", maskRule: "none" },
        { col: "user_nm", type: "VARCHAR", displayName: "사용자명", maskRule: "name" },
        { col: "dept_nm", type: "VARCHAR", displayName: "부서명", maskRule: "none" },
      ],
    },
  ],
};

export async function GET() {
  // 비로그인도 다운로드 가능 — 템플릿은 공개 정보. 실제 데이터(`/export`) 와 다름.
  return NextResponse.json(TEMPLATE, {
    headers: {
      "Content-Disposition": `attachment; filename="apis-template.json"`,
    },
  });
}
