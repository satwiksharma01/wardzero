import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test("live Gemini observations raise concern and reach a recorded caregiver response", async ({
  page,
  request,
}) => {
  const started = Date.now();
  const now = Date.now();
  const readings = [0, 1, 2].map((step) => ({
    eventId: `live-base-${step}`,
    patientId: "patient-001",
    deviceId: "simulator-001",
    sequence: step,
    observedAt: new Date(now - (2 - step) * 5000).toISOString(),
    metrics: {
      pulseBpm: 76,
      oxygenPct: 98,
      temperatureC: 36.8,
      respiratoryRate: 16,
    },
  }));
  const response = await request.post("/api/readings/batch", {
    headers: { Origin: "http://127.0.0.1:3102" },
    data: { readings },
  });
  expect(response.ok()).toBe(true);
  await page.goto("/");
  await expect(page.getByTestId("concern-level")).toHaveText("Low");
  await page.getByRole("button", { name: "Activate identity" }).click();
  await expect(
    page.getByText("Ananya Shah · Primary caregiver", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Patient observation", { exact: true })
    .fill("More tired today and barely ate lunch.");
  await page.getByRole("button", { name: "Save observation" }).click();
  await expect(
    page.getByText("AI analysis: Complete", { exact: true }),
  ).toBeVisible({ timeout: 22000 });
  await expect(page.getByTestId("concern-level")).toHaveText("Medium");
  await page.getByRole("button", { name: "Acknowledge alert" }).click();
  await page
    .getByLabel("Caregiver action", { exact: true })
    .fill(
      "Contacted the care coordinator to review the reported observations.",
    );
  await page
    .getByRole("button", { name: "Record action", exact: true })
    .click();
  const snapshot = await (await request.get("/api/patient")).json();
  expect(snapshot.care.notes[0].model.startsWith("gemini:")).toBe(true);
  expect(snapshot.care.alerts[0].state).toBe("ActionRecorded");
  expect(
    snapshot.care.alerts[0].assessment.reasons.some(
      (reason: { noteIds?: string[] }) =>
        reason.noteIds?.includes(snapshot.care.notes[0].id),
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: "documents/verification/live-gemini-care-loop.png",
    fullPage: true,
  });
  await writeFile(
    "documents/verification/gemini-live-journey.json",
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        model: snapshot.care.notes[0].model,
        elapsedMs: Date.now() - started,
        initialConcern: "Low",
        finalConcern: snapshot.care.currentAssessment.concern,
        alertState: snapshot.care.alerts[0].state,
        noteStatus: snapshot.care.notes[0].status,
      },
      null,
      2,
    ),
  );
});
