import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3100",
    channel: "chrome",
    viewport: { width: 1440, height: 1050 },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node tests/fixtures/mock-ai-server.mjs",
      url: "http://127.0.0.1:3111",
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --port 3100",
      url: "http://127.0.0.1:3100/api/patient",
      env: {
        WARDZERO_DATA_NAME: `browser-${Date.now()}`,
        WARDZERO_AI_PROVIDER: "openai",
        WARDZERO_AI_BASE_URL: "http://127.0.0.1:3111/v1",
        WARDZERO_AI_MODEL: "mock-protocol-fixture",
      },
      timeout: 60000,
      reuseExistingServer: false,
    },
  ],
});
