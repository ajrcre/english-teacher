import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against `next dev` with an embedded database in .data/e2e
 * (no Neon needed). Set PW_CHROMIUM to use a pre-installed Chromium binary.
 */
const executablePath = process.env.PW_CHROMIUM || undefined;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "off",
    launchOptions: { executablePath },
  },
  projects: [
    { name: "phone", use: { ...devices["iPhone 13"], browserName: "chromium", launchOptions: { executablePath } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } } },
  ],
  webServer: {
    command: "rm -rf .data/e2e && PGLITE_DIR=.data/e2e LLM_PROVIDER=none npx next dev -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
