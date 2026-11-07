import { defineConfig } from "@playwright/test";

const remote = process.env.WARDZERO_PAGES_URL;
export default defineConfig({
  testDir: "./tests/pages",
  timeout: 180000,
  expect: { timeout: 15000 },
  workers: 1,
  use: {
    baseURL: remote ?? "http://127.0.0.1:3120/wardzero/",
    channel: process.env.CI ? undefined : "chrome",
    viewport: { width: 1440, height: 1050 },
    trace: "retain-on-failure",
  },
  webServer: remote
    ? undefined
    : {
        command:
          "node node_modules/vite/bin/vite.js preview --config vite.pages.config.ts --base /wardzero/ --host 127.0.0.1 --port 3120 --strictPort",
        url: "http://127.0.0.1:3120/wardzero/",
        reuseExistingServer: false,
      },
});
