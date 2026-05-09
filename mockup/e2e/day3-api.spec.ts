// Day 3: API 목록 + 등록(4탭) + 수정 + 삭제 + path 중복 검증.
import { expect, test, type Page } from "@playwright/test";

async function loginAs(page: Page, id: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("아이디").fill(id);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL(/\/api-list$/);
}

async function fillSql(page: Page, sql: string) {
  // Monaco 의 textarea 셀렉터는 버전마다 흔들린다(.ime-text-area / .inputarea / 비-textarea).
  // SqlEditor 가 onMount 에서 window.__sqlEditor 로 editor 인스턴스를 노출하므로
  // 테스트는 editor.setValue 로 직접 값 설정. (단, react-hook-form 의 onChange 전파 위해 dispatch 필요.)
  await page.waitForFunction(() => Boolean((window as Window & { __sqlEditor?: unknown }).__sqlEditor));
  await page.evaluate((value) => {
    const ed = (window as Window & { __sqlEditor?: { setValue: (v: string) => void } })
      .__sqlEditor;
    ed?.setValue(value);
  }, sql);
}

test.beforeEach(async ({ context, request }) => {
  await context.clearCookies();
  await request.post("/api/mock/reset");
});

test("1. /api-list 진입 시 시드 5개 표시 + 검색 필터", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  await expect(page.getByRole("heading", { name: "API 목록" })).toBeVisible();
  await expect(page.locator('[data-testid="api-row"]')).toHaveCount(5);
  await expect(page.getByText("총 5 건")).toBeVisible();

  // "사용자" 검색 → 시드 중 사용자 정보 조회 1건만
  await page.getByPlaceholder("번호·이름·경로·그룹 검색").fill("사용자");
  await expect(page.locator('[data-testid="api-row"]')).toHaveCount(1);
  await expect(page.getByText("사용자 정보 조회")).toBeVisible();
});

test("2. 신규 등록 — 4탭 입력 후 등록 → 목록에 즉시 반영", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  await page.getByRole("link", { name: "+ 신규 등록" }).click();
  await page.waitForURL(/\/api-list\/new$/);

  // 기본 정보 탭
  await page.getByLabel("API 이름 *").fill("신규 테스트 API");
  await page.getByLabel("그룹 *").fill("TEST");
  await page.getByLabel("경로(path) *").fill("e2e-test-path");
  await page.getByRole("button", { name: "중복확인" }).click();
  await expect(page.getByText("사용 가능한 경로입니다.")).toBeVisible();

  // SQL 탭
  await page.getByRole("tab", { name: "SQL" }).click();
  await fillSql(page, "SELECT 1 FROM dual WHERE id = #{id}");
  await page.getByRole("button", { name: "SQL 검증" }).click();
  await expect(page.getByText("Plan: SELECT")).toBeVisible();

  // 응답 컬럼 탭 — 이미 1행 있음, col 만 채움
  await page.getByRole("tab", { name: "응답 컬럼" }).click();
  await page
    .getByRole("tabpanel")
    .locator('input[name="resps.0.col"]')
    .fill("result");

  // 등록
  await page.getByRole("button", { name: "등록" }).click();
  await expect(page.getByText("등록되었습니다.")).toBeVisible();
  await page.waitForURL(/\/api-list$/);

  // 목록에 6 건
  await expect(page.locator('[data-testid="api-row"]')).toHaveCount(6);
  await expect(page.getByText("신규 테스트 API")).toBeVisible();
  await expect(page.getByText("e2e-test-path")).toBeVisible();
});

test("3. path 중복 등록 시도 → 토스트 에러", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  await page.goto("/api-list/new");

  await page.getByLabel("API 이름 *").fill("중복 테스트");
  await page.getByLabel("그룹 *").fill("TEST");
  // 시드의 sample-user-info 와 동일
  await page.getByLabel("경로(path) *").fill("sample-user-info");
  await page.getByRole("button", { name: "중복확인" }).click();
  await expect(page.getByText("이미 사용 중인 경로입니다.")).toBeVisible();
});

test("4. 기존 API 수정 → 목록에 새 이름 반영", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  await page.getByRole("link", { name: "사용자 정보 조회" }).click();
  await page.waitForURL(/\/api-list\/A\d+$/);

  const nameInput = page.getByLabel("API 이름 *");
  await nameInput.fill("");
  await nameInput.fill("사용자 정보 조회 (수정)");
  await page.getByRole("button", { name: "수정 저장" }).click();
  await expect(page.getByText("수정되었습니다.")).toBeVisible();
  await page.waitForURL(/\/api-list$/);
  await expect(page.getByText("사용자 정보 조회 (수정)")).toBeVisible();
});

test("5. 삭제 — confirm 수락 후 목록에서 제거", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  page.on("dialog", (d) => d.accept());

  await page.getByRole("link", { name: "사용자 정보 조회" }).click();
  await page.waitForURL(/\/api-list\/A\d+$/);
  await page.getByRole("button", { name: "삭제" }).click();
  await expect(page.getByText("삭제되었습니다.")).toBeVisible();
  await page.waitForURL(/\/api-list$/);
  await expect(page.locator('[data-testid="api-row"]')).toHaveCount(4);
  await expect(page.getByText("사용자 정보 조회")).toHaveCount(0);
});

test("6. 정렬 — 번호 헤더 클릭 시 방향 토글", async ({ page }) => {
  await loginAs(page, "admin01", "admin01!");
  // 기본 정렬은 no desc → 첫 행이 가장 큰 번호 (A20260509005)
  const firstRowFirstCell = page
    .locator('[data-testid="api-row"]')
    .first()
    .locator("td")
    .first();
  await expect(firstRowFirstCell).toContainText("A20260509005");

  // 번호 헤더 클릭 → no asc 로 토글 → 첫 행이 A20260509001
  await page.getByRole("columnheader", { name: /^번호/ }).click();
  await expect(firstRowFirstCell).toContainText("A20260509001");
});
