// Day 1 smoke 자동 검증. 03 §3 Day 1 의 "완료 정의" 8개 동작을 한 번에 돌린다.
// Day 2 에서 임시 로그인 버튼이 정식 폼으로 교체되어 helper 로 통일.
import { expect, test, type Page } from "@playwright/test";

async function loginAs(page: Page, id: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("아이디").fill(id);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL(/\/api-list$/);
}

// admin layout 의 Wanted 사이드바 라벨로 통일 (디자인 우선).
// 사용자 승인은 사이드바에서 노출하지 않으므로(라우트는 살아있음) ADMIN_MENUS 에서는 제외.
const ADMIN_MENUS = [
  { href: "/api-list", label: "API 관리" },
  { href: "/datasource", label: "데이터소스" },
  { href: "/ext-system", label: "연계시스템" },
  { href: "/monitoring", label: "실시간 모니터링" },
  { href: "/approvals/api", label: "승인 관리" },
  { href: "/users", label: "사용자" },
  { href: "/me", label: "설정" },
];

test.beforeEach(async ({ context, request }) => {
  await context.clearCookies();
  await request.post("/api/mock/reset");
});

test("1. 루트 진입 시 /login 으로 redirect", async ({ page }) => {
  const response = await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  expect(response?.status()).toBe(200);
});

test("2. admin01 로그인 후 /api-list 진입 + 헤더에 관리자 표기", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  const header = page.locator("header");
  await expect(header).toContainText("관리자");
  await expect(header).toContainText("ADMIN");
});

test("3. 사이드바 메뉴 모두 클릭 가능 + 각 페이지 heading 표시", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");

  for (const item of ADMIN_MENUS) {
    await page.getByRole("link", { name: item.label, exact: true }).first().click();
    await page.waitForURL((url) => url.pathname === item.href, { timeout: 5000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  // /docs 는 admin layout 밖이라 별도 검증. Day 5 에서 placeholder → 실제 뷰어 + 로그인 필수로 전환.
  await page.goto("/api-list");
  await page.getByRole("link", { name: "API 문서", exact: true }).first().click();
  await page.waitForURL(/\/docs$/);
  // 관리자 모드 안내 + 우측에 첫 API h1 노출.
  await expect(page.getByText(/관리자 모드/)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("4. 활성 메뉴는 data-active='true', 비활성은 'false'", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");

  await expect(
    page.getByRole("link", { name: "API 관리", exact: true })
  ).toHaveAttribute("data-active", "true");

  await page.getByRole("link", { name: "데이터소스", exact: true }).click();
  await page.waitForURL(/\/datasource$/);

  await expect(
    page.getByRole("link", { name: "데이터소스", exact: true })
  ).toHaveAttribute("data-active", "true");
  await expect(
    page.getByRole("link", { name: "API 관리", exact: true })
  ).toHaveAttribute("data-active", "false");
});

test("5. 헤더 로그아웃 클릭 → /login 으로 복귀", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  await page.locator("header").getByRole("button", { name: "로그아웃" }).click();
  await page.waitForURL(/\/login$/);
  await expect(page).toHaveURL(/\/login$/);
});

test("6. 로그아웃 상태에서 /api-list 직접 접근 → /login 으로 튕김", async ({ page }) => {
  await page.goto("/api-list");
  await expect(page).toHaveURL(/\/login$/);
});

test("7. 로그아웃 상태에서 /docs 접근 → /login 으로 redirect (Day 5+ 정책)", async ({
  page,
}) => {
  // /docs 는 PROTECTED_PREFIXES 에 포함되어 미인증 시 /login 으로 튕긴다.
  await page.goto("/docs");
  await expect(page).toHaveURL(/\/login$/);
});

test("8. user01 로그인 시 헤더에 USER 권한 표기", async ({ page }) => {
  await loginAs(page, "user01", "user01!");
  const header = page.locator("header");
  await expect(header).toContainText("홍길동");
  await expect(header).toContainText("USER");
});
