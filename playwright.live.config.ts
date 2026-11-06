import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/live/browser",
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3102",
    channel: "chrome",
    viewport: { width: 1440, height: 1050 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 3102",
    url: "http://127.0.0.1:3102/api/patient",
    env: { WARDZERO_DATA_NAME: `live-${Date.now()}` },
    timeout: 60000,
    reuseExistingServer: false,
  },
});
