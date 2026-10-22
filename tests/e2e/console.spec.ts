import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("sl.tour.done", "1");
    localStorage.removeItem("sl.soc.v1");
  });
});

async function axe(page: import("@playwright/test").Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = bad.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`).join("\n");
  expect(bad, `${label}\n${summary}`).toEqual([]);
}

test("phishing alert follows the practice loop and syncs to a second tab", async ({ page }) => {
  await page.goto("/#/practice/monitoring");
  await expect(page.getByRole("heading", { name: "Monitoring", level: 1 })).toHaveCount(0);
  await expect(page.getByTestId("alert-NS-4412")).toBeVisible();
  await expect(page).toHaveTitle("Monitoring - Northstar Practice");
  await axe(page, "monitoring");

  await page.getByTestId("take-NS-4412").click();
  await expect(page.getByRole("dialog", { name: "Are you sure?" })).toBeVisible();
  await page.getByTestId("take-confirm").click();
  await page.getByTestId("channel-investigation").click();
  await expect(page.getByTestId("alert-NS-4434")).toBeHidden();
  await page.getByTestId("channel-main").click();
  await expect(page.getByTestId("alert-NS-4434")).toBeVisible();
  await page.getByTestId("channel-investigation").click();
  await page.getByTestId("case-NS-4412").click();
  await page.getByTestId("create-continue").click();
  await expect(page.getByRole("heading", { name: "Incident details" })).toBeVisible();
  await page.getByTestId("start-playbook").click();

  await page.getByTestId("playbook-next").click();
  await page.getByTestId("choice-Yes").click();
  await page.getByTestId("playbook-next").click();
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Multiscan" }).click();
  const popup = await popupPromise;
  await expect(popup.getByText("9/72")).toBeVisible();
  await popup.close();
  await page.getByTestId("choice-Malicious").click();
  await page.getByTestId("playbook-next").click();
  await page.getByTestId("choice-Delivered").click();
  await page.getByTestId("playbook-next").click();
  const mailPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Email security", exact: true }).click();
  const mail = await mailPromise;
  await mail.getByText("Cafeteria credit", { exact: true }).click();
  await mail.getByRole("button", { name: "Delete from mailbox" }).click();
  await mail.close();
  await expect(page.getByText("Recorded.")).toBeVisible();
  await page.getByTestId("playbook-next").click();
  const hostPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Endpoint security", exact: true }).click();
  const host = await hostPromise;
  await host.getByRole("button", { name: "Contain", exact: true }).click();
  await host.getByRole("button", { name: "Continue" }).click();
  await host.close();
  await expect(page.getByText("Recorded.")).toBeVisible();
  await page.getByTestId("playbook-next").click();
  await page.getByTestId("playbook-next").click();
  await page.getByPlaceholder("Please enter comments").fill("Voucher mail was allowed through. Link and archive are malicious. Not delivered past the mailbox.");
  await page.getByTestId("playbook-next").click();
  await page.getByTestId("playbook-confirm").click();

  await page.getByRole("link", { name: "Monitoring" }).click();
  await page.getByTestId("channel-investigation").click();
  await page.getByTestId("close-NS-4412").click();
  await page.getByLabel("Note").fill("True positive. Gateway label said blocked, mailbox shows allowed.");
  await page.getByTestId("close-submit").click();
  await expect(page.getByTestId("streak-continue")).toBeVisible();
  await page.screenshot({ path: "../../docs/demo/console-practice/streak-1440.png" });
  await page.getByTestId("streak-continue").click();
  await page.getByTestId("channel-closed").click();
  await expect(page.getByTestId("result-NS-4412")).toHaveAttribute("aria-label", "Correct answer");
  await page.getByRole("button", { name: "Show" }).click();
  await expect(page.getByText("official write-up", { exact: false })).toBeVisible();
  await expect(page.getByText("lookalike of the company cafeteria")).toBeVisible();
  await axe(page, "closed report");

  const second = await page.context().newPage();
  await second.goto("/#/practice/monitoring");
  await second.getByTestId("channel-closed").click();
  await expect(second.getByTestId("result-NS-4412")).toBeVisible();
  await second.setViewportSize({ width: 900, height: 800 });
  await second.screenshot({ path: "../../docs/demo/console-practice/monitoring-900.png" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: "../../docs/demo/console-practice/closed-1440.png" });
});
