import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { installSoc, RID, scenarios } from "./soc-fixture";
import { mkdirSync } from "node:fs";
const evidence = "../../docs/demo/lean-shell";
const briefing = {version:"fixture",role:"On-duty junior analyst",authority:"Investigate released evidence.",normal_work:["Employees read authorized reports."],evidence_limits:"Application audits only.",escalation_policy:"Escalate corroborated anomalies.",recovery_policy:"Verify denied access and legitimate work separately.",assessment:"Server score is authoritative."};

test("briefing is open before launch and kept on its reference page afterward", async ({page}) => {
  const model = await installSoc(page, false);
  await page.route("**/api/scenarios", route => route.fulfill({json:{scenarios:scenarios.map(s => ({...s,briefing}))}}));
  model.snapshot.scenario = {...model.snapshot.scenario,briefing};
  await page.route("**/api/runs", async route => { if(route.request().method()!=="POST") return route.fallback(); const body=route.request().postDataJSON(); model.active=true; model.snapshot.mode=body.mode; model.snapshot.assistance=body.assistance; return route.fulfill({json:model.snapshot}); });
  await page.goto("/");
  await page.getByRole("button",{name:"Start scenario",exact:true}).first().click();
  await expect(page.getByText(briefing.role,{exact:true})).toBeVisible();
  await expect(page.locator(".learning-briefing")).toHaveAttribute("open","");
  await page.getByTestId("live-start").click();
  await expect(page.getByRole("heading",{name:"Live Monitoring",exact:true})).toBeVisible();
  await expect(page.locator(".learning-briefing")).toHaveCount(0);
  await page.getByText("More tools",{exact:true}).click();
  await page.getByRole("link",{name:"Company briefing",exact:true}).click();
  await expect(page.getByText(briefing.role,{exact:true})).toBeVisible();
});

test("ready Windows fills the viewport, minimizes without reloading and restores keyboard focus", async ({page}) => {
  await installSoc(page,true);
  let launched = false;
  await page.route("**/api/runs/*/tools/desktop", route => {
    if(route.request().method()==="POST") launched=true;
    if(route.request().method()==="DELETE") launched=false;
    return route.fulfill({json:{desktop_os:"Windows",status:launched?"ready":"stopped",url:launched?"/fixture-desktop":undefined,message:"Synthetic Windows gateway for layout checks"}});
  });
  let frameLoads=0;
  await page.route("**/fixture-desktop",route => {frameLoads++;return route.fulfill({contentType:"text/html",body:'<html><body style="margin:0;background:#145477;color:white;font:20px sans-serif;height:100vh"><p>Fixture desktop — layout verification only</p><button>Guest control</button></body></html>'});});
  await page.goto("/#/live/"+RID+"/sandbox");
  await page.getByRole("button",{name:"Launch Windows",exact:true}).click();
  const display=page.getByRole("region",{name:"Windows workspace",exact:true});
  const frame=page.frameLocator('iframe[title="Northstar Windows workstation"]');
  await expect(display).toBeVisible();
  await expect(frame.getByText(/Fixture desktop/)).toBeVisible();
  const identity=await page.locator('iframe[title="Northstar Windows workstation"]').evaluate(el => {el.setAttribute("data-connection-marker","kept");return el.getAttribute("src");});
  for(const width of [1440,768,390,320]) {
    await page.setViewportSize({width,height:900});
    await expect(display).toHaveCSS("position","fixed");
    expect(await display.boundingBox()).toEqual({x:0,y:0,width,height:900});
    await expect(page.getByRole("button",{name:"Minimize workspace",exact:true})).toBeVisible();
    expect(await page.locator(".unified-soc").evaluate(el=>el.hasAttribute("inert"))).toBe(true);
    mkdirSync(evidence,{recursive:true});
    await page.screenshot({path:`${evidence}/workspace-${width}.png`});
  }
  await page.getByRole("button",{name:"Minimize workspace",exact:true}).click();
  await expect(page.getByRole("button",{name:"Resume workspace",exact:true})).toBeFocused();
  await expect(page.getByRole("navigation",{name:"Practice tools"})).toBeVisible();
  await expect(page.locator('iframe[title="Northstar Windows workstation"]')).toHaveAttribute("data-connection-marker","kept");
  await expect(page.locator('iframe[title="Northstar Windows workstation"]')).toHaveAttribute("src",identity!);
  await page.getByRole("button",{name:"Resume workspace",exact:true}).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button",{name:"Resume workspace",exact:true})).toBeFocused();
  expect(frameLoads).toBe(1);
  await page.getByRole("button",{name:"Reconnect",exact:true}).click();
  await expect.poll(() => frameLoads).toBe(2);
  await expect(frame.getByText(/Fixture desktop/)).toBeVisible();
  await page.getByRole("button",{name:"Minimize workspace",exact:true}).click();
  await page.getByRole("link",{name:"Logs",exact:true}).click();
  await expect(page.locator(".workspace-display")).toHaveCount(0);
  await expect(page.locator(".unified-soc")).not.toHaveAttribute("inert","");
});

test("password-free local mode preserves selected exercise and separates instructor tools", async ({page}) => {
  const model=await installSoc(page,true);
  let role="learner";
  await page.route("**/api/session",route => route.fulfill({json:{id:"learner_review01",name:"Local tester",role,local_demo:true}}));
  await page.route("**/api/session/demo",route => {role=route.request().postDataJSON().role;return route.fulfill({json:{id:"learner_review01",name:"Local tester",role,local_demo:true}});});
  await page.route("**/api/instructor",route => route.fulfill({json:{profiles:[],cohorts:[],assignments:[],runs:[model.snapshot]}}));
  await page.goto("/#/live/"+RID+"/monitoring");
  await page.getByRole("button",{name:"Instructor",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Instructor desk",exact:true})).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(page.getByRole("navigation",{name:"Practice tools"})).toHaveCount(0);
  await expect(page.getByRole("region",{name:"Live range status"})).toHaveCount(0);
  await expect(page.getByRole("link",{name:"Live observation",exact:true})).toBeVisible();
  mkdirSync(evidence,{recursive:true});
  await page.screenshot({path:`${evidence}/instructor-1440.png`,fullPage:true});
  await page.getByRole("button",{name:"Training",exact:true}).click();
  await expect(page).toHaveURL(new RegExp(RID+"/monitoring$"));
  await expect(page.getByRole("heading",{name:"Live Monitoring",exact:true})).toBeVisible();
  expect(role).toBe("learner");
});

test("lean shell reflows and retains keyboard access to secondary tools", async ({page}) => {
  await installSoc(page,true);
  await page.goto("/#/live/"+RID+"/monitoring");
  mkdirSync(evidence,{recursive:true});
  for(const width of [1440,768,390,320]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const more=page.locator(".side-more > summary");
    await more.focus();await page.keyboard.press("Enter");
    await expect(page.getByRole("link",{name:"Assets & Access",exact:true})).toBeVisible();
    const box=await page.locator(".side-more__links").boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width);
    await page.keyboard.press("Enter");
    await page.screenshot({path:`${evidence}/monitor-${width}.png`,fullPage:true});
  }
  const results=await new AxeBuilder({page}).withRules(["color-contrast","button-name","link-name"]).analyze();
  expect(results.violations).toEqual([]);
});
