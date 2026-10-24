import { expect, Page, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Skip the first-run tour so it never intercepts keystrokes. Tour has its own test. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("sl.tour.done", "1"));
});

async function start(page: Page) {
  await page.goto("/?fixture=1&dev=1");
  await page.getByTestId("start-shift").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("log-row").first()).toBeVisible();
}

/** Developer-only hotkey (Ctrl+K) to advance the simulated clock deterministically. */
async function advance(page: Page, ticks: number) {
  await page.keyboard.press("Control+k");
  const btn = page.getByRole("button", { name: "Advance scenario one tick" });
  await expect(btn).toBeVisible();
  for (let i = 0; i < ticks; i++) await btn.evaluate((el) => (el as HTMLButtonElement).click());
  await page.keyboard.press("Escape");
}

async function expectNoSeriousA11yViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = bad.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`).join("\n");
  expect(bad, `${label}\n${summary}`).toEqual([]);
}

/** Focus a log line from the intruder address and pin it, using only the keyboard. */
async function pinByKeyboard(page: Page, nth: number) {
  const row = page.locator("[data-testid=log-row][data-session=sess_A]", { hasText: "203.0.113.57" }).nth(nth);
  await row.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("complementary", { name: "Event inspector" })).toBeVisible();
  if (nth === 0) await expectNoSeriousA11yViolations(page, "event inspector");
  await page.keyboard.press("p");
  await page.keyboard.press("Escape");
}

test.describe("Workbench", () => {
  test("landing and the live workbench have no serious accessibility violations", async ({ page }) => {
    await page.goto("/?fixture=1");
    await expectNoSeriousA11yViolations(page, "landing");
    await start(page);
    await advance(page, 20);
    await expectNoSeriousA11yViolations(page, "workbench (AI acting)");
  });

  test("shift panels can be hidden and brought back", async ({ page }) => {
    await start(page);
    await page.getByTestId("panel-logs").click();
    await expect(page.getByTestId("log-row")).toHaveCount(0);
    await page.getByTestId("panel-activity").click();
    await expect(page.getByLabel("Activity chart")).toHaveCount(0);
    await page.getByTestId("panel-logs").click();
    await expect(page.getByTestId("log-row").first()).toBeVisible();
    await page.getByTestId("panel-activity").click();
    await expect(page.getByLabel("Activity chart")).toBeVisible();
  });

  test("Adversary Lens narrates the AI in Coached mode and shows nothing in Blind mode", async ({ page }) => {
    await start(page);
    const strip = page.getByTestId("adversary-strip");
    await expect(strip).toHaveAttribute("data-state", "thinking");
    await advance(page, 6);
    await expect(strip).toHaveAttribute("data-state", "acting");
    await expect(strip).toContainText("Checking what sess_A is allowed to do");
    await expect(page.locator(".aitag").first()).toBeVisible();

    const blind = page.getByRole("group", { name: "Adversary lens" }).getByRole("button", { name: "Blind" });
    await blind.focus();
    await page.keyboard.press("Enter");
    await expect(strip).toHaveAttribute("data-state", "blind");
    await expect(page.locator('[data-node="ai"]')).toHaveCount(0);
    await expect(page.locator(".aitag")).toHaveCount(0);

    await page.getByRole("group", { name: "Adversary lens" }).getByRole("button", { name: "Coached" }).click();
    await expect(strip).toHaveAttribute("data-state", "acting");
  });

  test("keyboard-only run from observe to debrief", async ({ page }) => {
    await start(page);
    await advance(page, 40);

    await pinByKeyboard(page, 0);
    await pinByKeyboard(page, 1);
    await expect(page.getByTestId("primary-cta")).toContainText("Declare incident");

    await page.getByTestId("primary-cta").focus();
    await page.keyboard.press("Enter");
    const declare = page.getByRole("complementary", { name: /declare/i });
    await expect(declare).toBeVisible();
    await expectNoSeriousA11yViolations(page, "declare drawer");

    // The declaration cannot be submitted until a session, evidence and a rationale are all present.
    await expect(page.getByTestId("declare-submit")).toBeDisabled();
    await page.getByRole("radio", { name: /sess_A/ }).check();
    await expect(page.getByTestId("declare-submit")).toBeDisabled();

    await page.locator("#rationale").fill("Compared with the other sessions, this one switched source address and reached for the vault route.");
    await page.getByTestId("declare-submit").click();

    await page.getByRole("radio", { name: /End one session/ }).check();
    await page.getByTestId("apply-response").click();
    await expect(page.getByTestId("receipt")).toBeVisible();

    await page.getByTestId("go-verify").click();
    await expect(page.getByTestId("probe-intruder")).toContainText(/denied|refused|403/i);
    await expect(page.getByTestId("probe-eli")).toContainText(/200|ok|works|allowed/i);

    await page.getByTestId("see-debrief").click();
    await expect(page.getByTestId("debrief-headline")).toBeVisible();
    const map = page.getByTestId("attack-map");
    await expect(map).toBeVisible();
    await expect(map.locator('[data-node="response"]')).toBeVisible();
    const node = map.locator('[data-node="session:sess_A"]');
    await node.focus();
    await page.keyboard.press("Enter");
    const dock = page.getByTestId("node-dock");
    await expect(dock).toBeVisible();
    await expect(dock).toContainText("What is this?");
    await page.keyboard.press("Escape");
    await expect(dock).toBeHidden();
    await expectNoSeriousA11yViolations(page, "debrief");
  });

  for (const width of [320, 390, 768, 1440]) {
    test(`layout holds at ${width}px: no page-level horizontal scroll, AI strip and logs reachable`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 700 ? 800 : 900 });
      await start(page);
      await advance(page, 12);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, "page scrolls horizontally").toBeLessThanOrEqual(1);
      await expect(page.getByTestId("adversary-strip")).toBeVisible();
      await expect(page.getByTestId("log-row").first()).toBeAttached();
      await expectNoSeriousA11yViolations(page, `workbench at ${width}px`);
    });
  }

  test("first-run tour walks through the workflow and the adversary strip", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto("/?fixture=1");
    await page.getByTestId("start-shift").click();
    const tour = page.getByRole("dialog", { name: /^Tour step 1 of/ });
    await expect(tour).toBeVisible();
    await page.getByTestId("tour-next").click();
    await expect(page.getByRole("dialog", { name: /Watch the AI work/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: /Tour step/ })).toHaveCount(0);
    await ctx.close();
  });
});
