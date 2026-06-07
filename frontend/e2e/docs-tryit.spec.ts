// /docs Try-it e2e — 공개 문서에서 인증키 입력 후 실제 게이트웨이 호출(읽기전용 GET). DRAFT 미노출도 검증.
import { expect, test } from "@playwright/test";

const DEMO_KEY = "AKAD9001-DXAPIDEMO-1234ABCD-5678EF90";

test("공개 /docs — DRAFT 미노출", async ({ page }) => {
  await page.goto("/docs");
  // ACTIVE+docVisible 만 — DRAFT 인 ai-user-lookup(A20260607002)은 목록에 없어야 함
  await expect(page.getByTestId("docs-api-link").filter({ hasText: "sample-user-info" })).toBeVisible();
  await expect(page.getByTestId("docs-api-link").filter({ hasText: "ai-user-lookup" })).toHaveCount(0);
});

test("공개 /docs — Try it 으로 실제 게이트웨이 호출(키·마스킹)", async ({ page }) => {
  await page.goto("/docs");
  // 데모 연계시스템(E20260509001)에 매핑된 API 로 검증
  await page.getByTestId("docs-api-link").filter({ hasText: "sample-user-info" }).click();
  // 오답 키 → 401 실패 표시
  await page.getByLabel("인증키").fill("WRONG-KEY");
  await page.getByLabel("파라미터 id").fill("admin01");
  await page.getByTestId("tryit-run-btn").click();
  await expect(page.getByTestId("tryit-result").getByText(/실패/)).toBeVisible({ timeout: 15000 });
  // 정상 키 → 성공 + 실데이터(마스킹된 사용자명) 표시
  await page.getByLabel("인증키").fill(DEMO_KEY);
  await page.getByTestId("tryit-run-btn").click();
  await expect(page.getByTestId("tryit-result").getByText(/성공/)).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("tryit-result")).toContainText("user_id");
});
