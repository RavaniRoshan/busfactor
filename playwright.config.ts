import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const baseURL = process.env.BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "playwright-results.json" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: {
    command: `pnpm --filter @busfactor/web exec next start -p ${port}`,
    url: `${baseURL}/scan`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      BUSFACTOR_ADMIN_TOKEN: "audit-test-token",
      BUSFACTOR_ALLOW_LOCAL_TARGETS: "1",
      PLAYWRIGHT_TEST: "1",
    },
  },
});
