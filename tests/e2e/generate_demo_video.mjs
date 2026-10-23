import { chromium } from "@playwright/test";
import { mkdirSync, readdirSync, unlinkSync, existsSync, copyFileSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function smoothType(locator, text, delayMs = 28) {
  await locator.focus();
  for (const char of text) {
    await locator.pressSequentially(char, { delay: delayMs });
  }
}

async function advanceFast(page, ticks = 8) {
  await page.keyboard.press("Control+k");
  await sleep(250);
  const btn = page.getByRole("button", { name: "Advance scenario one tick" });
  try {
    await btn.waitFor({ state: "visible", timeout: 3000 });
    for (let i = 0; i < ticks; i++) {
      await btn.evaluate((el) => el.click());
      await sleep(50);
    }
  } catch (e) {
    console.warn("Could not find or click advance button:", e.message);
  }
  await page.keyboard.press("Escape");
  await sleep(300);
}

async function main() {
  const recordingsDir = path.join(repoRoot, "docs/demo/recordings");
  mkdirSync(recordingsDir, { recursive: true });

  // Clean old recordings
  for (const f of readdirSync(recordingsDir)) {
    if (f.endsWith(".webm") || f.endsWith(".mp4")) {
      try { unlinkSync(path.join(recordingsDir, f)); } catch {}
    }
  }

  console.log("=================================================");
  console.log("STARTING SENTINEL LOOP DEMO VIDEO RECORDING");
  console.log("=================================================");

  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-gpu-compositing"],
    headless: true,
  });

  const context = await browser.newContext({
    recordVideo: {
      dir: recordingsDir,
      size: { width: 1440, height: 900 },
    },
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  // Fresh profile so the tour shows naturally
  await page.addInitScript(() => {
    localStorage.removeItem("sl.tour.done");
    localStorage.removeItem("sl.soc.v1");
  });

  console.log("Scene 1: Landing Page & Mission Briefing (0:00 - 0:08)...");
  await page.goto("http://127.0.0.1:5175/?dev=1");
  await sleep(3500);

  // Hover over the after-action attack preview
  const preview = page.locator(".preview");
  if (await preview.isVisible()) {
    await preview.hover();
    await sleep(1500);
  }

  // Click Start shift
  console.log("Scene 2: Interactive Tour Walkthrough (0:08 - 0:20)...");
  await page.getByTestId("start-shift").click();
  await sleep(2500);

  // Tour step 1
  const tourNext = page.getByTestId("tour-next");
  if (await tourNext.isVisible()) {
    await sleep(2500);
    await tourNext.click();
    await sleep(2500);
    if (await tourNext.isVisible()) {
      await tourNext.click();
      await sleep(2500);
    }
    // Finish tour
    if (await tourNext.isVisible()) {
      await tourNext.click();
      await sleep(1500);
    }
  }

  console.log("Scene 3: Live SOC Shift & Threat Emergence (0:20 - 0:40)...");
  // Advance ticks so adversary starts probing from 203.0.113.57
  await advanceFast(page, 20);
  await sleep(2500);

  // Demonstrate panel toggling
  console.log("Showcasing responsive panel layout...");
  const panelLogs = page.getByTestId("panel-logs");
  if (await panelLogs.isVisible()) {
    await panelLogs.click();
    await sleep(1500);
    await panelLogs.click();
    await sleep(1200);
  }

  // Advance further so intruder reaches for confidential vault
  await advanceFast(page, 25);
  await sleep(2500);

  console.log("Scene 4: Threat Investigation & Evidence Basket (0:40 - 1:00)...");
  // Locate rogue rows originating from external adversary IP 203.0.113.57
  const rogueRows = page.locator("[data-testid=log-row][data-session=sess_A]", { hasText: "203.0.113.57" });
  await rogueRows.first().waitFor({ state: "visible", timeout: 10000 });
  await rogueRows.first().click();
  await sleep(2500);

  // Pin evidence in inspector drawer
  const pinBtn = page.getByRole("button", { name: "Pin as evidence" });
  if (await pinBtn.isVisible()) {
    await pinBtn.click();
    await sleep(1500);
  }
  await page.keyboard.press("Escape");
  await sleep(1200);

  // Pin a second rogue row
  if (await rogueRows.nth(1).isVisible()) {
    await rogueRows.nth(1).click();
    await sleep(2000);
    const pinBtn2 = page.getByRole("button", { name: "Pin as evidence" });
    if (await pinBtn2.isVisible()) {
      await pinBtn2.click();
      await sleep(1500);
    }
    await page.keyboard.press("Escape");
    await sleep(1500);
  }

  console.log("Scene 5: Incident Declaration (1:00 - 1:20)...");
  const cta = page.getByTestId("primary-cta");
  await cta.click();
  await sleep(2500);

  // Select sess_A
  const sessRadio = page.getByRole("radio", { name: /sess_A/ });
  await sessRadio.check();
  await sleep(1200);

  // Smoothly type rationale
  const rationaleBox = page.locator("#rationale");
  await smoothType(
    rationaleBox,
    "Compared with the other sessions, sess_A switched to external IP 203.0.113.57 and requested the confidential finance vault."
  );
  await sleep(1800);

  // Submit declaration
  await page.getByTestId("declare-submit").click();
  await sleep(3000);

  console.log("Scene 6: Proportional Containment (1:20 - 1:40)...");
  // Wait for respond drawer
  await page.getByTestId("apply-response").waitFor({ state: "visible", timeout: 10000 });

  // Hover over broad account disable to show side effects
  const broadDisable = page.locator('label:has(input[value="temporarily_disable_account"])');
  if (await broadDisable.isVisible()) {
    await broadDisable.hover();
    await sleep(2000);
  }

  // Select surgical revoke_session
  const revokeRadio = page.locator('input[name="response"][value="revoke_session"]');
  await revokeRadio.check();
  await sleep(2000);

  // Apply response
  await page.getByTestId("apply-response").click();
  await page.getByTestId("receipt").waitFor({ state: "visible", timeout: 10000 });
  await sleep(2500);

  console.log("Scene 7: Dual Recovery Verification (1:40 - 1:55)...");
  // Open Verify drawer
  await page.getByTestId("go-verify").click();
  await sleep(3000);

  // In Verify drawer, observe probe checks
  const probeIntruder = page.getByTestId("probe-intruder");
  await probeIntruder.waitFor({ state: "visible", timeout: 10000 });
  await sleep(2500);

  // Click See debrief
  const seeDebrief = page.getByTestId("see-debrief");
  await seeDebrief.waitFor({ state: "visible", timeout: 10000 });
  await seeDebrief.click();
  await sleep(3000);

  console.log("Scene 8: 100-Point Debrief & Interactive Attack Map (1:55 - 2:25)...");
  const headline = page.getByTestId("debrief-headline");
  await headline.waitFor({ state: "visible", timeout: 10000 });

  // View scorecard
  await page.evaluate(() => window.scrollBy({ top: 260, behavior: "smooth" }));
  await sleep(3500);

  // Scrub attack timeline slider if present
  const scrubber = page.locator("#attack-scrub");
  if (await scrubber.isVisible()) {
    await scrubber.scrollIntoViewIfNeeded();
    await sleep(1500);
    await scrubber.fill("1");
    await sleep(1200);
    await scrubber.fill("3");
    await sleep(1500);
  }

  // Scroll to AttackStudy flow canvas
  const study = page.locator(".study");
  if (await study.isVisible()) {
    await study.scrollIntoViewIfNeeded();
    await sleep(2000);

    // Click on nodes in the circular flow graph
    const nodes = page.locator("[data-testid=flow-node]");
    if ((await nodes.count()) > 0) {
      await nodes.first().click();
      await sleep(2200);
      const closeDock = page.getByRole("button", { name: "Close" });
      if (await closeDock.isVisible()) {
        await closeDock.click();
        await sleep(1200);
      }
    }
  }

  console.log("Scene 9: Adversary Lens Modes (Blind vs Coached) (2:25 - 2:40)...");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(1500);

  // Toggle Blind mode
  const blindBtn = page.getByRole("group", { name: "Adversary lens" }).getByRole("button", { name: "Blind" });
  if (await blindBtn.isVisible()) {
    await blindBtn.click();
    await sleep(3000);
    const coachedBtn = page.getByRole("group", { name: "Adversary lens" }).getByRole("button", { name: "Coached" });
    await coachedBtn.click();
    await sleep(2000);
  }

  console.log("Scene 10: Northstar SOC Practice Console (2:40 - 3:05)...");
  await page.goto("http://127.0.0.1:5175/#/practice/monitoring");
  await sleep(3000);

  // Take alert NS-4412
  const takeAlert = page.getByTestId("take-NS-4412");
  if (await takeAlert.isVisible()) {
    await takeAlert.click();
    await sleep(1200);
    const confirmTake = page.getByTestId("take-confirm");
    if (await confirmTake.isVisible()) {
      await confirmTake.click();
      await sleep(1500);
    }
  }

  // Switch to investigation channel
  const invTab = page.getByTestId("channel-investigation");
  if (await invTab.isVisible()) {
    await invTab.click();
    await sleep(2000);

    const caseItem = page.getByTestId("case-NS-4412");
    if (await caseItem.isVisible()) {
      await caseItem.click();
      await sleep(1500);
      const createCont = page.getByTestId("create-continue");
      if (await createCont.isVisible()) {
        await createCont.click();
        await sleep(2000);
      }

      // Open playbook modal
      const startPlaybook = page.getByTestId("start-playbook");
      if (await startPlaybook.isVisible()) {
        await startPlaybook.click();
        await sleep(2500);
        const playNext = page.getByTestId("playbook-next");
        if (await playNext.isVisible()) {
          await playNext.click();
          await sleep(1500);
        }

        // Answer question 1: Did user report this?
        const choiceYes = page.getByTestId("choice-Yes");
        if (await choiceYes.isVisible()) {
          await choiceYes.click();
          await sleep(1200);
          await page.getByTestId("playbook-next").click();
          await sleep(1500);
        }

        // Open Multiscan tool
        const multiScanLink = page.getByRole("link", { name: "Multiscan" });
        if (await multiScanLink.isVisible()) {
          const popupPromise = page.waitForEvent("popup");
          await multiScanLink.click();
          const popup = await popupPromise;
          await popup.waitForLoadState("domcontentloaded");
          await sleep(2500);
          await popup.close();
          await sleep(1200);

          // Mark as malicious based on 9/72 detection engines
          const choiceMalicious = page.getByTestId("choice-Malicious");
          if (await choiceMalicious.isVisible()) {
            await choiceMalicious.click();
            await sleep(1200);
            await page.getByTestId("playbook-next").click();
            await sleep(2000);
          }
        }
      }
    }
  }

  console.log("Scene 11: Outro & Recap (3:05 - 3:15)...");
  await page.goto("http://127.0.0.1:5175/");
  await sleep(3500);

  console.log("Closing context and encoding video...");
  await context.close();
  await browser.close();

  // Find the recorded webm
  const files = readdirSync(recordingsDir).filter((f) => f.endsWith(".webm"));
  if (files.length === 0) {
    throw new Error("No webm recording found!");
  }
  const rawWebm = path.join(recordingsDir, files[0]);
  const finalMp4 = path.join(repoRoot, "docs/demo/sentinel_loop_demo.mp4");
  const finalWebm = path.join(repoRoot, "docs/demo/sentinel_loop_demo.webm");

  console.log(`Raw video captured: ${rawWebm}`);
  console.log(`Encoding final 1080p MP4: ${finalMp4}...`);

  execSync(
    `ffmpeg -y -i "${rawWebm}" -c:v libx264 -pix_fmt yuv420p -preset medium -crf 20 -movflags +faststart "${finalMp4}"`,
    { stdio: "inherit" }
  );

  copyFileSync(rawWebm, finalWebm);

  // Generate an animated preview GIF (first 10 seconds)
  const previewGif = path.join(repoRoot, "docs/demo/sentinel_loop_preview.gif");
  console.log(`Generating preview GIF: ${previewGif}...`);
  execSync(
    `ffmpeg -y -t 10 -i "${finalMp4}" -filter_complex "[0:v] fps=10,scale=720:-1:flags=lanczos,split [a][b];[a] palettegen [p];[b][p] paletteuse" "${previewGif}"`,
    { stdio: "inherit" }
  );

  // Copy to brain artifact directory if accessible
  const brainDir = "/home/farhan/.gemini/antigravity/brain/0714817e-f0cb-4f8f-ace6-7b866572502c";
  if (existsSync(brainDir)) {
    console.log(`Copying video deliverables to artifact directory ${brainDir}...`);
    try {
      copyFileSync(finalMp4, path.join(brainDir, "sentinel_loop_demo.mp4"));
      copyFileSync(finalWebm, path.join(brainDir, "sentinel_loop_demo.webm"));
      copyFileSync(previewGif, path.join(brainDir, "sentinel_loop_preview.gif"));
      console.log("Artifact copies completed successfully.");
    } catch (err) {
      console.warn("Could not copy to brain dir:", err.message);
    }
  }

  console.log("=================================================");
  console.log("SENTINEL LOOP DEMO RECORDING FINISHED SUCCESSFULLY!");
  console.log(`MP4 Video:  ${finalMp4}`);
  console.log(`WebM Video: ${finalWebm}`);
  console.log(`GIF Preview:${previewGif}`);
  console.log("=================================================");
}

main().catch((err) => {
  console.error("Recording error:", err);
  process.exit(1);
});
