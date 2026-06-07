// 실 백엔드(Spring + dev Oracle) 연동 e2e — 화면이 실제 DB 데이터를 표시하는지 읽기전용 검증.
// mockup 시대 day*-spec 과 달리 mutation 없음(공유 dev DB 오염 방지). 로그인은 실 BFF→백엔드.
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

test("사용자 관리 — 실 DB 시드 사용자 표시", async ({ page }) => {
  await loginAdmin(page);
  await page.getByRole("link", { name: "사용자", exact: true }).first().click();
  await page.waitForURL(/\/users$/);
  // 시드 3인 + AI 서비스계정(ai-mcp01)이 실 Oracle 에서 조회되어 표시.
  // (가시성 단언이 자동 대기 — 고정 개수 단언은 드리프트 유발이라 최소치 검사로)
  await expect(page.getByTestId("user-row").filter({ hasText: "admin01" })).toBeVisible();
  await expect(page.getByTestId("user-row").filter({ hasText: "user01" })).toBeVisible();
  await expect(page.getByTestId("user-row").filter({ hasText: "홍길동" })).toBeVisible();
  await expect(page.getByTestId("user-row").filter({ hasText: "ai-mcp01" })).toBeVisible();
  expect(await page.getByTestId("user-row").count()).toBeGreaterThanOrEqual(4);
});

test("데이터소스 — 실 DB 데이터소스 표시", async ({ page }) => {
  await loginAdmin(page);
  await page.getByRole("link", { name: "데이터소스", exact: true }).click();
  await page.waitForURL(/\/datasource$/);
  // 시드 데이터소스(실 Oracle) 노출.
  await expect(page.getByText("DAU-CORE-PROD")).toBeVisible();
  await expect(page.locator('[data-testid="ds-row"]').first()).toBeVisible();
});

test("API 관리 — 실 DB API 정의 표시", async ({ page }) => {
  await loginAdmin(page);
  // 로그인 직후 /api-list. 시드 API 5건 이상(AI 데모 등 추가분 허용 — 고정 개수 단언은 드리프트 유발).
  await expect(page.getByText("사용자 정보 조회")).toBeVisible();
  await expect(page.getByText("sample-user-info")).toBeVisible();
  expect(await page.locator('[data-testid="api-row"]').count()).toBeGreaterThanOrEqual(5);
});

test("실시간 모니터링 — 화면 로드(실 call_hist 집계)", async ({ page }) => {
  await loginAdmin(page);
  await page.getByRole("link", { name: "실시간 모니터링", exact: true }).click();
  await page.waitForURL(/\/monitoring$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
