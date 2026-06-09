// 전역 로그인 가드 e2e — 미인증 상태에서 보호 페이지 접근 시 /login 리다이렉트 검증(proxy.ts).
import { expect, test } from "@playwright/test";

// 쿠키/스토리지 없는 완전 미인증 컨텍스트 사용.
test.use({ storageState: { cookies: [], origins: [] } });

const PROTECTED = [
  "/",
  "/dashboard",
  "/api-list",
  "/api-list/new",
  "/api-list/A1",
  "/datasource",
  "/datasource/D1/swap",
  "/ext-system",
  "/monitoring",
  "/monitoring/logs",
  "/monitoring/rules",
  "/approvals/user",
  "/approvals/api",
  "/users",
  "/me",
  "/docs",
];

const PUBLIC = ["/login", "/signup", "/forgot-password"];

for (const path of PROTECTED) {
  test(`미인증 → ${path} 접근 시 /login 으로 차단`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    // 로그인 폼이 실제로 보이는지(빈 화면 redirect 아님)
    await expect(page.getByRole("heading", { name: /로그인/ })).toBeVisible();
  });
}

for (const path of PUBLIC) {
  test(`공개 페이지 ${path} 는 미인증도 접근 허용`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  });
}
