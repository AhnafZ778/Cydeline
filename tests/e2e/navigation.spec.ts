import { test, expect } from "@playwright/test";
import { installSoc, RID } from "./soc-fixture";
test("one shared header, original icons and training links across all tools and global pages", async ({
  page,
}) => {
  await installSoc(page, true);
  await page.goto("/#/live/" + RID + "/monitoring");
  const rail = page.getByRole("navigation", { name: "Practice tools" });
  await expect(rail.getByRole("link", {name:"Live Monitoring",exact:true})).toBeVisible();
  const labels = await rail.getByRole("link").allTextContents();
  const icons = await rail
    .locator("a svg")
    .evaluateAll((es) => es.map((e) => e.innerHTML));
  for (const [name, heading] of [
    ["Log Management", "New Search"],
    ["Case Management", "Case Management"],
    ["Endpoint Security", "Endpoint Security"],
    ["Email Security", "Email Security"],
    ["Threat Intel", "Threat Intel"],
    ["Sandbox", "Sandbox"],
    ["Mission Library", "Choose your investigation"],
    ["My progress", "Skills built through practice"],
    ["My training", "Your training desk"],
    ["Instructor", "Instructor desk"],
  ] as const) {
    await rail.getByRole("link", { name, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    expect(await rail.getByRole("link").allTextContents()).toEqual(labels);
    expect(
      await rail
        .locator("a svg")
        .evaluateAll((es) => es.map((e) => e.innerHTML)),
    ).toEqual(icons);
    await expect(page.getByRole("banner")).toContainText("My progress");
    await expect(
      rail.getByRole("link", { name: "My training", exact: true }),
    ).toBeVisible();
  }
  await expect(
    page.getByRole("link", { name: "Live evidence", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Live response", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Analyst Workstation", exact: true }),
  ).toHaveCount(0);
});
test("old practice and run URLs resolve to the selected exercise; no selection returns landing", async ({
  page,
}) => {
  await installSoc(page, true);
  await page.goto("/#/practice/logs");
  await expect(
    page.getByRole("heading", {
      name: "Choose your investigation",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/#/live/" + RID + "/monitoring");
  await expect(
    page.getByRole("heading", { name: "Live Monitoring", exact: true }),
  ).toBeVisible();
  await page.goto("/#/practice/logs");
  await expect(page).toHaveURL(new RegExp(RID + "/logs$"));
  await expect(
    page.getByRole("heading", { name: "New Search", exact: true }),
  ).toBeVisible();
  await page.goto("/#/live/" + RID + "/workstation");
  await expect(
    page.getByRole("heading", { name: "Sandbox", exact: true }),
  ).toBeVisible();
  await page.goto("/#/live/" + RID + "/case");
  await expect(
    page.getByRole("heading", { name: "Incident Details", exact: true }),
  ).toBeVisible();
});
test("one active company offers Resume and never silently creates another", async ({
  page,
}) => {
  const model = await installSoc(page, true);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Resume exercise", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start scenario", exact: true }).first(),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Resume exercise", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Live Monitoring", exact: true }),
  ).toBeVisible();
  expect(
    model.calls.filter((c) => c.path === "/api/runs" && c.method === "POST"),
  ).toHaveLength(0);
});
