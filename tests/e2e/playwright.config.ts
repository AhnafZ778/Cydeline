import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

/**
 * Keyboard-first end-to-end checks for the Defender workbench (Ahnaf's segment).
 * Runs against the in-browser Stateful AI Simulation, so no backend is needed.
 *
 *   cd tests/e2e && npm install && npm test
 *
 * Browsers: uses system Chrome when found (CHROME_PATH overrides), otherwise Playwright's own
 * Chromium (`npx playwright install chromium`). Set BASE_URL to test an already-running server.
 */
const chrome = process.env.CHROME_PATH ?? ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
const PORT = 5175;

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.ts/,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? `http://127.0.0.1:${PORT}`,
    viewport: { width: 1440, height: 900 },
    launchOptions: { executablePath: chrome, args: ["--no-sandbox"] },
    trace: "retain-on-failure",
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `cd ../../apps/web && npx vite --host 127.0.0.1 --port ${PORT} --strictPort`,
        url: `http://127.0.0.1:${PORT}`,
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
