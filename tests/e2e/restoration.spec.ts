import { test, expect } from "@playwright/test";
import { installSoc, RID } from "./soc-fixture";
test("original non-identity tools show honest empty states without unrelated sample records", async ({
  page,
}) => {
  await installSoc(page, true);
  await page.goto("/#/live/" + RID + "/endpoint");
  await expect(
    page.getByRole("tab", { name: "Processes", exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Contain", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText(/No endpoint inventory released/)).toBeVisible();
  await page.getByText("More tools", {exact:true}).click();
  await page.getByRole("link", { name: "Email Security", exact: true }).click();
  await page
    .getByRole("button", { name: "Detailed search", exact: true })
    .click();
  await expect(page.getByLabel("From", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/No mailbox deletion is available/),
  ).toBeVisible();
  await page.getByRole("link", { name: "Threat Intel", exact: true }).click();
  await expect(page.getByLabel("Look up an indicator")).toBeVisible();
  await expect(
    page.getByText(/No external reputation verdict is supplied/),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText(
    /Priya|voucher.zip|DeskHelper|ledger.exe/,
  );
});
test("Windows and Elastic remain available in the compact workspace", async ({
  page,
}) => {
  await installSoc(page, true);
  await page.goto("/#/live/" + RID + "/sandbox");
  await expect(
    page.getByRole("heading", { name: "Workspace", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Windows workstation", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Configure WINDOWS_BASE_IMAGE/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Launch Windows", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", {
      name: "Elastic Security", exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Launch Elastic Security", exact: true }),
  ).toBeEnabled();
});
