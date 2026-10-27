import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { installSoc, RID } from "./soc-fixture";

const fields = () => ({observation:"", hypothesis:"", supporting_evidence:"", contradicting_evidence:"", scope_uncertainty:"", action_impact:"", verification_handoff:""});
async function worksheet(page: Page) {
  const model = await installSoc(page, true);
  model.snapshot.workspace.cases[0].opened = true;
  const state = { record: {revision:0, fields:fields(), evidence_ids:[], saved_at:null, saved_by:null} as any, offline:false, delay:false, release:()=>{}, pending:false };
  await page.route("**/api/runs/*/worksheet", async route => {
    if (route.request().method() === "GET") return route.fulfill({json:state.record});
    if (state.offline) return route.fulfill({status:503,json:{message:"Disconnected"}});
    if (state.delay) { state.delay=false; state.pending=true; await new Promise<void>(resolve=>{state.release=resolve;}); }
    const payload = route.request().postDataJSON();
    if (payload.revision !== state.record.revision) return route.fulfill({status:409,json:{message:"Another tab saved"}});
    state.record = {...payload,revision:payload.revision+1,saved_at:"2026-10-23T12:00:00Z",saved_by:"learner_review01"};
    model.snapshot.workspace.worksheet=state.record;
    model.snapshot.workspace.revision++;
    await route.fulfill({json:state.record});
  });
  return {state,model};
}
async function openWorksheet(page: Page) {
  await page.goto("/#/live/"+RID+"/cases/case_main");
  await page.locator(".learning-worksheet > summary").click();
  await expect(page.getByRole("textbox",{name:"1. Observation",exact:true})).toBeVisible();
}
test("worksheet saves, survives refresh and retains edits through disconnection", async ({page}) => {
  const {state} = await worksheet(page);
  await openWorksheet(page);
  await page.getByRole("textbox",{name:"1. Observation",exact:true}).fill("Observed one unusual access context");
  await expect.poll(()=>state.record.fields.observation).toBe("Observed one unusual access context");
  await page.reload(); await page.locator(".learning-worksheet > summary").click();
  await expect(page.getByRole("textbox",{name:"1. Observation",exact:true})).toHaveValue("Observed one unusual access context");
  state.offline=true;
  await page.getByRole("textbox",{name:"2. Working hypothesis",exact:true}).fill("Compare legitimate concurrent work");
  await expect(page.locator(".learning-worksheet [role=status]")).toContainText("Reconnect required");
  await page.reload(); await page.locator(".learning-worksheet > summary").click();
  await expect(page.getByRole("textbox",{name:"2. Working hypothesis",exact:true})).toHaveValue("Compare legitimate concurrent work");
  await expect(page.locator(".learning-worksheet [role=status]")).toContainText("Reconnect required");
  state.offline=false; await page.getByRole("button",{name:"Retry saving",exact:true}).click();
  await expect.poll(()=>state.record.fields.hypothesis).toBe("Compare legitimate concurrent work");
  await expect(page.locator(".learning-worksheet [role=status]")).toContainText("Saved");
});
test("worksheet offers recoverable comparison after a concurrent revision",async({page})=>{
  const {state}=await worksheet(page);await openWorksheet(page);
  state.record={...state.record,revision:1,fields:{...fields(),observation:"Other analyst observation"}};
  await page.getByRole("textbox",{name:"1. Observation",exact:true}).fill("My unsynchronized observation");
  await expect(page.locator(".learning-conflict")).toContainText("Another tab saved revision 1");
  await expect(page.getByRole("textbox",{name:"1. Observation",exact:true})).toHaveValue("My unsynchronized observation");
  await page.getByRole("button",{name:"Save my copy as next revision"}).click();
  await expect.poll(()=>state.record.revision).toBe(2);
  expect(state.record.fields.observation).toBe("My unsynchronized observation");
});
test("obsolete save cannot erase a newer recovery draft after navigation",async({page})=>{
  const {state}=await worksheet(page);await openWorksheet(page);
  state.delay=true;
  await page.getByRole("textbox",{name:"1. Observation",exact:true}).fill("First save");
  await expect.poll(()=>state.pending).toBe(true);
  await page.evaluate(id=>{location.hash="#/live/"+id+"/logs";},RID);
  await expect(page.getByRole("heading",{name:"New Search",exact:true})).toBeVisible();
  await page.evaluate(id=>{location.hash="#/live/"+id+"/cases/case_main";},RID);
  await page.locator(".learning-worksheet > summary").click();
  await page.getByRole("textbox",{name:"1. Observation",exact:true}).fill("Newer recovery copy");
  state.release();
  await expect.poll(()=>page.evaluate(id=>JSON.parse(sessionStorage.getItem("soc-worksheet:learner_review01:"+id)??"null")?.fields.observation,RID)).toBe("Newer recovery copy");
  await expect(page.getByRole("textbox",{name:"1. Observation",exact:true})).toHaveValue("Newer recovery copy");
});
for(const width of [320,390,768,1440]) test("learning worksheet reflows and labels controls at "+width,async({page})=>{
  await worksheet(page);await page.setViewportSize({width,height:1000});await openWorksheet(page);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const results=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa","wcag22aa"]).analyze();
  expect(results.violations.filter(v=>["serious","critical"].includes(v.impact??""))).toEqual([]);
});
test("a cross-tab analyst change cannot load another analyst's local case draft",async({page,context})=>{
  let actor="learner_analystA";
  await worksheet(page);
  await page.route("**/api/session",route=>route.fulfill({json:{id:actor,name:actor,role:"learner"}}));
  await openWorksheet(page);
  await page.getByRole("textbox",{name:"Investigation notes",exact:true}).fill("Analyst A unsynchronized work");
  const other=await context.newPage();await installSoc(other,true);
  await other.goto("/");actor="learner_analystB";
  await other.evaluate(()=>localStorage.setItem("soc-identity-revision",crypto.randomUUID()));
  await expect(page.getByRole("heading",{name:"Choose your investigation",exact:true})).toBeVisible();
  await page.goto("/#/live/"+RID+"/cases/case_main");
  await expect(page.getByRole("textbox",{name:"Investigation notes",exact:true})).toHaveValue("");
  const retained=await page.evaluate(id=>sessionStorage.getItem("soc-draft:learner_analystA:"+id+":case-text"),RID);
  expect(retained).toContain("Analyst A unsynchronized work");await other.close();
});
test("a recovered case draft cannot silently overwrite a newer server revision",async({page})=>{
  const {model}=await worksheet(page);await openWorksheet(page);
  await page.getByRole("textbox",{name:"Investigation notes",exact:true}).fill("Local draft based on revision zero");
  model.snapshot.workspace.cases[0].note="Newer acknowledged server notes";
  model.snapshot.workspace.cases[0].revision=1;model.snapshot.workspace.revision++;
  await page.reload();
  await expect(page.getByRole("textbox",{name:"Investigation notes",exact:true})).toHaveValue("Local draft based on revision zero");
  await page.getByRole("button",{name:"Save notes",exact:true}).click();
  await expect(page.getByRole("alert")).toContainText("Case changed in another tab");
  expect(model.snapshot.workspace.cases[0].note).toBe("Newer acknowledged server notes");
});
test("coached orientation requires Begin investigation and keeps company policy readable",async({page})=>{
  const model=await installSoc(page,true);
  model.snapshot.awaiting_begin=true;model.snapshot.paused=true;
  model.snapshot.scenario={...model.snapshot.scenario,briefing:{version:"test",role:"On-duty junior analyst",authority:"Investigate released evidence.",normal_work:["Employees read authorized reports."],evidence_limits:"Application audits only.",escalation_policy:"Escalate corroborated access anomalies.",recovery_policy:"Verify denial and legitimate work separately.",assessment:"Server score is authoritative."}};
  await page.route("**/api/runs/*/begin",route=>{model.snapshot.awaiting_begin=false;model.snapshot.paused=false;model.snapshot.state_revision++;return route.fulfill({json:model.snapshot});});
  await page.goto("/#/live/"+RID+"/monitoring");
  await expect(page.getByRole("button",{name:"Resume exercise",exact:true})).toBeDisabled();
  await expect(page.locator(".learning-briefing")).toHaveCount(0);
  await page.getByRole("link",{name:"Revisit the company briefing",exact:true}).click();
  await expect(page.getByText("Application audits only.",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Begin investigation",exact:true}).focus();await page.keyboard.press("Enter");
  await expect(page.getByRole("button",{name:"Pause exercise",exact:true})).toBeEnabled();
  expect(model.snapshot.awaiting_begin).toBe(false);
});
test("learning exercises remain clearly separate from live evidence",async({page})=>{
  await installSoc(page,true);
  await page.route("**/api/learning",route=>route.fulfill({json:{references:[{id:"reference",title:"Read an authentication event",text:"A session is an access context."}],exercises:["Authentication","Normal activity","Control scope"].map((title,i)=>({id:"exercise-"+i,title,prompt:"Learning example: test this distinction.",choices:["Use corroborating evidence","Assume compromise"],answer:0,explanation:"Compare evidence before concluding."}))}}));
  await page.goto("/#/live/"+RID+"/learn");
  await expect(page.locator(".learning-exercise")).toHaveCount(3);
  const exercise=page.locator(".learning-exercise").first();
  await exercise.getByRole("radio",{name:"Use corroborating evidence"}).check();
  await exercise.getByRole("button",{name:"Check my reasoning"}).click();
  await expect(exercise.getByRole("status")).toContainText("Compare evidence before concluding.");
});
