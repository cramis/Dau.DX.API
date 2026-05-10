// Day 5: 모니터링 라이브 큐 + 승인(API/user) + 사용자 관리 + 문서 뷰어.
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

test("1. /docs — 비로그인 접근 시 /login redirect", async ({ page }) => {
  await page.goto("/docs");
  await expect(page).toHaveURL(/\/login$/);
});

test("1b. /docs — admin01 로그인 후 모든 docVisible API 노출", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  await page.goto("/docs");
  await expect(page.getByText(/관리자 모드/)).toBeVisible();
  // 시드 4개의 docVisible API 모두 좌측에 노출
  await expect(page.locator('[data-testid="docs-api-link"]')).toHaveCount(4);
  await expect(page.getByText("호출 예시 (curl)")).toBeVisible();
});

test("1c. /docs — user01 은 본인이 picg 인 ext 의 매핑 API 만 노출", async ({ page }) => {
  await loginAs(page, "user01", "user01!");
  await page.goto("/docs");
  await expect(page.getByText(/홍길동.*담당자로 등록된/)).toBeVisible();
  // 시드 ExtSystem 의 mappedApis = [A20260509001, A20260509002] → 2개
  await expect(page.locator('[data-testid="docs-api-link"]')).toHaveCount(2);
  // sample-grade-save / sample-dept-tree 는 매핑되지 않았으므로 미노출
  await expect(page.locator('[data-testid="docs-api-link"]', { hasText: /성적 저장/ })).toHaveCount(0);
  await expect(page.locator('[data-testid="docs-api-link"]', { hasText: /부서 트리/ })).toHaveCount(0);
});

test("2. 관리자 사용자 목록 — admin01 가 user01 비활성화", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  await page.goto("/users");
  await expect(page.locator('[data-testid="user-row"]')).toHaveCount(3);

  // user01 행의 비활성화 버튼
  page.once("dialog", (d) => void d.accept());
  const user01Row = page
    .locator('[data-testid="user-row"]')
    .filter({ hasText: "user01" });
  await user01Row.getByRole("button", { name: "비활성화" }).click();

  await expect(page.getByText("비활성화 처리했습니다", { exact: false })).toBeVisible();
});

test("3. API 사용 신청 승인 → ext.mappedApis 갱신", async ({ page, request }) => {
  await loginAs(page, "admin01", "admin01!");
  await page.goto("/approvals/api");
  await expect(page.locator('[data-testid="appr-api-row"]')).toHaveCount(1);

  page.once("dialog", (d) => void d.accept());
  await page
    .locator('[data-testid="appr-api-row"]')
    .first()
    .getByRole("button", { name: /^승인/ })
    .click();
  await expect(page.getByText(/승인 처리되었습니다/)).toBeVisible();

  // 대기 탭에서 사라지고 승인 탭에 1건
  await expect(page.locator('[data-testid="appr-api-row"]')).toHaveCount(0);
  await page.getByRole("button", { name: /^승인 \(\d+\)/ }).click();
  await expect(page.locator('[data-testid="appr-api-row"]')).toHaveCount(1);

  // ext-systems API 가 mappedApis 에 A20260509004 를 포함해야 한다
  const res = await request.get("/api/mock/ext-systems");
  const data = await res.json();
  expect(data.items[0].mappedApis).toContain("A20260509004");
});

test("4. 가입 승인 → user02 ACTIVE → 로그인 가능", async ({ page, context }) => {
  await loginAs(page, "admin01", "admin01!");
  await page.goto("/approvals/user");
  await expect(page.locator('[data-testid="appr-user-row"]')).toHaveCount(1);

  page.once("dialog", (d) => void d.accept());
  await page
    .locator('[data-testid="appr-user-row"]')
    .first()
    .getByRole("button", { name: /^승인/ })
    .click();
  await expect(page.getByText(/승인 처리되었습니다/)).toBeVisible();

  // 다른 사용자로 재로그인
  await context.clearCookies();
  await page.goto("/login");
  await page.getByLabel("아이디").fill("user02");
  await page.getByLabel("비밀번호", { exact: true }).fill("user02!");
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL(/\/api-list$/);
});

test("5. 샘플 GW 호출 → 라이브 큐 → /monitoring/logs 표 반영", async ({
  page,
  request,
}) => {
  // 호출 이력 큐는 reset 으로 비워진 상태.
  await request.get("/api/sample/sample-user-info?id=user01");
  await request.get("/api/sample/sample-user-info?id=admin01");
  await request.get("/api/sample/sample-grade-list?id=user01");

  await loginAs(page, "admin01", "admin01!");
  await page.goto("/monitoring/logs");
  await expect(page.locator('[data-testid="log-row"]')).toHaveCount(3, {
    timeout: 10_000,
  });
  // 응답코드 200 배지
  await expect(page.getByText(/200 · 3/)).toBeVisible();
});

test("6. 4단 검증 — 잘못된 인증키 호출은 403 + 라이브 표에 4xx 로 기록", async ({
  page,
  request,
}) => {
  const res = await request.get(
    "/api/sample/sample-grade-list?id=user01",
    { headers: { "X-Cert-Key": "INVALID-KEY" } },
  );
  expect(res.status()).toBe(403);
  const body = await res.json();
  expect(body.code).toBe("INVALID_CERT_KEY");

  await loginAs(page, "admin01", "admin01!");
  await page.goto("/monitoring/logs");
  // 5초 자동 폴링 또는 즉시 갱신.
  await expect(page.locator('[data-testid="log-row"]')).toHaveCount(1, {
    timeout: 10_000,
  });
  await expect(page.getByText("INVALID_CERT_KEY")).toHaveCount(0); // payload 에는 있지만 표에는 안 보임
  await expect(page.getByText("403")).toBeVisible();
});
