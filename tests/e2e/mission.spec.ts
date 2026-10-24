import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { installSoc, RID } from "./soc-fixture";
async function a11y(page: any) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    result.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
}
for (const width of [320, 390, 768, 1440])
  test(
    "consistent original layouts and accessibility at " + width + "px",
    async ({ page }) => {
      await installSoc(page, true);
      await page.setViewportSize({ width, height: 1000 });
      for (const route of [
        "",
        "live/" + RID + "/monitoring",
        "live/" + RID + "/logs",
        "live/" + RID + "/cases",
        "live/" + RID + "/endpoint",
        "live/" + RID + "/email",
        "live/progress",
      ]) {
        await page.goto("/#/" + route);
        await expect(page.locator("main h1")).toBeVisible();
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          )
          .toBe(true);
        await a11y(page);
      }
    },
  );
test("exactly two scenario cards launch correct versions into the same console with coached defaults", async ({
  page,
}) => {
  const model = await installSoc(page);
  await page.goto("/");
  await expect(page.locator(".soc-scenario-cards article")).toHaveCount(2);
  await page
    .locator("article")
    .filter({
      has: page.getByRole("heading", {
        name: "The Reporting Blind Spot",
        exact: true,
      }),
    })
    .getByRole("button", { name: "Start scenario", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Training mode")).toHaveValue("practice");
  await expect(dialog.getByLabel("Assistance")).toHaveValue("coached");
  await dialog.getByTestId("live-start").focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Live Monitoring", exact: true }),
  ).toBeVisible();
  const launch = model.calls.find(
    (c) => c.path === "/api/runs" && c.method === "POST",
  )!;
  expect(launch.body).toMatchObject({
    scenario_id: "northstar-breach",
    scenario_version: "v2",
    mode: "practice",
    assistance: "coached",
  });
});
test("unavailable AI disables launch and readiness can recover", async ({
  page,
}) => {
  const model = await installSoc(page);
  model.available = false;
  await page.goto("/");
  await expect(page.locator(".soc-scenario-cards")).toContainText(
    "AI unavailable",
  );
  await page
    .getByRole("button", { name: "Start scenario", exact: true })
    .first()
    .click();
  await expect(page.getByTestId("live-start")).toBeDisabled();
  await page.keyboard.press("Escape");
  model.available = true;
  await page
    .getByRole("button", { name: "Retry AI readiness", exact: true })
    .click();
  await expect(page.locator(".soc-scenario-cards")).toContainText("AI ready");
});
