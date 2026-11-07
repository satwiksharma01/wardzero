import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { execFileSync } from "node:child_process";

// Records real UI/API transitions. No mocked AI or injected dashboard state.
const baseURL = process.env.WARDZERO_DEMO_URL ?? "http://127.0.0.1:3000";
await mkdir(".data/demo/raw", { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({
  baseURL,
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: ".data/demo/raw", size: { width: 1440, height: 900 } },
});
const headers = { Origin: baseURL };
const identity = await context.request.post("/api/demo/session", {
  headers,
  data: { role: "primary" },
});
expect(identity.ok()).toBe(true);
const reset = await context.request.post("/api/demo", {
  headers,
  data: { action: "reset", id: crypto.randomUUID(), scenario: "stable" },
});
expect(reset.ok()).toBe(true);
const page = await context.newPage();
const started = Date.now();
const cue = async (seconds) => {
  const remaining = seconds * 1000 - (Date.now() - started);
  if (remaining < -4000)
    throw new Error(`Recording fell behind cue ${seconds}s`);
  if (remaining > 0)
    await new Promise((resolve) => setTimeout(resolve, remaining));
};
const button = (name) => page.getByRole("button", { name, exact: true });
const overview = async () =>
  page.getByRole("link", { name: "WardZero home" }).click();
const go = async (name) => {
  await page
    .getByRole("navigation", { name: "Workspace" })
    .getByRole("link", { name, exact: true })
    .click();
};
const newRun = async (scenario) => {
  await go("Simulation");
  await page
    .getByRole("combobox", { name: "New run scenario" })
    .selectOption(scenario);
  await button("New demo run").click();
  await expect(page.getByTestId("concern-level")).toHaveText("Unknown");
};
const checkpoints = [];
try {
  await page.goto("/simulation");
  await expect(
    page.getByText("Awaiting first reading", { exact: true }),
  ).toBeVisible();
  await cue(12);
  for (const second of [12, 17, 22]) {
    await cue(second);
    await button("Send one reading").click();
  }
  await expect(page.getByTestId("concern-level")).toHaveText("Low");
  await cue(26);
  await overview();
  checkpoints.push({ at: 26, concern: "Low", readings: 3 });

  await cue(33);
  await go("Observations");
  await page
    .getByLabel("Patient observation", { exact: true })
    .fill("More tired today and barely ate lunch.");
  await cue(37);
  await button("Save observation").click();
  await expect(
    page.getByText("AI analysis: Complete", { exact: true }),
  ).toBeVisible({ timeout: 22000 });
  await expect(page.getByTestId("concern-level")).toHaveText("Medium");
  await page.locator(".note-entry").first().scrollIntoViewIfNeeded();
  await cue(46);
  await page.getByText("Inspect assessment evidence", { exact: true }).click();
  checkpoints.push({ at: 46, concern: "Medium", liveAI: true });
  await cue(54);
  await go("Simulation");
  await button("Load deterioration").click();
  await expect(page.getByTestId("concern-level")).toHaveText("High");
  await cue(59);
  await overview();

  await cue(65);
  await go("Care response");
  await button("Acknowledge alert").click();
  await expect(
    page.getByLabel("Caregiver action", { exact: true }),
  ).toBeVisible();
  await cue(72);
  await page
    .getByLabel("Caregiver action", { exact: true })
    .fill("Contacted the coordinator and recorded a simulated review.");
  await cue(77);
  await button("Record action").click();
  await page
    .getByLabel("Resolution reason", { exact: true })
    .fill(
      "Coordinator reviewed this synthetic scenario and documented the outcome.",
    );
  await cue(86);
  await button("Resolve alert").click();
  await expect(page.getByText("0 active", { exact: true })).toBeVisible();
  await page.locator(".audit-history").first().scrollIntoViewIfNeeded();
  checkpoints.push({ at: 86, state: "Resolved", currentConcern: "High" });

  await cue(99);
  await newRun("outage");
  await button("Load stable baseline").click();
  await expect(page.getByTestId("concern-level")).toHaveText("Low");
  await button("Disconnect sensor").click();
  for (let count = 1; count <= 3; count++) {
    await button("Send one reading").click();
    await expect(page.getByTestId("queue-count")).toContainText(
      `${count} queued`,
    );
  }
  await cue(113);
  await button("Advance 35 seconds").click();
  await expect(page.getByText("Delayed", { exact: true })).toBeVisible();
  await cue(118);
  await button("Advance 130 seconds").click();
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();
  await cue(122);
  await page.reload();
  await expect(page.getByTestId("queue-count")).toContainText("3 queued");
  await page.getByTestId("queue-count").scrollIntoViewIfNeeded();
  await cue(127);
  await button("Reconnect sensor").click();
  await expect(page.getByTestId("queue-count")).toContainText("0 queued");
  await expect(
    page.getByText("6 recent / 6 stored", { exact: true }),
  ).toBeVisible();
  checkpoints.push({
    at: 127,
    persistedQueue: 3,
    remainingQueue: 0,
    stored: 6,
    clockAdvancedSeconds: 165,
  });

  await cue(135);
  await newRun("no-response");
  await button("Load deterioration").click();
  await expect(page.getByTestId("concern-level")).toHaveText("High");
  await cue(143);
  await button("Advance 130 seconds").click();
  await go("Care response");
  await page
    .getByText(/Escalated in-app to Ravi Menon at/)
    .scrollIntoViewIfNeeded();
  await cue(150);
  await page
    .getByRole("combobox", { name: "Demo identity" })
    .selectOption("backup");
  await button("Activate identity").click();
  await expect(
    page.getByRole("heading", { name: "Coordinator inbox" }),
  ).toBeVisible();
  await cue(157);
  await button("Acknowledge alert").click();
  checkpoints.push({ at: 157, escalatedInApp: true, backupAcknowledged: true });
  await cue(163);
  await page.goto(
    pathToFileURL(path.resolve("documents/submission/closing.svg")).href,
  );
  await cue(180);
  await writeFile(
    "documents/submission/recording-evidence.json",
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        applicationRevision: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        checkpoints,
        synthetic: true,
        aiMocked: false,
      },
      null,
      2,
    ),
  );
  await context.close();
  await page.video().saveAs(".data/demo/raw/wardzero.webm");
  console.log(
    "Recorded .data/demo/raw/wardzero.webm with all scenario assertions passing.",
  );
} finally {
  await context.close();
  await browser.close();
}
