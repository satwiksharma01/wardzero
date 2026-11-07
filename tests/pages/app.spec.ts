import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { go } from "../browser/navigation-helpers";

async function open(page: Page) {
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "Activate identity" }),
  ).toBeEnabled({ timeout: 60000 });
  await page.getByRole("button", { name: "Activate identity" }).click();
  await expect(
    page.getByText("Ananya Shah · Primary caregiver", { exact: true }),
  ).toBeVisible();
}

test("browser app records concern, care responses, escalation and persistent multi-tab archives", async ({
  page,
  context,
}) => {
  const failures: string[] = [];
  const apiRequests: string[] = [];
  context.on("page", (tab) =>
    tab.on("pageerror", (error) => failures.push(error.message)),
  );
  page.on("pageerror", (error) => failures.push(error.message));
  context.on("request", (request) => {
    if (/\/api\//.test(request.url())) apiRequests.push(request.url());
  });
  await open(page);
  await go(page, "Simulation");
  await page.getByRole("button", { name: "Load stable baseline" }).click();
  await expect(page.getByTestId("concern-level")).toHaveText("Low");
  await go(page, "Observations");
  await page
    .getByLabel("Patient observation", { exact: true })
    .fill("More tired today and barely ate lunch.");
  await go(page, "Vitals");
  await go(page, "Observations");
  await expect(
    page.getByLabel("Patient observation", { exact: true }),
  ).toHaveValue("More tired today and barely ate lunch.");
  await page.getByRole("button", { name: "Save observation" }).click();
  await expect(
    page.getByText("demo:fixed-example (not live AI)", { exact: false }),
  ).toBeVisible();
  await expect(page.getByTestId("concern-level")).toHaveText("Medium");
  await page
    .getByLabel("Patient observation", { exact: true })
    .fill("Patient is tired and confused today.");
  await page.getByRole("button", { name: "Save observation" }).click();
  await expect(
    page.getByText("AI analysis: Unavailable", { exact: true }),
  ).toBeVisible();
  await go(page, "Simulation");
  await page.getByRole("button", { name: "Load deterioration" }).click();
  await expect(page.getByTestId("concern-level")).toHaveText("High");
  await go(page, "Care response");
  await page.getByRole("button", { name: "Acknowledge alert" }).click();
  await page
    .getByLabel("Caregiver action", { exact: true })
    .fill("Reviewed this synthetic episode with the coordinator.");
  await page
    .getByRole("button", { name: "Record action", exact: true })
    .click();
  await page
    .getByLabel("Resolution reason", { exact: true })
    .fill("Synthetic review completed with a recorded outcome.");
  await page
    .getByRole("button", { name: "Resolve alert", exact: true })
    .click();
  await expect(
    page.locator(".alert-card").getByText("Resolved", { exact: true }),
  ).toBeVisible();
  await go(page, "Simulation");
  await page.getByRole("button", { name: "New demo run" }).click();
  await expect(page.getByTestId("concern-level")).toHaveText("Unknown");
  await page.getByText("Previous runs", { exact: false }).click();
  const newTab = context.waitForEvent("page");
  await page.getByRole("link", { name: "View archived run" }).click();
  const archive = await newTab;
  await expect(
    archive.getByRole("heading", {
      name: "Recorded assessments and responses",
    }),
  ).toBeVisible({ timeout: 60000 });
  await expect(
    archive.getByText("High · Resolved", { exact: true }),
  ).toBeVisible();
  await archive.close();
  await page.getByRole("button", { name: "Load deterioration" }).click();
  await expect(page.getByTestId("concern-level")).toHaveText("High");
  await page.getByRole("button", { name: "Advance 130 seconds" }).click();
  await page
    .getByLabel("Demo identity", { exact: true })
    .selectOption("backup");
  await page.getByRole("button", { name: "Activate identity" }).click();
  await expect(
    page.getByText("Ravi Menon · Backup coordinator", { exact: true }),
  ).toBeVisible();
  await go(page, "Care response");
  await expect(
    page.getByRole("heading", { name: "Coordinator inbox" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Escalated in-app to Ravi Menon at/),
  ).toBeVisible();
  await expect(page.getByTestId("email-delivery")).toContainText(
    "Disabled; no send queued",
  );
  await page.getByRole("button", { name: "Acknowledge alert" }).click();
  await expect(
    page.getByLabel("Caregiver action", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Caregiver action", { exact: true }),
  ).toBeVisible({ timeout: 60000 });
  const follower = await context.newPage();
  await follower.goto(page.url());
  await expect(
    follower.locator(".alert-card").getByText("Acknowledged", { exact: true }),
  ).toBeVisible({ timeout: 60000 });
  await page.close();
  await follower.reload();
  await expect(
    follower.locator(".alert-card").getByText("Acknowledged", { exact: true }),
  ).toBeVisible({ timeout: 60000 });
  expect(failures).toEqual([]);
  expect(apiRequests).toEqual([]);
});

test("sensor queue survives refresh and syncs original readings without duplicates", async ({
  page,
}) => {
  await open(page);
  await go(page, "Simulation");
  await page.getByRole("button", { name: "Disconnect sensor" }).click();
  for (let index = 1; index <= 3; index++) {
    await page.getByRole("button", { name: "Send one reading" }).click();
    await expect(page.getByTestId("queue-count")).toContainText(
      `${index} queued`,
    );
  }
  await page.reload();
  await expect(page.getByTestId("queue-count")).toContainText("3 queued", {
    timeout: 60000,
  });
  await page.getByRole("button", { name: "Reconnect sensor" }).click();
  await expect(page.getByTestId("queue-count")).toContainText("0 queued");
  await expect(
    page.getByText("3 recent / 3 stored", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("3 recent / 3 stored", { exact: true }),
  ).toBeVisible({ timeout: 60000 });
});

test("a failed database download leaves actionable error states instead of endless loading", async ({
  page,
  context,
}) => {
  await context.route("**/*.wasm", (route) => route.abort("failed"));
  await page.goto("./");
  await expect(
    page.getByText("Demo session unavailable. Retry activation.", {
      exact: true,
    }),
  ).toBeVisible({ timeout: 25000 });
  await expect(
    page.getByRole("alert").filter({ hasText: "Connection unavailable" }),
  ).toBeVisible({ timeout: 25000 });
  await expect(page.getByRole("button", { name: "Reload demo" })).toBeVisible();
});

test("five pages work below the repository path at mobile and desktop widths", async ({
  page,
}) => {
  await open(page);
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
      await expect(page.getByTestId("concern-level")).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await page.evaluate(() => window.scrollTo(0, 0));
      expect(
        await page
          .getByText("Browser demo", { exact: true })
          .evaluate((element) => {
            const box = element.getBoundingClientRect();
            const hit = document.elementFromPoint(
              box.x + box.width / 2,
              box.y + box.height / 2,
            );
            return hit === element || element.contains(hit);
          }),
      ).toBe(true);
      const report = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      reports.push({ width, name, violations: report.violations });
      expect(
        report.violations.map(({ id, nodes }) => ({
          id,
          targets: nodes.map((node) => node.target),
        })),
      ).toEqual([]);
    }
    await page.screenshot({
      path: `.data/verification/github-pages-${width}.png`,
      fullPage: true,
    });
  }
  await mkdir(".data/verification", { recursive: true });
  await writeFile(
    ".data/verification/github-pages-accessibility.json",
    JSON.stringify({ verifiedAt: new Date().toISOString(), reports }, null, 2),
  );
});
