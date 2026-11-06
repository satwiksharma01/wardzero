import { expect, test } from "@playwright/test";

test("simulator persists readings through the API and survives browser reload", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.goto("/");
  await expect(
    page.getByText("Awaiting first reading", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("concern-level")).toBeVisible();
  for (let index = 1; index <= 4; index++) {
    await page.getByRole("button", { name: "Send one reading" }).click();
    await expect(page.getByRole("status")).toContainText(
      `Reading ${index} stored`,
    );
  }
  await expect(
    page.getByText("4 recent / 4 stored", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Current", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("4 recent / 4 stored", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Chart measurement" })
    .selectOption("pulseBpm");
  await expect(
    page.getByRole("img", { name: /Heart rate, 4 readings/ }).last(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Stream every 5s" }).click();
  await expect(page.getByRole("status")).toContainText("Reading 1 stored", {
    timeout: 12000,
  });
  await page.getByRole("button", { name: "Pause stream" }).click();
  await expect(
    page.getByText("5 recent / 5 stored", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: "documents/verification/care-loop-overview.png",
    fullPage: true,
  });
  expect(failures).toEqual([]);
});

test("compact screens retain care status and have no page overflow", async ({
  page,
}) => {
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByTestId("concern-level")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Send one reading" }),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (width === 320)
      await page.screenshot({
        path: "documents/verification/care-loop-mobile.png",
        fullPage: true,
      });
  }
});

test("API reports duplicate/conflict and rejects cross-origin mutations", async ({
  request,
}) => {
  const event = {
    eventId: "api-contract-test",
    patientId: "patient-001",
    deviceId: "simulator-001",
    sequence: 0,
    observedAt: new Date().toISOString(),
    metrics: {
      pulseBpm: 78,
      oxygenPct: 98,
      temperatureC: 36.8,
      respiratoryRate: 16,
    },
  };
  const headers = { Origin: "http://127.0.0.1:3100" };
  const accepted = await request.post("/api/readings/batch", {
    headers,
    data: { readings: [event] },
  });
  expect((await accepted.json()).results[0].status).toBe("accepted");
  const duplicate = await request.post("/api/readings/batch", {
    headers,
    data: { readings: [event] },
  });
  expect((await duplicate.json()).results[0].status).toBe("duplicate");
  const conflict = await request.post("/api/readings/batch", {
    headers,
    data: { readings: [{ ...event, sequence: 998 }] },
  });
  expect((await conflict.json()).results[0].status).toBe("conflict");
  const blocked = await request.post("/api/readings/batch", {
    headers: { Origin: "https://other.example" },
    data: { readings: [event] },
  });
  expect(blocked.status()).toBe(403);
});

test("caregiver notes pass through the HTTP adapter and contribute evidence to concern", async ({
  page,
}) => {
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
  ).toBeVisible();
  await expect(page.getByTestId("concern-level")).toHaveText("Medium");
  await expect(
    page.getByText("mock-protocol-fixture", { exact: false }).first(),
  ).toBeVisible();
  await page
    .getByLabel("Patient observation", { exact: true })
    .fill("[MOCK_FAILURE] Unable to analyze this note.");
  await page.getByRole("button", { name: "Save observation" }).click();
  await expect(
    page.getByText("AI analysis: Failed", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("AI analysis: Complete", { exact: true }),
  ).toBeVisible();
});

test("deterioration opens one alert and the assigned caregiver completes a persistent response", async ({
  page,
  context,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Patient scenario" })
    .selectOption("deteriorating");
  for (let index = 1; index <= 13; index++) {
    await page.getByRole("button", { name: "Send one reading" }).click();
    await expect(page.getByRole("status")).toContainText(
      `Reading ${index} stored`,
    );
  }
  await expect(page.getByTestId("concern-level")).toHaveText("High");
  await expect(page.getByText("1 active", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "Acknowledge alert" }),
  ).toBeVisible();
  await page.screenshot({
    path: "documents/verification/care-loop-alert-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1050 });
  const snapshot = await (await context.request.get("/api/patient")).json();
  const alertId = snapshot.care.alerts[0].id;
  const actionUrl = `/api/alerts/${alertId}/events`;
  const headers = { Origin: "http://127.0.0.1:3100" };
  const anonymous = await context.request.post(actionUrl, {
    headers,
    data: { eventId: "anonymous-browser", action: "acknowledge" },
  });
  expect(anonymous.status()).toBe(401);
  await page
    .getByRole("combobox", { name: "Demo identity" })
    .selectOption("backup");
  await page.getByRole("button", { name: "Activate identity" }).click();
  await expect(
    page.getByText("Ravi Menon · Backup coordinator", { exact: true }),
  ).toBeVisible();
  const unassigned = await context.request.post(actionUrl, {
    headers,
    data: { eventId: "wrong-actor-browser", action: "acknowledge" },
  });
  expect(unassigned.status()).toBe(403);
  await page
    .getByRole("combobox", { name: "Demo identity" })
    .selectOption("primary");
  await page.getByRole("button", { name: "Activate identity" }).click();
  await expect(
    page.getByRole("button", { name: "Acknowledge alert" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Acknowledge alert" }).click();
  await expect(
    page.getByLabel("Caregiver action", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Caregiver action", { exact: true })
    .fill("Contacted the care coordinator and recorded a simulated review.");
  await page
    .getByRole("button", { name: "Record action", exact: true })
    .click();
  await page
    .getByLabel("Resolution reason", { exact: true })
    .fill(
      "The coordinator reviewed this synthetic scenario and documented the outcome.",
    );
  await page
    .getByRole("button", { name: "Resolve alert", exact: true })
    .click();
  await expect(page.getByText("0 active", { exact: true })).toBeVisible();
  await expect(page.getByTestId("concern-level")).toHaveText("High");
  await page.reload();
  await expect(
    page.getByText(
      "Response completed. The current concern above is assessed separately.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Contacted the care coordinator and recorded a simulated review.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: "documents/verification/care-loop-completed.png",
    fullPage: true,
  });
  expect(failures).toEqual([]);
});

test("durable sensor queue survives refresh and actual transport failure without duplicate readings", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const before = (await (await context.request.get("/api/patient")).json())
    .total;
  await page
    .getByRole("button", { name: "Disconnect sensor", exact: true })
    .click();
  for (let index = 1; index <= 3; index++) {
    await page.getByRole("button", { name: "Send one reading" }).click();
    await expect(page.getByTestId("queue-count")).toContainText(
      `${index} queued`,
    );
  }
  await page.reload();
  await expect(page.getByTestId("queue-count")).toContainText("3 queued");
  await expect(
    page.getByText("Sensor transport offline", { exact: true }),
  ).toBeVisible();
  expect((await (await context.request.get("/api/patient")).json()).total).toBe(
    before,
  );
  await page
    .getByRole("button", { name: "Reconnect sensor", exact: true })
    .click();
  await expect(page.getByTestId("queue-count")).toContainText("0 queued");
  expect((await (await context.request.get("/api/patient")).json()).total).toBe(
    before + 3,
  );
  await page.route("**/api/readings/batch", (route) =>
    route.abort("connectionfailed"),
  );
  await page.getByRole("button", { name: "Send one reading" }).click();
  await expect(page.getByTestId("queue-count")).toContainText("1 queued");
  await expect(page.getByRole("status")).toContainText("saved in this browser");
  await page.unroute("**/api/readings/batch");
  await page.getByRole("button", { name: "Retry queued readings" }).click();
  await expect(page.getByTestId("queue-count")).toContainText("0 queued");
  expect((await (await context.request.get("/api/patient")).json()).total).toBe(
    before + 4,
  );
  await page.route("**/api/readings/batch", async (route) => {
    await route.fetch();
    await route.abort("connectionfailed");
  });
  await page.getByRole("button", { name: "Send one reading" }).click();
  await expect(page.getByTestId("queue-count")).toContainText("1 queued");
  expect((await (await context.request.get("/api/patient")).json()).total).toBe(
    before + 5,
  );
  await page.unroute("**/api/readings/batch");
  await page.getByRole("button", { name: "Retry queued readings" }).click();
  await expect(page.getByTestId("queue-count")).toContainText("0 queued");
  expect((await (await context.request.get("/api/patient")).json()).total).toBe(
    before + 5,
  );
  await page.route("**/api/patient", (route) =>
    route.abort("connectionfailed"),
  );
  await expect(
    page.getByRole("alert").filter({ hasText: "Connection unavailable" }),
  ).toBeVisible({ timeout: 12000 });
  await expect(page.getByTestId("concern-level")).toHaveText("Unavailable");
  await page.unroute("**/api/patient");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Connection unavailable" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "documents/verification/recovered-queue.png",
    fullPage: true,
  });
});
