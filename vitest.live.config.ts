import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/live/*.probe.ts"],
    testTimeout: 300000,
    hookTimeout: 60000,
    maxWorkers: 1,
  },
});
