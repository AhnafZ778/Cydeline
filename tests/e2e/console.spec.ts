import { test, expect } from "@playwright/test";
import { installSoc, RID } from "./soc-fixture";
test("original alert channels, ownership, incident, playbook and closure use server state", async ({
  page,
}) => {
  const model = await installSoc(page, true);
  await page.goto("/#/live/" + RID + "/monitoring");
  await expect(
    page.getByRole("heading", { name: "Live Monitoring", exact: true }),
  ).toBeVisible();
  for (const name of ["Main Channel", "Investigation Channel", "Closed Alerts"])
    await expect(page.getByRole("tab", { name, exact: true })).toBeVisible();
  await page
    .getByRole("button", {
      name: "Take ownership of alert_review01",
      exact: true,
    })
    .click();
  await page.getByTestId("take-confirm").click();
  await expect(
    page.getByRole("tab", { name: "Investigation Channel", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page
    .getByRole("button", { name: "Create case alert_review01", exact: true })
    .click();
  await page.getByTestId("create-continue").click();
  await expect(
    page.getByRole("heading", { name: "Incident Details", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Investigation notes", exact: true })
    .fill("Preserve this investigation draft.");
  await page.getByRole("link", { name: "Logs", exact: true }).click();
  await page
    .getByRole("link", { name: "Cases", exact: true })
    .click();
  await page.getByRole("link", { name: "case_main", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Investigation notes", exact: true }),
  ).toHaveValue("Preserve this investigation draft.");
  await page.getByRole("button", { name: "Save notes", exact: true }).click();
  await expect
    .poll(() => model.snapshot.workspace.cases[0].note)
    .toBe("Preserve this investigation draft.");
  await page.getByTestId("start-playbook").click();
  await expect(
    page.getByRole("dialog", { name: "Collect evidence", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("link", { name: "Monitor", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Close alert alert_review01", exact: true })
    .click();
  await page
    .getByLabel("Note", { exact: true })
    .fill("Investigated the observed source change.");
  await page.getByTestId("close-submit").click();
  await page.getByRole("tab", { name: "Closed Alerts", exact: true }).click();
  await expect(page.getByRole("table")).toContainText("true positive");
  expect(model.snapshot.state).toBe("running");
  expect(
    model.calls.some(
      (c) => c.path.endsWith("/alerts/alert_review01") && c.body.comment,
    ),
  ).toBeTruthy();
});
test("New Search retains Basic/Pro, aliases, saved searches, pins and drafts through refresh", async ({
  page,
}) => {
  const model = await installSoc(page, true);
  await page.goto("/#/live/" + RID + "/logs");
  await expect(
    page.getByRole("heading", { name: "New Search", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pro", exact: true }).click();
  await page
    .getByLabel("Pro query", { exact: true })
    .fill("session:sess_A ip:203.0.113.57");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("button", { name: "Save search", exact: true }).click();
  await expect
    .poll(() => model.snapshot.workspace.saved_queries.length)
    .toBe(1);
  await page.locator(".lm__list > li > button").first().click();
  await page
    .getByRole("button", { name: "Pin as evidence", exact: true })
    .click();
  await expect.poll(() => model.snapshot.workspace.evidence_ids.length).toBe(1);
  await page.getByText("More tools", {exact:true}).click();
  await page
    .getByRole("link", { name: "Business Activity", exact: true })
    .click();
  await page.getByRole("link", { name: "Logs", exact: true }).click();
  await expect(page.getByLabel("Pro query", { exact: true })).toHaveValue(
    "session:sess_A ip:203.0.113.57",
  );
  await page.reload();
  await expect(page.getByLabel("Pro query", { exact: true })).toHaveValue(
    "session:sess_A ip:203.0.113.57",
  );
  await expect(
    page.getByRole("button", { name: "Unpin evidence", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".lm__list")).toContainText(
    "source_port=Unavailable",
  );
  await page
    .getByRole("button", { name: "Inspect event", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Event inspector" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Basic", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Interesting fields", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "source_address", exact: true })
    .click();
  await page.getByLabel("Value", { exact: true }).fill("203.0.113.57");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.reload();
  await expect(page.locator(".lm__sentence")).toContainText("203.0.113.57");
});
test("system AI failure exposes retry and assessment has no manual pause", async ({
  page,
}) => {
  const model = await installSoc(page, true);
  model.snapshot.mode = "assessment";
  model.snapshot.assistance = "blind";
  model.snapshot.ai_unavailable = true;
  model.snapshot.model_status = "unavailable";
  await page.goto("/#/live/" + RID + "/monitoring");
  await expect(
    page.getByText("AI unavailable — Retry", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pause exercise", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("region", { name: "Adversary lens" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Retry AI", exact: true }).click();
  await expect(
    page.getByText("AI unavailable — Retry", { exact: true }),
  ).toHaveCount(0);
  expect(model.calls.filter((c) => c.path.endsWith("/ai/retry"))).toHaveLength(
    1,
  );
});
