import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test("production worker retries a lost acceptance without duplicate logical delivery or caregiver acknowledgement", async ({
  request,
}) => {
  const accepted = await request.post("/api/readings/batch", {
    headers: { Origin: "http://127.0.0.1:3107" },
    data: {
      readings: [
        {
          eventId: "email-http-high",
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
        },
      ],
    },
  });
  expect(accepted.ok()).toBe(true);
  // No browser or API polling drives the worker during this observation interval.
  await new Promise((resolve) => setTimeout(resolve, 8500));
  const snapshot = await (await request.get("/api/patient")).json();
  const alert = snapshot.care.alerts[0];
  expect(alert.emailDelivery).toMatchObject({ state: "Accepted", attempts: 3 });
  expect(alert.state).toBe("Open");
  expect(
    alert.events.filter(
      (event: { action: string }) => event.action === "escalated",
    ),
  ).toHaveLength(1);
  const stats = await (await request.get("http://127.0.0.1:3112/stats")).json();
  expect(stats).toEqual({
    requests: 3,
    uniqueAccepted: 1,
    stableIdentityAndBody: true,
  });
  expect(JSON.stringify(snapshot)).not.toContain("recipient@example.invalid");
  expect(JSON.stringify(snapshot)).not.toContain("fixture-email-key");
  await writeFile(
    "documents/verification/email-loopback.json",
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        runType: "local-loopback-http-mock",
        realEmailSent: false,
        cloudProviderVerified: false,
        browserOrApiPollingDuringWorkerInterval: false,
        observationMs: 8500,
        ...stats,
        emailDelivery: alert.emailDelivery,
        careState: alert.state,
      },
      null,
      2,
    ),
  );
});
