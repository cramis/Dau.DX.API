// Day 4: 데이터소스 / 연계시스템 CRUD + 연결 테스트 + 인증키 발급·재발급.
import { expect, test, type Page } from "@playwright/test";

async function loginAs(page: Page, id: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("아이디").fill(id);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL(/\/api-list$/);
}

test.beforeEach(async ({ context, request }) => {
  await context.clearCookies();
  await request.post("/api/mock/reset");
});

// ---------- 데이터소스 ----------

test("1. /datasource — 시드 5개 노출 + 검색 필터", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  await page.goto("/datasource");
  await expect(
    page.getByRole("heading", { name: "데이터소스 관리" }),
  ).toBeVisible();
  await expect(page.locator('[data-testid="ds-row"]')).toHaveCount(5);

  await page.getByLabel("데이터소스 검색").fill("LMS");
  await expect(page.locator('[data-testid="ds-row"]')).toHaveCount(1);
  // 동일 이름이 풀 차트 카드 헤더에도 있으므로 테이블 셀로 한정.
  await expect(
    page.getByRole("cell", { name: "DAU-LMS-PROD", exact: true }),
  ).toBeVisible();
});

test("2. 데이터소스 신규 등록 → 목록에 즉시 반영", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  await page.goto("/datasource");
  await page.getByRole("button", { name: "데이터소스 추가" }).click();

  // 모달 안의 폼 입력
  await page.getByLabel(/^이름/).fill("DAU-NEW-DS");
  await page.getByLabel(/^JDBC URL/).fill("jdbc:postgresql://new-host:5432/new");
  await page.getByLabel(/^DB 사용자/).fill("dxapi");
  await page.getByRole("button", { name: "등록" }).click();

  // 등록 후 모달 닫히고 목록에 추가됨 (초기 5 → 6)
  await expect(page.locator('[data-testid="ds-row"]')).toHaveCount(6);
  // 토스트에도 같은 이름이 들어가므로 셀로 한정.
  await expect(
    page.getByRole("cell", { name: "DAU-NEW-DS", exact: true }),
  ).toBeVisible();
});

test("3. 연결 테스트 — BREAK 포함 URL → 실패 배너", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  await page.goto("/datasource");
  await page.getByRole("button", { name: "데이터소스 추가" }).click();

  await page.getByLabel(/^JDBC URL/).fill("jdbc:oracle:thin:@BREAK:1521/X");
  await page.getByLabel(/^DB 사용자/).fill("x");
  await page.getByRole("button", { name: /연결 테스트/ }).click();

  const result = page.getByTestId("ds-test-result");
  await expect(result).toBeVisible();
  await expect(result).toContainText("TCP 연결이 거부되었습니다");
});

test("4. 풀 max < min → 클라이언트 zod 검증 메시지", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  await page.goto("/datasource");
  await page.getByRole("button", { name: "데이터소스 추가" }).click();

  await page.getByLabel(/^이름/).fill("BAD-POOL");
  await page.getByLabel(/^JDBC URL/).fill("jdbc:oracle:thin:@h:1521/x");
  await page.getByLabel(/^DB 사용자/).fill("x");
  await page.getByLabel(/^최소 풀/).fill("100");
  await page.getByLabel(/^최대 풀/).fill("10");
  await page.getByRole("button", { name: "등록" }).click();

  await expect(
    page.getByText("최대 풀은 최소 풀 이상이어야 합니다."),
  ).toBeVisible();
});

test("5. 매핑 API 가 있는 데이터소스 삭제 시도 → 토스트 에러", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  await page.goto("/datasource");
  // DAU-CORE-PROD (DS20260509001) 는 5개 시드 API 모두가 사용 중.
  page.once("dialog", (d) => void d.accept());
  await page
    .getByRole("button", { name: /DAU-CORE-PROD 삭제/ })
    .click();
  await expect(page.getByText(/사용 중입니다/)).toBeVisible();
  // 행 수는 그대로
  await expect(page.locator('[data-testid="ds-row"]')).toHaveCount(5);
});

// ---------- 연계시스템 ----------

test("6. /ext-system — 시드 1개 노출 + 인증키 마스킹", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  await page.goto("/ext-system");
  await expect(
    page.getByRole("heading", { name: "연계시스템 관리" }),
  ).toBeVisible();
  await expect(page.locator('[data-testid="ext-row"]')).toHaveCount(1);
  // 평문 키가 노출되지 않는다
  await expect(page.getByText("AKAD0001-XXXXYYYY")).toHaveCount(0);
});

test("7. 연계시스템 신규 등록 → 인증키 1회 노출 다이얼로그", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  await page.goto("/ext-system");
  await page.getByRole("button", { name: "연계시스템 추가" }).click();

  await page.getByLabel(/^이름/).fill("외부테스트시스템");
  await page.getByLabel(/^허용 IP/).fill("10.0.0.0/24\n127.0.0.1/32");
  await page.getByLabel(/^이용 시작일/).fill("2026-06-01");
  await page.getByLabel(/^이용 종료일/).fill("2026-12-31");
  // 매핑 API — [매핑 API 수정] 으로 편집 모드 진입 → 검색 후 1건 체크
  await page.getByRole("button", { name: "매핑 API 수정" }).click();
  await page.getByPlaceholder("API 검색 (번호·이름·경로·그룹)").fill("A20260509001");
  await page
    .getByRole("checkbox", { name: /A20260509001/ })
    .check();
  await page.getByRole("button", { name: "등록" }).click();

  // 인증키 다이얼로그
  const keyValue = page.getByTestId("cert-key-value");
  await expect(keyValue).toBeVisible();
  const key = await keyValue.inputValue();
  expect(key).toMatch(/^AKAD\d{4}-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/);
  await expect(page.getByTestId("cert-key-warning")).toContainText(
    "다시 볼 수 없습니다",
  );

  // 다이얼로그 닫고 목록에 새 행
  await page
    .getByRole("dialog", { name: "인증키 발급 완료" })
    .getByRole("button", { name: "확인" })
    .click();
  await expect(page.locator('[data-testid="ext-row"]')).toHaveCount(2);
  // 토스트와 헤더 sub 라인에도 이름이 들어가므로 행 strong 영역으로 한정.
  await expect(
    page
      .locator('[data-testid="ext-row"]')
      .filter({ hasText: "외부테스트시스템" }),
  ).toHaveCount(1);
});

test("8. 인증키 재발급 → 새 키 다이얼로그", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  await page.goto("/ext-system");
  page.once("dialog", (d) => void d.accept());
  await page
    .getByRole("button", { name: /학사정보시스템 인증키 재발급/ })
    .click();

  const keyValue = page.getByTestId("cert-key-value");
  await expect(keyValue).toBeVisible();
  const key = await keyValue.inputValue();
  expect(key).toMatch(/^AKAD9001-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/);
  // 시드의 평문 키와는 다르다
  expect(key).not.toBe("AKAD0001-XXXXYYYY-ZZZZAAAA-BBBBCCCC");
});
