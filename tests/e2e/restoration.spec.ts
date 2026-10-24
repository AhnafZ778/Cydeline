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
test("Windows and Elastic launch only in Sandbox and Windows image prerequisite stays explicit", async ({
  page,
}) => {
  await installSoc(page, true);
  await page.goto("/#/live/" + RID + "/sandbox");
  await expect(
    page.getByRole("heading", { name: "Sandbox", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Windows workstation Windows desktop/ }),
  ).toBeVisible();
  await expect(
    page.getByText(/Windows Desktop Experience base image must be prepared/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Launch Windows", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", {
      name: /Elastic Security Search the released events/,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Launch Elastic Security", exact: true }),
  ).toBeEnabled();
});
