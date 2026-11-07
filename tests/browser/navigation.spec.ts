import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";
import { go } from "./navigation-helpers";
import { expect, test } from "@playwright/test";

test("a stalled identity lookup restores activation after its bounded timeout", async ({
  page,
}) => {
  await page.route("**/api/demo/session", (route) => {
    if (route.request().method() !== "GET") return route.continue();
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Checking identity…" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Activate identity" }),
  ).toBeEnabled({ timeout: 15000 });
  await expect(
    page.getByText("Demo session unavailable. Retry activation."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Activate identity" }).click();
  await expect(
    page.getByText("Ananya Shah · Primary caregiver", { exact: true }),
  ).toBeVisible();
});

test("five real pages support deep links, active navigation and shared sensor/draft state", async ({
  page,
}) => {
  await page.goto("/simulation");
  await expect(
    page.getByRole("heading", { name: "Simulation", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Workspace" })
      .getByRole("link", { name: "Simulation", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Activate identity" }).click();
  await expect(
    page.getByText("Ananya Shah · Primary caregiver", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New demo run" }).click();
  await page.getByRole("button", { name: "Load stable baseline" }).click();
  await page.getByRole("button", { name: "Stream every 5s" }).click();
  const before = (await (await page.request.get("/api/patient")).json()).total;
  await page
    .getByRole("navigation", { name: "Workspace" })
    .getByRole("link", { name: "Observations", exact: true })
    .click();
  await expect(page).toHaveURL(/\/observations$/);
  await expect(
    page.getByRole("button", { name: "Send one reading" }),
  ).toHaveCount(0);
  await page
    .getByLabel("Patient observation", { exact: true })
    .fill("Draft preserved while checking the vital history.");
  await page
    .getByRole("navigation", { name: "Workspace" })
    .getByRole("link", { name: "Vitals", exact: true })
    .click();
  await expect(page).toHaveURL(/\/vitals$/);
  await expect(
    page.getByRole("heading", { name: "Reading log" }),
  ).toBeVisible();
  await expect
    .poll(
      async () => (await (await page.request.get("/api/patient")).json()).total,
      { timeout: 12000 },
    )
    .toBeGreaterThan(before);
  await page.goBack();
  await expect(
    page.getByLabel("Patient observation", { exact: true }),
  ).toHaveValue("Draft preserved while checking the vital history.");
  await page
    .getByRole("navigation", { name: "Workspace" })
    .getByRole("link", { name: "Simulation", exact: true })
    .click();
  await page.getByRole("button", { name: "Pause stream" }).click();
  await page.goto("/care");
  await expect(
    page.getByRole("heading", { name: "Care response", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save observation" }),
  ).toHaveCount(0);
});

test("a lost demo reset acknowledgement retains its command identity across page navigation", async ({
  page,
}) => {
  await page.goto("/simulation");
  await page.getByRole("button", { name: "Activate identity" }).click();
  await expect(
    page.getByText("Ananya Shah · Primary caregiver", { exact: true }),
  ).toBeVisible();
  const requests: string[] = [];
  await page.route("**/api/demo", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    requests.push(route.request().postData()!);
    await route.fetch();
    await route.abort("connectionfailed");
  });
  await page.getByRole("button", { name: "New demo run" }).click();
  await expect(
    page.getByRole("button", { name: "Retry demo action" }),
  ).toBeVisible();
  const activeRun = (
    await (await page.request.get("/api/demo")).json()
  ).runs.find((run: { active: boolean }) => run.active);
  await expect(page.getByTestId("run-id")).toHaveText(activeRun.id, {
    timeout: 12000,
  });
  await page
    .getByRole("navigation", { name: "Workspace" })
    .getByRole("link", { name: "Vitals", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Workspace" })
    .getByRole("link", { name: "Simulation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry demo action" }),
  ).toBeVisible();
  await page.unroute("**/api/demo");
  const retry = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/demo") && request.method() === "POST",
  );
  await page.getByRole("button", { name: "Retry demo action" }).click();
  expect((await retry).postData()).toBe(requests[0]);
  await expect(
    page.getByRole("button", { name: "Retry demo action" }),
  ).toHaveCount(0);
});

test("every blue workspace page is accessible and fits compact and desktop widths", async ({
  page,
}) => {
  await page.goto("/");
  const reports = [];
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const name of [
      "Overview",
      "Vitals",
      "Care response",
      "Observations",
      "Simulation",
    ] as const) {
      await go(page, name);
      await expect(page.getByText("Loading patient workspace…")).toHaveCount(0);
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `${name} at ${width}px`,
      ).toBeLessThanOrEqual(width);
      const report = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      reports.push({ page: name, width, violations: report.violations });
      expect(
        report.violations.map(({ id, nodes }) => ({
          id,
          targets: nodes.map((node) => node.target),
        })),
      ).toEqual([]);
      if (width === 1440 || (width === 320 && name === "Overview")) {
        await page.evaluate(() =>
          window.scrollTo({ top: 0, behavior: "instant" }),
        );
        await page.screenshot({
          path: `documents/verification/blue-${name.toLowerCase().replaceAll(" ", "-")}-${width}.png`,
          fullPage: true,
        });
      }
    }
  }
  await writeFile(
    "documents/verification/blue-pages-accessibility.json",
    JSON.stringify({ verifiedAt: new Date().toISOString(), reports }, null, 2),
  );
});
