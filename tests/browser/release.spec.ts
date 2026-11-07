import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";

test("caregiver can navigate by keyboard, preserve failed drafts, and read compact alerts", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to patient overview" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const observe = page.getByRole("link", {
    name: "Record observation",
    exact: true,
  });
  await observe.focus();
  await observe.press("Enter");
  await expect(page.locator("#caregiver-notes")).toBeFocused();
  await page.getByRole("button", { name: "Activate identity" }).click();
  await expect(
    page.getByText("Ananya Shah · Primary caregiver", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New demo run" }).click();
  await expect(page.getByTestId("concern-level")).toHaveText("Unknown");
  await page.getByRole("button", { name: "Load stable baseline" }).click();
  await expect(page.getByTestId("concern-level")).toHaveText("Low");

  const note = page.getByLabel("Patient observation", { exact: true });
  const draft = "More tired today and barely ate lunch.";
  await note.fill(draft);
  await page.route("**/api/notes", (route) => route.abort("connectionfailed"));
  await page.getByRole("button", { name: "Save observation" }).click();
  await expect(note).toHaveValue(draft);
  await expect(page.locator("#caregiver-notes [role=alert]")).toBeVisible();
  await page.unroute("**/api/notes");
  await page.getByRole("button", { name: "Save observation" }).click();
  await expect(
    page.getByText("AI analysis: Complete", { exact: true }),
  ).toBeVisible();
  await expect(note).toHaveValue("");
  await expect(page.getByTestId("note-use").first()).toHaveText(
    "Contributes to current concern",
  );
  await expect(page.getByTestId("concern-level")).toHaveText("Medium");
  await page
    .getByRole("link", { name: "View care response", exact: true })
    .click();
  await page.getByRole("button", { name: "Acknowledge alert" }).click();
  const action = page.getByLabel("Caregiver action", { exact: true });
  await action.fill("Contacted the coordinator for this synthetic review.");
  await page.route("**/api/alerts/*/events", (route) =>
    route.abort("connectionfailed"),
  );
  await page
    .getByRole("button", { name: "Record action", exact: true })
    .click();
  await expect(action).toHaveValue(
    "Contacted the coordinator for this synthetic review.",
  );
  await page.unroute("**/api/alerts/*/events");
  await page.getByRole("button", { name: "Retry response" }).click();
  await expect(
    page.getByLabel("Resolution reason", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Advance 130 seconds" }).click();
  await expect(page.getByTestId("concern-level")).toHaveText("Unknown");
  await expect(page.getByTestId("note-use").first()).toHaveText(
    "Stale; outside the 120-second context window",
  );

  const reports = [];
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    const layout = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll("body *")]
        .filter(
          (element) =>
            !element.closest(".table-wrap") &&
            element.getBoundingClientRect().right > innerWidth + 1,
        )
        .slice(0, 8)
        .map((element) => ({
          tag: element.tagName,
          className: element.getAttribute("class"),
          right: element.getBoundingClientRect().right,
        })),
    }));
    expect(
      layout.width,
      JSON.stringify({ viewport: width, ...layout }),
    ).toBeLessThanOrEqual(width);
    const report = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    reports.push({ width, violations: report.violations });
    expect(
      report.violations.map(({ id, nodes }) => ({
        id,
        targets: nodes.map((node) => node.target),
      })),
    ).toEqual([]);
  }
  await writeFile(
    "documents/verification/accessibility.json",
    JSON.stringify({ verifiedAt: new Date().toISOString(), reports }, null, 2),
  );
});
