import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/email",
  timeout: 30000,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3107" },
  webServer: [
    {
      command: "node tests/fixtures/mock-email-server.mjs",
      url: "http://127.0.0.1:3112/stats",
      reuseExistingServer: false,
    },
    {
      command: "npm run start -- --port 3107",
      url: "http://127.0.0.1:3107/api/patient",
      env: {
        WARDZERO_DATA_NAME: `email-contract-${Date.now()}`,
        WARDZERO_ACK_DEADLINE_MS: "2000",
        WARDZERO_EMAIL_ENABLED: "true",
        WARDZERO_EMAIL_API_KEY: "fixture-email-key",
        WARDZERO_EMAIL_FROM: "sender@example.invalid",
        WARDZERO_EMAIL_TO: "recipient@example.invalid",
        WARDZERO_EMAIL_ENDPOINT: "http://127.0.0.1:3112/emails",
      },
      timeout: 60000,
      reuseExistingServer: false,
    },
  ],
});
