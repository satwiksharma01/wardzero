import { expect, type Page } from "@playwright/test";
export async function go(
  page: Page,
  name: "Overview" | "Vitals" | "Care response" | "Observations" | "Simulation",
) {
  const link = page
    .getByRole("navigation", { name: "Workspace" })
    .getByRole("link", { name, exact: true });
  await link.click();
  await expect(link).toHaveAttribute("aria-current", "page");
}
