// Playwright e2e 설정. baseURL 만 지정하고 dev 서버는 외부에서 띄워 둔다(reuse).
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // Bun + Turbopack dev 환경의 일시적 module reload race 회피용. CI 에서는 0 권장.
  retries: 1,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
