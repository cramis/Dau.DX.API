// Day 1 smoke 자동 검증. 03 §3 Day 1 의 "완료 정의" 8개 동작을 한 번에 돌린다.
import { expect, test } from "@playwright/test";

// admin layout 안에서 사이드바를 통해 순회 가능한 메뉴 8종 (/docs 는 layout 밖이라 별도).
const ADMIN_MENUS = [
  { href: "/api-list", label: "API" },
  { href: "/datasource", label: "데이터소스" },
  { href: "/ext-system", label: "연계시스템" },
  { href: "/monitoring", label: "실시간 모니터링" },
  { href: "/approvals/api", label: "API 승인" },
  { href: "/approvals/user", label: "사용자 승인" },
  { href: "/users", label: "사용자 관리" },
  { href: "/me", label: "본인 정보" },
];

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test("1. 루트 진입 시 /login 으로 redirect", async ({ page }) => {
  const response = await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  expect(response?.status()).toBe(200);
});

test("2. admin01 로그인 후 /api-list 진입 + 헤더에 관리자 표기", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /관리자로 로그인/ }).click();
  await expect(page).toHaveURL(/\/api-list$/);
  const header = page.locator("header");
  await expect(header).toContainText("관리자");
  await expect(header).toContainText("ADMIN");
});

test("3. 사이드바 메뉴 9개 모두 클릭 가능 + 각 placeholder 표시", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /관리자로 로그인/ }).click();
  await page.waitForURL(/\/api-list$/);

  // admin layout 안 8개는 연속 순회
  for (const item of ADMIN_MENUS) {
    await page.getByRole("link", { name: item.label, exact: true }).click();
    await page.waitForURL((url) => url.pathname === item.href, { timeout: 5000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  // /docs 는 사이드바에 link 가 있지만 클릭 시 admin layout 밖으로 나간다.
  // sidebar 복귀를 위해 admin 페이지로 돌아온 뒤 "API 문서" 클릭을 검증.
  await page.goto("/api-list");
  await page.getByRole("link", { name: "API 문서", exact: true }).click();
  await page.waitForURL(/\/docs$/);
  await expect(page.getByRole("heading", { name: "API 문서" })).toBeVisible();
});

test("4. 활성 메뉴는 data-active='true', 비활성은 'false'", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /관리자로 로그인/ }).click();
  await page.waitForURL(/\/api-list$/);

  await expect(
    page.getByRole("link", { name: "API", exact: true })
  ).toHaveAttribute("data-active", "true");

  await page.getByRole("link", { name: "데이터소스", exact: true }).click();
  await page.waitForURL(/\/datasource$/);

  await expect(
    page.getByRole("link", { name: "데이터소스", exact: true })
  ).toHaveAttribute("data-active", "true");
  await expect(
    page.getByRole("link", { name: "API", exact: true })
  ).toHaveAttribute("data-active", "false");
});

test("5. 헤더 로그아웃 클릭 → /login 으로 복귀", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /관리자로 로그인/ }).click();
  await page.waitForURL(/\/api-list$/);

  await page.getByRole("button", { name: "로그아웃" }).click();
  await page.waitForURL(/\/login$/);
  await expect(page).toHaveURL(/\/login$/);
});

test("6. 로그아웃 상태에서 /api-list 직접 접근 → /login 으로 튕김", async ({ page }) => {
  await page.goto("/api-list");
  await expect(page).toHaveURL(/\/login$/);
});

test("7. 로그아웃 상태에서 /docs 접근 → placeholder 노출 (비로그인 허용)", async ({
  page,
}) => {
  const response = await page.goto("/docs");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/docs$/);
  await expect(page.getByRole("heading", { name: "API 문서" })).toBeVisible();
});

test("8. user01 로그인 시 헤더에 USER 권한 표기", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /일반 사용자로 로그인/ }).click();
  await expect(page).toHaveURL(/\/api-list$/);
  const header = page.locator("header");
  await expect(header).toContainText("홍길동");
  await expect(header).toContainText("USER");
});
