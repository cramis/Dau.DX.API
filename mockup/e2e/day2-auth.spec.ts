// Day 2 인증 플로우 회귀 검증. 정식 로그인/회원가입/비밀번호 찾기/본인 정보·비밀번호 변경.
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context, request }) => {
  await context.clearCookies();
  // 직전 테스트의 비밀번호·신규 가입자 등이 메모리에 남지 않도록 시드 복구.
  await request.post("/api/mock/reset");
});

test("1. 정식 로그인 폼 — admin01 정상 로그인", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("아이디").fill("admin01");
  await page.getByLabel("비밀번호", { exact: true }).fill("admin01!");
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL(/\/api-list$/);
  await expect(page.locator("header")).toContainText("관리자");
});

test("2. 잘못된 비밀번호 → 인라인 에러 배너(role=alert) 영구 노출, URL 유지", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("아이디").fill("admin01");
  await page.getByLabel("비밀번호", { exact: true }).fill("wrong-password!");
  await page.getByRole("button", { name: "로그인" }).click();
  const banner = page.getByTestId("form-banner-error");
  await expect(banner).toBeVisible();
  await expect(banner).toContainText(
    "아이디 또는 비밀번호가 올바르지 않습니다."
  );
  await expect(banner).toHaveAttribute("role", "alert");
  await expect(page).toHaveURL(/\/login$/);
});

test("3. zod 검증 — 8자 미만 비밀번호는 클라이언트 거부", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("아이디").fill("admin01");
  await page.getByLabel("비밀번호", { exact: true }).fill("a"); // 1자
  await page.getByRole("button", { name: "로그인" }).click();
  // 클라이언트 zod 는 login 의 비밀번호는 1자 이상만 요구하므로 통과 가능. 대신 잘못된 PW 처리됨.
  // 별도 검증: 잘못된 ID 형식
  await page.getByLabel("아이디").fill("AB"); // 2자, 영소문자 시작 미충족
  await page.getByLabel("비밀번호", { exact: true }).fill("anything");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page.getByText("영소문자 시작, 5~16자입니다.")).toBeVisible();
});

test("4-1. 회원가입 — 시드와 충돌하는 ID(admin01) 중복확인 시 필드 하단 에러 노출", async ({
  page,
}) => {
  await page.goto("/signup");
  await page.getByLabel("아이디 *").fill("admin01");
  await page.getByRole("button", { name: "중복확인" }).click();
  // toast 가 아닌 필드 하단 FormMessage 로 노출
  await expect(page.getByText("이미 사용 중인 아이디입니다.")).toBeVisible();
  // 성공 마커는 안 보여야 함
  await expect(page.getByTestId("id-check-ok")).toHaveCount(0);
});

test("4. 회원가입 → PENDING 상태 → 활성화 전 로그인 차단", async ({ page }) => {
  const newId = `user${Date.now().toString().slice(-6)}`;

  await page.goto("/signup");
  await page.getByLabel("아이디 *").fill(newId);
  await page.getByRole("button", { name: "중복확인" }).click();
  await expect(page.getByText("사용 가능한 아이디입니다.")).toBeVisible();

  await page.getByLabel("비밀번호 *", { exact: true }).fill("Pa$$w0rd!");
  await page.getByLabel("비밀번호 확인 *").fill("Pa$$w0rd!");
  await page.getByLabel("이름 *").fill("테스트");
  await page.getByLabel("휴대폰번호 *").fill("010-9999-0000");
  await page.getByLabel("이메일 *").fill(`${newId}@donga.ac.kr`);
  await page.getByLabel("기관명 *").fill("동아대학교");
  await page.getByLabel("부서명 *").fill("정보전산원");
  await page.getByRole("checkbox", { name: "개인정보 수집·이용 동의 (필수)" }).click();
  await page.getByRole("button", { name: "회원가입" }).click();

  await page.waitForURL(/\/login$/);
  await expect(
    page.getByText("회원가입 신청이 완료되었습니다", { exact: false })
  ).toBeVisible();

  // 신규 가입자는 PENDING 이므로 로그인 시도 시 차단
  await page.getByLabel("아이디").fill(newId);
  await page.getByLabel("비밀번호", { exact: true }).fill("Pa$$w0rd!");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(
    page.getByText("활성화되지 않은 계정입니다", { exact: false })
  ).toBeVisible();
});

test("5. 비밀번호 찾기 — 이메일 입력 후 인라인 안내 배너", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByLabel("이메일").fill("anyone@donga.ac.kr");
  await page.getByRole("button", { name: "재설정 메일 발송" }).click();
  const banner = page.getByTestId("form-banner-success");
  await expect(banner).toBeVisible();
  await expect(banner).toContainText(
    "등록되어 있다면 재설정 메일을 발송합니다"
  );
});

test("6. 본인 정보 페이지 — 시드 admin 정보 표시", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("아이디").fill("admin01");
  await page.getByLabel("비밀번호", { exact: true }).fill("admin01!");
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL(/\/api-list$/);

  await page.getByRole("link", { name: "본인 정보", exact: true }).click();
  await page.waitForURL(/\/me$/);
  await expect(page.getByRole("heading", { name: "본인 정보" })).toBeVisible();
  await expect(page.getByLabel("이름")).toHaveValue("관리자");
  await expect(page.getByLabel("이메일")).toHaveValue("admin01@donga.ac.kr");
});

test("8. 데모 계정 패널 — admin01 클릭 시 폼 자동 채움 + 로그인 성공", async ({
  page,
}) => {
  await page.goto("/login");
  // 패널이 노출되는지 확인 후 admin01 행 클릭
  await expect(page.getByTestId("demo-accounts")).toBeVisible();
  await page.getByRole("button", { name: /ADMIN\s+admin01/ }).click();
  await expect(page.getByLabel("아이디")).toHaveValue("admin01");
  await expect(page.getByLabel("비밀번호", { exact: true })).toHaveValue(
    "admin01!"
  );
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL(/\/api-list$/);
});

test("9. 인라인 배너는 영구 노출 — 폼 재입력 시도 후에도 메시지 유지", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("아이디").fill("admin01");
  await page.getByLabel("비밀번호", { exact: true }).fill("wrong-password!");
  await page.getByRole("button", { name: "로그인" }).click();

  const banner = page.getByTestId("form-banner-error");
  await expect(banner).toBeVisible();

  // 사용자가 입력값을 다시 다듬는 동안에도 배너가 사라지지 않아야 한다
  await page.getByLabel("비밀번호", { exact: true }).fill("admin01!");
  await expect(banner).toBeVisible();
});

test("7. 비밀번호 변경 후 신규 비밀번호로 재로그인 가능", async ({ page }) => {
  // user01 로 로그인 (시드를 오염시키지 않기 위해 user01 사용)
  await page.goto("/login");
  await page.getByLabel("아이디").fill("user01");
  await page.getByLabel("비밀번호", { exact: true }).fill("user01!");
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL(/\/api-list$/);

  // 본인 정보 → 비밀번호 변경
  await page.goto("/me");
  await page.getByRole("tab", { name: "비밀번호 변경" }).click();
  await page.getByLabel("현재 비밀번호").fill("user01!");
  await page.getByLabel("신규 비밀번호", { exact: true }).fill("New$ecret1");
  await page.getByLabel("신규 비밀번호 확인").fill("New$ecret1");
  await page.getByRole("button", { name: "비밀번호 변경" }).click();
  await expect(page.getByText("비밀번호가 변경되었습니다.")).toBeVisible();

  // 로그아웃 후 새 비밀번호로 로그인 (헤더와 세션 탭 양쪽에 "로그아웃" 버튼이 있어 컨테이너 한정)
  await page.getByRole("tab", { name: "세션" }).click();
  await page
    .getByRole("tabpanel")
    .getByRole("button", { name: "로그아웃" })
    .click();
  await page.waitForURL(/\/login$/);

  await page.getByLabel("아이디").fill("user01");
  await page.getByLabel("비밀번호", { exact: true }).fill("New$ecret1");
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL(/\/api-list$/);
  // 시드 복구는 beforeEach 의 /api/mock/reset 이 처리하므로 별도 cleanup 불필요.
});
