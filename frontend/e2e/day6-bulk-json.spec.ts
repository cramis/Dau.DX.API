// Day 6 (이른 항목): API 일괄 import/export + 단건 JSON 편집.
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

test("1. JSON 가져오기 — 검증 → 적용 → 행 수 갱신", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  await page.getByTestId("api-import-btn").click();

  const payload = JSON.stringify(
    {
      version: 1,
      kind: "api",
      items: [
        {
          name: "벌크 신규 1",
          group: "BULK",
          method: "GET",
          path: "bulk-new-1",
          status: "DRAFT",
          dataSrcId: "DS20260509001",
          authRequired: true,
          docVisible: true,
          sql: "SELECT 1 FROM dual",
          params: [],
          resps: [{ col: "x", type: "VARCHAR", maskRule: "none" }],
        },
      ],
    },
    null,
    2,
  );
  await page.getByTestId("bulk-import-json").fill(payload);

  // 검증
  await page.getByRole("button", { name: /^검증$/ }).click();
  const summary = page.getByTestId("bulk-import-summary");
  await expect(summary).toBeVisible();
  await expect(summary).toContainText("신규 1");
  await expect(summary).toContainText("실패 0");

  // 적용
  await page.getByRole("button", { name: /^적용$/ }).click();
  await expect(page.getByText(/import 완료/)).toBeVisible();

  // 목록 6건 + 신규 행 가시
  await expect(page.locator('[data-testid="api-row"]')).toHaveCount(6);
  await expect(
    page
      .locator('[data-testid="api-row"]')
      .filter({ hasText: "벌크 신규 1" }),
  ).toHaveCount(1);
});

test("2. JSON 가져오기 — path 충돌 행은 거부, 적용 안 됨", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  await page.getByTestId("api-import-btn").click();

  await page.getByTestId("bulk-import-json").fill(
    JSON.stringify({
      version: 1,
      kind: "api",
      items: [
        {
          name: "충돌",
          group: "BULK",
          method: "GET",
          path: "sample-user-info",
          status: "DRAFT",
          dataSrcId: "DS20260509001",
          authRequired: true,
          docVisible: true,
          sql: "SELECT 1",
          params: [],
          resps: [{ col: "x", type: "VARCHAR", maskRule: "none" }],
        },
      ],
    }),
  );

  await page.getByRole("button", { name: /^검증$/ }).click();
  const summary = page.getByTestId("bulk-import-summary");
  await expect(summary).toContainText("실패 1");
  await expect(page.getByText(/PATH_EXISTS/)).toBeVisible();

  // 적용 버튼 disabled
  await expect(page.getByRole("button", { name: /^적용$/ })).toBeDisabled();
});

test("3. JSON 내보내기 — admin01 다운로드 트리거", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("api-export-btn").click();
  const dl = await downloadPromise;
  expect(dl.suggestedFilename()).toMatch(/^apis-\d{4}-\d{2}-\d{2}\.json$/);
});

test("3b. 등록 예시 — [예시 채우기] 가 textarea 를 채우고, 그대로 검증 통과", async ({
  page,
}) => {
  await loginAs(page, "admin01", "admin01!");
  await page.getByTestId("api-import-btn").click();
  await page.getByTestId("bulk-fill-template-btn").click();
  // 비동기 fetch + setState — toHaveValue 로 자동 대기.
  const ta = page.getByTestId("bulk-import-json");
  await expect(ta).toHaveValue(/library-book-search/);
  await expect(ta).toHaveValue(/A20260509001/);

  await page.getByRole("button", { name: /^검증$/ }).click();
  const summary = page.getByTestId("bulk-import-summary");
  await expect(summary).toContainText("신규 1");
  await expect(summary).toContainText("수정 1");
  await expect(summary).toContainText("실패 0");
});

test("3c. 등록 예시 — [예시 다운로드] 트리거", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  await page.getByTestId("api-import-btn").click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("bulk-download-template-btn").click();
  const dl = await downloadPromise;
  expect(dl.suggestedFilename()).toBe("apis-template.json");
});

test("4. 단건 JSON 편집 — 이름 변경 → 목록 반영", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");

  // 첫 행 (정렬 desc → A20260509005 = 알림 발송)
  await page
    .locator('[data-testid="api-row"]')
    .filter({ hasText: "사용자 정보 조회" })
    .getByTestId("json-edit-btn")
    .click();

  const ta = page.getByTestId("json-edit-textarea");
  await expect(ta).toBeVisible();
  const original = await ta.inputValue();
  const next = original.replace(
    /"name": "사용자 정보 조회"/,
    '"name": "사용자 정보 조회 (JSON)"',
  );
  expect(next).not.toBe(original);
  await ta.fill(next);

  await page.getByRole("button", { name: /^저장$/ }).click();
  await expect(page.getByText(/JSON 으로 수정했습니다/)).toBeVisible();
  await expect(
    page
      .locator('[data-testid="api-row"]')
      .filter({ hasText: "사용자 정보 조회 (JSON)" }),
  ).toHaveCount(1);
});

test("5. 단건 JSON 편집 — path 충돌 → 인라인 에러", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  await page
    .locator('[data-testid="api-row"]')
    .filter({ hasText: "성적 목록 조회" })
    .getByTestId("json-edit-btn")
    .click();

  const ta = page.getByTestId("json-edit-textarea");
  const original = await ta.inputValue();
  const next = original.replace(
    /"path": "sample-grade-list"/,
    '"path": "sample-user-info"',
  );
  await ta.fill(next);
  await page.getByRole("button", { name: /^저장$/ }).click();
  await expect(page.getByTestId("json-edit-error")).toContainText(
    "이미 사용 중인 경로입니다",
  );
});

// ---------- DataSource ----------

test("6. DS — 예시 채우기 → 검증 통과 → 적용 → 행 6건", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  await page.goto("/datasource");
  await page.getByTestId("ds-import-btn").click();
  await page.getByTestId("bulk-fill-template-btn").click();

  const ta = page.getByTestId("bulk-import-json");
  await expect(ta).toHaveValue(/DAU-WAREHOUSE-PROD/);
  await expect(ta).toHaveValue(/DS20260509005/);

  await page.getByRole("button", { name: /^검증$/ }).click();
  const summary = page.getByTestId("bulk-import-summary");
  await expect(summary).toContainText("신규 1");
  await expect(summary).toContainText("수정 1");
  await expect(summary).toContainText("실패 0");

  await page.getByRole("button", { name: /^적용$/ }).click();
  await expect(page.getByText(/데이터소스 import 완료/)).toBeVisible();
  await expect(page.locator('[data-testid="ds-row"]')).toHaveCount(6);
});

test("7. DS — 단건 JSON 편집 → 풀 크기 변경", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  await page.goto("/datasource");
  await page
    .locator('[data-testid="ds-row"]')
    .filter({ hasText: "DAU-CORE-STG" })
    .getByTestId("ds-json-edit-btn")
    .click();

  const ta = page.getByTestId("json-edit-textarea");
  const original = await ta.inputValue();
  const next = original.replace(/"poolMax": \d+/, '"poolMax": 99');
  await ta.fill(next);
  await page.getByRole("button", { name: /^저장$/ }).click();
  await expect(page.getByText(/JSON 으로 수정했습니다/)).toBeVisible();
});

test("8. DS — JSON 내보내기 download", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  await page.goto("/datasource");
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("ds-export-btn").click();
  const dl = await downloadPromise;
  expect(dl.suggestedFilename()).toMatch(/^datasources-\d{4}-\d{2}-\d{2}\.json$/);
});

// ---------- ExtSystem ----------

test("9. ExtSys — 예시 채우기 → 검증 → 적용 → 행 2건", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  await page.goto("/ext-system");
  await page.getByTestId("ext-import-btn").click();
  await page.getByTestId("bulk-fill-template-btn").click();

  const ta = page.getByTestId("bulk-import-json");
  await expect(ta).toHaveValue(/외부분석시스템/);
  await expect(ta).toHaveValue(/E20260509001/);

  await page.getByRole("button", { name: /^검증$/ }).click();
  const summary = page.getByTestId("bulk-import-summary");
  await expect(summary).toContainText("신규 1");
  await expect(summary).toContainText("수정 1");
  await expect(summary).toContainText("실패 0");

  await page.getByRole("button", { name: /^적용$/ }).click();
  await expect(page.getByText(/연계시스템 import 완료/)).toBeVisible();
  await expect(page.locator('[data-testid="ext-row"]')).toHaveCount(2);
});

test("10. ExtSys — 매핑 API 미존재 → 거부", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  await page.goto("/ext-system");
  await page.getByTestId("ext-import-btn").click();
  await page.getByTestId("bulk-import-json").fill(
    JSON.stringify({
      version: 1,
      kind: "extSystem",
      items: [
        {
          name: "오류시스템",
          allowedIps: ["127.0.0.1/32"],
          useBegin: "2026-01-01T00:00:00",
          useEnd: "2026-12-31T23:59:59",
          mappedApis: ["A99999"],
          status: "ACTIVE",
        },
      ],
    }),
  );
  await page.getByRole("button", { name: /^검증$/ }).click();
  await expect(page.getByText(/MAPPED_API_NOT_FOUND/)).toBeVisible();
  await expect(page.getByRole("button", { name: /^적용$/ })).toBeDisabled();
});

test("11. ExtSys — JSON 내보내기 download (certKey 평문 포함)", async ({ page, request }) => {
  await loginAs(page, "admin01", "admin01!");
  await page.goto("/ext-system");
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("ext-export-btn").click();
  const dl = await downloadPromise;
  expect(dl.suggestedFilename()).toMatch(/^ext-systems-\d{4}-\d{2}-\d{2}\.json$/);

  // 응답 본문에 certKey 평문이 들어있는지 직접 확인
  const res = await request.get("/api/mock/ext-systems/export", {
    headers: { cookie: `mock-jwt=admin01` },
  });
  const body = await res.json();
  expect(body.items[0].certKey).toMatch(/^AKAD/);
});
