import { test, expect } from "@playwright/test";
import { installSoc, RID } from "./soc-fixture";
test("lean primary navigation retains all tools and separates instructor workspace", async ({page}) => {
  await installSoc(page, true);
  await page.goto("/#/live/" + RID + "/monitoring");
  const rail = page.getByRole("navigation", {name:"Practice tools"});
  await expect(rail.locator(":scope > a")).toHaveCount(4);
  for (const name of ["Monitor","Logs","Cases","Workspace"]) await expect(rail.getByRole("link",{name,exact:true})).toBeVisible();
  await expect(rail.getByRole("link",{name:"Endpoint Security",exact:true})).not.toBeVisible();
  await rail.getByText("More tools",{exact:true}).click();
  for (const [name,heading] of [["Endpoint Security","Endpoint Security"],["Email Security","Email Security"],["Threat Intel","Threat Intel"]]) {
    await rail.getByRole("link",{name,exact:true}).click();
    await expect(page.getByRole("heading",{name:heading,exact:true})).toBeVisible();
  }
  await rail.getByRole("link",{name:"Logs",exact:true}).click();
  await expect(page.getByRole("heading",{name:"New Search",exact:true})).toBeVisible();
  await page.getByRole("banner").getByText("Resources",{exact:true}).click();
  await page.getByRole("link",{name:"My progress",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Skills built through practice",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Instructor",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Instructor desk",exact:true})).toBeVisible();
  await expect(page.getByRole("navigation",{name:"Practice tools"})).toHaveCount(0);
  await expect(page.getByRole("region",{name:"Live range status"})).toHaveCount(0);
  await expect(page.getByRole("navigation",{name:"Instructor tools"})).toBeVisible();
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
    page.getByRole("heading", { name: "Workspace", exact: true }),
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
