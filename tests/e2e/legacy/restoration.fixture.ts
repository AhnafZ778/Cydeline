import { expect, test } from "@playwright/test";

test("original landing and all original SOC tools remain available with live additions", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("start-shift")).toBeVisible();
  await page.goto("/#/practice/monitoring");
  await expect(page.getByTestId("alert-NS-4412")).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Practice tools" });
  for (const [tab, heading] of [["Log Management", "New Search"], ["Case Management", "Case management"], ["Endpoint Security", "Endpoint security"], ["Email Security", "Email security"], ["Threat Intel", "Threat intel"]]) {
    await nav.getByRole("link", { name: tab, exact: true }).click();
    await expect(page.getByRole("heading", { name: heading, exact: true, level: 1 })).toBeVisible();
  }
  await nav.getByRole("link", { name: "Log Management", exact: true }).click();
  await expect(page.getByRole("button", { name: "Basic", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pro", exact: true })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Interesting fields" })).toBeVisible();
  for (const name of ["Live missions", "My progress", "My training", "Instructor"]) {
    await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
  }
  await nav.getByRole("link", { name: "Live missions", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your next shift starts here." })).toBeVisible();
  await page.getByRole("navigation", { name: "Practice tools" }).getByRole("link", { name: "Monitoring", exact: true }).click();
  await expect(page.getByTestId("alert-NS-4412")).toBeVisible();
});

test("Sandbox uses the real Windows tool lifecycle and displays a missing-image error", async ({ page }) => {
  await page.route("**/api/session", route => route.fulfill({ json: { role: "learner" } }));
  await page.route("**/api/runs", route => route.fulfill({ json: { runs: [{ run_id: "run_windows", mode: "practice", state: "running" }] } }));
  await page.route("**/api/runs/run_windows/tools/desktop", route => route.request().method() === "POST"
    ? route.fulfill({ status: 503, json: { message: "Windows image is not configured. Set WINDOWS_BASE_IMAGE." } })
    : route.fulfill({ json: { status: "stopped", message: "No optional tool running.", desktop_os: "Windows" } }));
  await page.goto("/#/practice/sandbox");
  await expect(page.getByRole("heading", { name: "Sandbox", exact: true })).toBeVisible();
  await expect(page.getByLabel("Windows exercise")).toHaveValue("run_windows");
  await page.getByRole("button", { name: "Launch Windows", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("WINDOWS_BASE_IMAGE");
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.getByText("Linux server", { exact: true })).toHaveCount(0);
});

test("an older Linux worker cannot launch or display a workstation as Windows", async ({ page }) => {
  await page.route("**/api/session", route => route.fulfill({ json: {} }));
  await page.route("**/api/runs", route => route.fulfill({ json: { runs: [{ run_id: "run_legacy", mode: "practice", state: "running" }] } }));
  let launches = 0;
  await page.route("**/api/runs/run_legacy/tools/desktop", route => {
    if (route.request().method() === "POST") launches++;
    return route.fulfill({ json: { status: "ready", url: "http://127.0.0.1:12345/linux" } });
  });
  await page.goto("/#/practice/sandbox");
  await expect(page.getByRole("alert")).toContainText("Restart the range worker");
  await expect(page.getByRole("button", { name: "Launch Windows", exact: true })).toBeDisabled();
  await expect(page.locator("iframe")).toHaveCount(0);
  expect(launches).toBe(0);
});
