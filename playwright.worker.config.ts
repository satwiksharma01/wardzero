import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/worker",
  timeout: 60000,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3103", channel: "chrome" },
  webServer: {
    command: "npm run dev -- --port 3103",
    url: "http://127.0.0.1:3103/api/patient",
    env: {
      WARDZERO_DATA_NAME: `worker-${Date.now()}`,
      WARDZERO_ACK_DEADLINE_MS: "2000",
    },
    timeout: 60000,
    reuseExistingServer: false,
  },
});
