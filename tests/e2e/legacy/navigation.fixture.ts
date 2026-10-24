import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const NAV = "Practice tools";
const added = ["Live missions", "My progress", "My training", "Instructor"];

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith("/api/")) return route.continue();
    const data: Record<string, unknown> = {
      "/api/session": { id: "learner_nav", name: "Navigation learner", role: "learner" },
      "/api/scenarios": { scenarios: [] },
      "/api/runs": { runs: [] },
      "/api/health": { model: { available: true, name: "test" } },
      "/api/assignments": { assignments: [] },
      "/api/progress": { attempts: [], competency: {}, counted: 0, excluded: 0, policy: "No recorded attempts", by_scenario: [], adversary: {} },
    };
    return path in data ? route.fulfill({ json: data[path] }) : route.fulfill({ status: 403, json: { message: "Not available to this test learner" } });
  });
});

async function links(page: Page) {
  return page.getByRole("navigation", { name: NAV }).getByRole("link").evaluateAll(nodes => nodes.map(node => ({
    text: node.textContent?.trim(), href: node.getAttribute("href"), icon: node.querySelector("svg")?.getAttribute("class"),
  })));
}

async function header(page: Page) {
  return page.getByRole("banner").getByRole("link").evaluateAll(nodes => nodes.map(node => ({ text: node.textContent?.trim(), href: node.getAttribute("href") })));
}

test("all pages retain the same header, tool icons, training links and sidebar dimensions", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/#/practice/sandbox");
  const nav = page.getByRole("navigation", { name: NAV });
  await expect(nav.getByRole("link", { name: "Instructor", exact: true })).toBeVisible();
  const original = await links(page);
  const originalHeader = await header(page);
  const originalBox = (await nav.boundingBox())!;
  for (const [name, path] of [["Live missions", "#/live"], ["My progress", "#/live/progress"], ["My training", "#/live/profile"], ["Instructor", "#/live/instructor"]]) {
    await nav.getByRole("link", { name, exact: true }).click();
    await expect(nav.getByRole("link", { name, exact: true })).toHaveAttribute("aria-current", "page");
    expect(await links(page)).toEqual(original);
    expect(await header(page)).toEqual(originalHeader);
    const box = (await nav.boundingBox())!;
    expect({ x: box.x, y: box.y, width: box.width }).toEqual({ x: originalBox.x, y: originalBox.y, width: originalBox.width });
    for (const label of added) await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
    expect(new URL(page.url()).hash).toBe(path);
  }
  await page.goto("/#/live/run_navigation/assets");
  await expect(nav.getByRole("link", { name: "Assets & access", exact: true })).toHaveAttribute("aria-current", "page");
  expect((await links(page)).slice(0, original.length)).toEqual(original);
  expect(await header(page)).toEqual(originalHeader);
  await nav.getByRole("link", { name: "Sandbox", exact: true }).click();
  await expect(nav.getByRole("link", { name: "Sandbox", exact: true })).toHaveAttribute("aria-current", "page");
  expect(await links(page)).toEqual(original);
  expect(errors).toEqual([]);
});

test("sidebar collapse persists when moving between practice and training pages", async ({ page }) => {
  await page.goto("/#/practice/logs");
  const nav = page.getByRole("navigation", { name: NAV });
  await nav.getByRole("button", { name: "Collapse sidebar" }).click();
  const width = (await nav.boundingBox())!.width;
  await nav.getByRole("link", { name: "My training", exact: true }).click();
  await expect(nav).toHaveClass(/is-collapsed/);
  expect((await nav.boundingBox())!.width).toBe(width);
  await nav.getByRole("button", { name: "Expand sidebar" }).click();
  await nav.getByRole("link", { name: "Monitoring", exact: true }).click();
  await expect(nav).not.toHaveClass(/is-collapsed/);
});

for (const width of [320, 390, 768]) {
  test("shared navigation stays reachable at " + width + "px", async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const hash of ["#/practice/sandbox", "#/live/progress", "#/live/profile", "#/live/instructor"]) {
      await page.goto("/" + hash);
      const nav = page.getByRole("navigation", { name: NAV });
      await expect(nav.getByRole("link", { name: "Instructor", exact: true })).toBeAttached();
      for (const label of added) {
        const link = nav.getByRole("link", { name: label, exact: true });
        await link.scrollIntoViewIfNeeded();
        await expect(link).toBeInViewport();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    const audit = await new AxeBuilder({ page }).include(".soc__nav").include(".soc__side").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(audit.violations.filter(v => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  });
}
