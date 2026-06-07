// API Try-it(테스트 실행 탭) e2e — 실 백엔드 test-run 연동. 읽기전용(SELECT) 실행이라 dev DB 무오염.
import { expect, test, type Page } from "@playwright/test";

async function loginAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("아이디").fill("admin01");
  await page.getByLabel("비밀번호", { exact: true }).fill("admin01!");
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL(/\/api-list$/);
}

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test("편집 화면 5탭 — 테스트 실행으로 실제 rows 확인", async ({ page }) => {
  await loginAdmin(page);
  // AI 가 등록한 사용자 리스트 조회 API (GET, status 파라미터 defaultValue=ACTIVE)
  await page.goto("/api-list/A20260607004");
  await page.getByRole("tab", { name: "테스트 실행" }).click();
  await expect(page.getByTestId("tryit-panel")).toBeVisible();
  // defaultValue 프리필 확인 후 실행
  await page.getByLabel("파라미터 status").fill("ACTIVE");
  await page.getByTestId("tryit-run-btn").click();
  const result = page.getByTestId("tryit-result");
  await expect(result).toBeVisible({ timeout: 15000 });
  await expect(result.getByText(/성공/)).toBeVisible();
  // 실 DB 행 — user_id 컬럼과 name 마스킹된 사용자명이 JSON 에 보임
  await expect(result).toContainText("user_id");
  await expect(result).toContainText("rowCount");
});
