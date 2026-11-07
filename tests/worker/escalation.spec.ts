import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test("deadline worker escalates while every browser page is closed", async ({
  browser,
  request,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3103");
  const event = {
    eventId: "closed-browser-high",
    patientId: "patient-001",
    deviceId: "simulator-001",
    sequence: 0,
    observedAt: new Date().toISOString(),
    metrics: {
      pulseBpm: 118,
      oxygenPct: 92,
      temperatureC: 38,
      respiratoryRate: 24,
    },
  };
  const accepted = await request.post("/api/readings/batch", {
    headers: { Origin: "http://127.0.0.1:3103" },
    data: { readings: [event] },
  });
  expect(accepted.ok()).toBe(true);
  await context.close();
  // This deliberate observation interval gives the autonomous server timer time to run; no requests are made.
  await new Promise((resolve) => setTimeout(resolve, 4000));
  const snapshot = await (await request.get("/api/patient")).json();
  const alert = snapshot.care.alerts[0];
  expect(alert.escalatedAt).not.toBeNull();
  expect(
    alert.events.filter(
      (event: { action: string }) => event.action === "escalated",
    ),
  ).toHaveLength(1);
  expect(snapshot.care.workerLastTickAt).not.toBeNull();
  const newContext = await browser.newContext();
  const reopened = await newContext.newPage();
  await reopened.goto("http://127.0.0.1:3103/care");
  await reopened
    .getByRole("combobox", { name: "Demo identity" })
    .selectOption("backup");
  await reopened.getByRole("button", { name: "Activate identity" }).click();
  await expect(
    reopened.getByRole("heading", { name: "Coordinator inbox" }),
  ).toBeVisible();
  await reopened.getByRole("button", { name: "Acknowledge alert" }).click();
  await expect(
    reopened.getByLabel("Caregiver action", { exact: true }),
  ).toBeVisible();
  await reopened.screenshot({
    path: "documents/verification/coordinator-escalation.png",
    fullPage: true,
  });
  await writeFile(
    "documents/verification/closed-browser-worker.json",
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        browserClosedForMs: 4000,
        deadlineAt: alert.acknowledgementDueAt,
        escalatedAt: alert.escalatedAt,
        workerLastTickAt: snapshot.care.workerLastTickAt,
        escalationEvents: 1,
      },
      null,
      2,
    ),
  );
  await newContext.close();
});
