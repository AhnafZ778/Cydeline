import {test,expect} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {installSoc,scenarios} from "./soc-fixture";
import {mkdirSync} from "node:fs";
const briefing={version:"public-test",role:"You are the on-duty junior analyst at Northstar Analytics. Investigate access anomalies and document a defensible response.",authority:"You may inspect released application audit records, declare an incident, revoke observed sessions or API credentials, require reauthentication, temporarily disable an observed account and restore it. Escalate uncertainty in your handoff.",normal_work:["Employees use browser sessions to read documents permitted to their accounts.","Operations and finance teams need their authorized document workflows throughout the shift.","Concurrent employee sessions can be legitimate; compare their source, purpose and outcomes."],evidence_limits:"Application access and response audits are released as they occur. Endpoint, mailbox and packet-capture evidence are not available in these scenarios. A rule alert is a signal, not a verdict.",escalation_policy:"Escalate when corroborated access anomalies suggest unauthorized use, when scope remains uncertain, or when a response interrupts legitimate work. Cite the observed events and state unresolved alternatives.",recovery_policy:"Success requires fresh suspicious-access denial and successful legitimate workflows. A later response requires verification again. Closing an alert does not stop the adversary.",assessment:"Server score: recognition 20, containment 25, verification 20, continuity 15, proportionality 10, timeliness 10. Multiple defensible investigation paths are accepted. Practice assistance carries no score deduction."};
for(const [width,height] of [[1440,900],[1357,605],[768,700],[390,650],[320,568],[844,390]]) {
 test(`briefing stays readable and scrollable at ${width}x${height}`,async({page})=>{
  await page.setViewportSize({width,height});await installSoc(page,false);
  await page.route("**/api/scenarios",route=>route.fulfill({json:{scenarios:scenarios.map(s=>({...s,briefing,variants:[{id:"baseline",label:"Baseline"}]}))}}));
  await page.goto("/");await page.getByRole("button",{name:"Start scenario",exact:true}).first().click();
  const dialog=page.getByRole("dialog",{name:"Start The Stolen Session",exact:true});const scroll=dialog.getByRole("region",{name:"Company briefing and launch settings"});
  await expect(dialog).toBeVisible();const bounds=(await dialog.boundingBox())!;
  expect(bounds.y).toBeGreaterThanOrEqual(0);expect(bounds.y+bounds.height).toBeLessThanOrEqual(height+1);expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(width+1);
  if(width>=1000)expect(bounds.width).toBeGreaterThan(900);
  await expect(dialog.locator("mark strong").first()).toBeVisible();
  await expect(dialog.getByTestId("live-start")).toBeInViewport();
  const overflow=await scroll.evaluate(el=>el.scrollHeight>el.clientHeight);expect(overflow).toBe(true);
  await scroll.hover();await page.mouse.wheel(0,450);await expect.poll(()=>scroll.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
  await scroll.focus();await page.keyboard.press("Control+End");await page.keyboard.press("End");
  await dialog.getByLabel("Training mode",{exact:true}).selectOption("assessment");
  await expect(dialog.getByText(/Assessment uses blind investigation/)).toBeInViewport();
  await expect(dialog.getByTestId("live-start")).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const first=dialog.getByRole("button",{name:"Close",exact:true}),last=dialog.getByTestId("live-start");await last.focus();await page.keyboard.press("Tab");await expect(first).toBeFocused();
  await scroll.evaluate(el=>el.scrollTop=0);mkdirSync("../../docs/demo/briefing-layout",{recursive:true});await page.screenshot({path:`../../docs/demo/briefing-layout/briefing-${width}x${height}.png`});
  if(width===1357){const result=await new AxeBuilder({page}).include(".soc-modal.is-briefing").withRules(["color-contrast","button-name","label"]).analyze();expect(result.violations).toEqual([]);}
  await page.keyboard.press("Escape");await expect(dialog).toHaveCount(0);await expect(page.getByRole("button",{name:"Start scenario",exact:true}).first()).toBeFocused();
 });
}
