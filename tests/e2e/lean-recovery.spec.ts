import { test, expect } from "@playwright/test";
import { installSoc, RID } from "./soc-fixture";

for (const [mode,assistance] of [["practice","coached"],["practice","independent"],["assessment","blind"]]) {
  test(`assigned ${mode}/${assistance} shows briefing before any start and preserves retry`,async({page})=>{
    const model=await installSoc(page,false);
    const briefing={version:"fixture",role:"On-duty assigned analyst",authority:"Only act on released evidence.",normal_work:["Employees read authorized reports."],evidence_limits:"Application audits only.",escalation_policy:"Escalate corroborated anomalies.",recovery_policy:"Check denied and legitimate work.",assessment:"Server scoring applies."};
    let posts=0,fail=false,briefingAvailable=true;
    await page.route("**/api/assignments",route=>route.fulfill({json:{assignments:[{id:"assignment_fixture",title:"Assigned investigation",scenario_id:"stolen-session",scenario_version:"v1",mode,assistance,cohort_id:"cohort_fixture",attempts:[]}]}}));
    await page.route("**/api/scenarios",route=>route.fulfill({json:{scenarios:[{...model.snapshot.scenario,briefing:briefingAvailable?briefing:undefined}]}}));
    await page.route("**/api/assignments/assignment_fixture/start",route=>{
      posts++;if(fail)return route.fulfill({status:503,json:{message:"Model temporarily unavailable. Retry."}});
      model.active=true;model.snapshot.mode=mode;model.snapshot.assistance=assistance;model.snapshot.scenario={...model.snapshot.scenario,briefing};return route.fulfill({json:model.snapshot});
    });
    await page.goto("/#/live/profile");
    briefingAvailable=false;
    await page.getByRole("button",{name:"Start assignment",exact:true}).click();
    await expect(page.getByRole("alert")).toContainText("briefing is unavailable");expect(posts).toBe(0);
    briefingAvailable=true;
    await page.getByRole("button",{name:"Start assignment",exact:true}).click();
    const dialog=page.getByRole("dialog",{name:"Start Assigned investigation",exact:true});
    await expect(dialog.getByText(briefing.role,{exact:true})).toBeVisible();
    await expect(dialog.locator(".learning-briefing")).toHaveAttribute("open","");expect(posts).toBe(0);
    await dialog.getByRole("button",{name:"Cancel",exact:true}).click();expect(posts).toBe(0);
    await page.getByRole("button",{name:"Start assignment",exact:true}).click();
    fail=true;
    await dialog.getByRole("button",{name:"Start assigned exercise",exact:true}).click();
    await expect(dialog.getByRole("alert")).toContainText("Model temporarily unavailable");
    await expect(dialog.getByText(briefing.role,{exact:true})).toBeVisible();
    fail=false;
    await dialog.getByRole("button",{name:"Start assigned exercise",exact:true}).click();
    await expect(page.getByRole("heading",{name:"Live Monitoring",exact:true})).toBeVisible();
    await expect(page.locator(".learning-briefing")).toHaveCount(0);expect(posts).toBe(2);
    expect(model.calls.filter(c=>c.path==="/api/runs"&&c.method==="POST")).toHaveLength(0);
    await page.locator(".side-more > summary").click();
    await page.getByRole("link",{name:"Company briefing",exact:true}).click();
    await expect(page.getByText(briefing.role,{exact:true})).toBeVisible();
  });
}

test("direct local instructor entry preserves selected run and Training demotes after a delayed identity load", async ({page}) => {
  const model=await installSoc(page,true);
  let role="learner", delay=false;
  let resolveIdentity: (()=>void) | undefined;
  const gate=new Promise<void>(resolve=>resolveIdentity=resolve);
  await page.route("**/api/session",async route => {if(delay) await gate; return route.fulfill({json:{id:"learner_review01",name:"Local tester",role,local_demo:true}});});
  await page.route("**/api/session/demo",route => {role=route.request().postDataJSON().role;return route.fulfill({json:{id:"learner_review01",name:"Local tester",role,local_demo:true}});});
  await page.route("**/api/instructor",route => route.fulfill(role==="instructor" ? {json:{profiles:[],cohorts:[],assignments:[],runs:[model.snapshot]}} : {status:403,json:{message:"Instructor access required"}}));
  await page.goto("/#/live/"+RID+"/monitoring");
  await expect(page.getByRole("heading",{name:"Live Monitoring",exact:true})).toBeVisible();
  await page.goto("/#/live/instructor");
  await page.getByRole("button",{name:"Enter instructor mode",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Exercises and after-action review",exact:true})).toBeVisible();
  expect(role).toBe("instructor");
  delay=true;
  await page.reload();
  await expect(page.getByRole("button",{name:"Training",exact:true})).toBeDisabled();
  resolveIdentity!();
  await expect(page.getByRole("button",{name:"Training",exact:true})).toBeEnabled();
  await page.getByRole("button",{name:"Training",exact:true}).click();
  await expect(page).toHaveURL(new RegExp(RID+"/monitoring$"));
  await expect(page.getByRole("heading",{name:"Live Monitoring",exact:true})).toBeVisible();
  expect(role).toBe("learner");
});

test("failed environment launch is recoverable and does not lose the investigation", async ({page}) => {
  const model=await installSoc(page,true);
  let fail=true,ready=false;
  await page.route("**/api/runs/*/tools/desktop",route => {
    if(route.request().method()==="POST") {
      if(fail) return route.fulfill({status:503,json:{message:"Lab temporarily unavailable. Try again."}});
      ready=true;
    }
    return route.fulfill({json:{status:ready?"ready":"stopped",desktop_os:"Windows",url:ready?"/fixture-recovery":undefined}});
  });
  await page.route("**/fixture-recovery",route=>route.fulfill({contentType:"text/html",body:"<p>Recovered fixture environment</p>"}));
  await page.goto("/#/live/"+RID+"/sandbox");
  await page.getByRole("button",{name:"Launch Windows",exact:true}).click();
  await expect(page.getByRole("alert")).toContainText("Lab temporarily unavailable");
  await expect(page.getByRole("button",{name:"Launch Windows",exact:true})).toBeEnabled();
  expect(model.snapshot.state).toBe("running");
  fail=false;
  await page.getByRole("button",{name:"Launch Windows",exact:true}).click();
  await expect(page.frameLocator('iframe[title="Northstar Windows workstation"]').getByText("Recovered fixture environment")).toBeVisible();
  await page.getByRole("button",{name:"Minimize workspace",exact:true}).click();
  await expect(page.getByRole("button",{name:"Resume workspace",exact:true})).toBeFocused();
});
