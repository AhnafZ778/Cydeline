import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

test.skip(process.env.RUN_OBSERVER !== "1", "Requires isolated observer_server.py and matching Vite proxy; no real model qualification is implied.");

test("observer sees audited activity and private tab capture; reconnect and segments survive", async ({ browser }) => {
  const learner = await browser.newContext(), teacher = await browser.newContext(), guest = await browser.newContext();
  const base = process.env.BASE_URL!;
  let createdRun: string | undefined;
  try {
    const identity = await teacher.request.get(base + "/api/proof/identity");
    expect(identity.ok()).toBeTruthy();
    expect((await identity.json()).fixture).toBe("sentinel-observer-disposable");
    const trainee = await learner.newPage(), instructor = await teacher.newPage();
    await learner.request.get(base + "/api/session");
    const created = await learner.request.post(base + "/api/runs", {data: {}});
    expect(created.ok()).toBeTruthy();
    const rid = (await created.json()).run_id;
    createdRun = rid;
    await learner.request.post(base + `/api/runs/${rid}/start`);
    await learner.request.post(base + `/api/runs/${rid}/begin`);
    await teacher.request.post(base + "/api/session", {data: {code: "observer-browser-test"}});
    await trainee.goto(base + "/#/live/" + rid + "/monitoring");
    await trainee.getByText("Exercise recording · optional", {exact:true}).click();
    await expect(trainee.getByRole("button", {name: "Allow exercise-tab recording", exact: true})).toBeVisible({timeout:30000});
    await expect(trainee.getByRole("button", {name: "Allow exercise-tab recording", exact: true})).toHaveCount(1);
    await trainee.getByRole("button", {name: "Allow exercise-tab recording", exact: true}).click();
    await expect(trainee.getByRole("status").filter({hasText: "Exercise-tab recording is on"})).toBeVisible();
    await trainee.evaluate(() => {
      const privateArea = document.createElement("div"); privateArea.dataset.private = ""; privateArea.textContent = "private-note-do-not-record"; document.body.appendChild(privateArea);
      const input = document.createElement("input"); input.value = "private-input-do-not-record"; document.body.appendChild(input);
      const checkpoint = document.createElement("p"); checkpoint.textContent = "Public recording checkpoint"; document.body.appendChild(checkpoint);
    });
    await trainee.mouse.move(220, 250); await trainee.mouse.move(420, 300);
    await expect.poll(async () => (await (await teacher.request.get(base + `/api/observer/runs/${rid}/capture`)).json()).events.length).toBeGreaterThan(0);
    await expect.poll(async () => JSON.stringify(await (await teacher.request.get(base + `/api/observer/runs/${rid}/capture`)).json())).toContain("Public recording checkpoint");
    const captured = JSON.stringify(await (await teacher.request.get(base + `/api/observer/runs/${rid}/capture`)).json());
    expect(captured).not.toContain("private-note-do-not-record"); expect(captured).not.toContain("private-input-do-not-record");
    const turn = await teacher.request.post(base + "/api/proof/turn", {data: {run_id: rid}}); expect(turn.ok()).toBeTruthy();
    await instructor.goto(base + "/#/live/observer/" + rid);
    await expect(instructor.getByRole("heading", {name: "Target response confirmed"})).toBeVisible();
    await expect(instructor.getByRole("heading", {name: /^Model request/})).toBeVisible();
    await expect(instructor.getByText("AI-stated intent: Inspect lab access.", {exact: true})).toBeVisible();
    await expect.poll(async () => instructor.locator(".observer-screen").evaluate((frame: HTMLIFrameElement) => frame.contentDocument?.querySelectorAll("#screen iframe").length ?? 0)).toBe(1);
    await expect.poll(async () => instructor.locator(".observer-screen").evaluate((frame: HTMLIFrameElement) => frame.contentDocument?.querySelector<HTMLIFrameElement>("#screen iframe")?.contentDocument?.body.textContent ?? "")).toContain("Live Monitoring");
    const errors: string[] = []; instructor.on("pageerror", e => errors.push(e.message));
    let unavailable = true;
    await instructor.route(`**/api/observer/runs/${rid}`, route => unavailable ? route.fulfill({status:503,json:{message:"Temporary proof outage"}}) : route.continue());
    await expect(instructor.getByRole("alert")).toContainText("Temporary proof outage");
    await expect(instructor.getByRole("heading", {name: "Target response confirmed"})).toBeVisible();
    unavailable = false;
    await expect(instructor.getByRole("alert")).toHaveCount(0);
    for (const width of [1440, 768, 390, 320]) {
      await instructor.setViewportSize({width, height:900});
      expect(await instructor.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
      if (width <= 900) {
        const ai = instructor.getByRole("button", {name:"AI view", exact:true});
        await ai.focus(); await instructor.keyboard.press("Space");
        await expect(ai).toHaveAttribute("aria-pressed", "true");
        await expect(instructor.getByRole("region", {name:"AI activity", exact:true})).toBeVisible();
        await expect(instructor.getByRole("region", {name:"Trainee activity", exact:true})).toHaveCount(0);
        const traineeView = instructor.getByRole("button", {name:"Trainee view", exact:true});
        await traineeView.focus(); await instructor.keyboard.press("Enter");
        await expect(instructor.getByRole("region", {name:"Trainee activity", exact:true})).toBeVisible();
        await expect(instructor.getByRole("region", {name:"AI activity", exact:true})).toHaveCount(0);
      } else {
        await expect(instructor.getByRole("region", {name:"AI activity", exact:true})).toBeVisible();
        await expect(instructor.getByRole("region", {name:"Trainee activity", exact:true})).toBeVisible();
      }
      if (process.env.OBSERVER_EVIDENCE_DIR) { mkdirSync(process.env.OBSERVER_EVIDENCE_DIR, {recursive:true}); await instructor.screenshot({path:resolve(process.env.OBSERVER_EVIDENCE_DIR, `observer-${width}.png`), fullPage:true}); }
    }
    await trainee.getByRole("button", {name: "Stop recording", exact:true}).click();
    await trainee.getByRole("button", {name: "Allow exercise-tab recording", exact:true}).click();
    await expect(instructor.getByLabel("Recording segment")).toBeVisible();
    await instructor.getByLabel("Recording segment").selectOption({label:"Segment 1"});
    const grant = await (await teacher.request.post(base + `/api/instructor/runs/${rid}/observers`, {data:{name:"Proof observer"}})).json();
    await guest.request.post(base + "/api/session", {data:{code:grant.access_code}});
    expect((await guest.request.get(base + `/api/observer/runs/${rid}/events`)).status()).toBe(200);
    expect((await guest.request.post(base + `/api/runs/${rid}/abort`)).status()).toBe(403);
    await teacher.request.delete(base + `/api/instructor/runs/${rid}/observers/${grant.id}`);
    expect((await guest.request.get(base + `/api/observer/runs/${rid}/events`)).status()).toBe(403);
    expect((await learner.request.get(base + `/api/observer/runs/${rid}/events`)).status()).toBe(403);
    await learner.request.post(base + `/api/runs/${rid}/abort`);
    await expect(instructor.getByText("Recorded", {exact:true})).toBeVisible();
    await instructor.getByRole("button", {name:"AI view", exact:true}).click();
    await expect(instructor.getByText("Exercise ended. This is its recorded AI activity.", {exact:true})).toBeVisible();
    await expect(instructor.getByText("Waiting for the next model turn.", {exact:true})).toHaveCount(0);
    expect((await learner.request.get(base + `/api/observer/runs/${rid}/events`)).status()).toBe(200);
    expect(errors).toEqual([]);
  } finally { if (createdRun) await learner.request.post(base + `/api/runs/${createdRun}/abort`).catch(() => {}); await learner.close(); await teacher.close(); await guest.close(); }
});

test("untrusted replay cannot execute scripts, forms or network destinations", async ({browser}) => {
  const owner = await browser.newContext(), teacher = await browser.newContext();
  const base = process.env.BASE_URL!;
  let rid: string | undefined;
  try {
    expect((await (await owner.request.get(base + "/api/proof/identity")).json()).fixture).toBe("sentinel-observer-disposable");
    await owner.request.get(base + "/api/session");
    const created = await owner.request.post(base + "/api/runs", {data:{}}); expect(created.ok()).toBeTruthy(); rid = (await created.json()).run_id;
    await owner.request.post(base + `/api/runs/${rid}/start`); await owner.request.post(base + `/api/runs/${rid}/begin`);
    const consent = await (await owner.request.post(base + `/api/runs/${rid}/capture-consent`, {data:{accepted:true}})).json();
    const forbidden = base + "/api/proof/should-not-fetch";
    const text = (id: number, textContent: string) => ({type:3,id,textContent});
    const element = (id: number, tagName: string, attributes: Record<string,string> = {}, childNodes: unknown[] = []) => ({type:2,id,tagName,attributes,childNodes});
    const now = Date.now();
    const events = [{type:4,timestamp:now,data:{href:base,width:1000,height:700}},{type:2,timestamp:now+1,data:{initialOffset:{left:0,top:0},node:{type:0,id:1,childNodes:[element(2,"html",{},[element(3,"head",{},[element(12,"style",{},[text(13,`body{background-image:url('${forbidden}')}`)])]),element(4,"body",{},[
      element(5,"p",{},[text(6,"Replay security sentinel")]),
      element(7,"script",{},[text(8,"window.parent.parent.__observerEscape=true")]),
      element(9,"img",{src:forbidden,onerror:"window.parent.parent.__observerEscape=true"}),
      element(10,"form",{action:forbidden},[element(11,"button",{},[text(14,"Send untrusted form")])]),
    ])])]}}}];
    expect((await owner.request.post(base + `/api/runs/${rid}/capture`,{data:{capture_id:consent.capture_id,index:0,events}})).ok()).toBeTruthy();
    await teacher.request.post(base + "/api/session",{data:{code:"observer-browser-test"}});
    const page = await teacher.newPage();
    const before = (await (await teacher.request.get(base + "/api/proof/replay-requests")).json()).requests;
    await page.goto(base + "/#/live/observer/" + rid);
    await expect.poll(async()=>page.locator(".observer-screen").evaluate((f: HTMLIFrameElement)=>f.contentDocument?.querySelector<HTMLIFrameElement>("#screen iframe")?.contentDocument?.body.textContent ?? "")).toContain("Replay security sentinel");
    expect(await page.evaluate(()=>Boolean((window as Window & {__observerEscape?:boolean}).__observerEscape))).toBe(false);
    // A CSP-blocked attempt can emit a browser request event. Assert the owned
    // receiver saw no traffic rather than treating that event as successful I/O.
    expect((await (await teacher.request.get(base + "/api/proof/replay-requests")).json()).requests).toBe(before);
    expect(await page.locator(".observer-screen").evaluate((f: HTMLIFrameElement)=>{const d=f.contentDocument?.querySelector<HTMLIFrameElement>("#screen iframe")?.contentDocument;return d?.querySelectorAll("script,form,iframe,meta[http-equiv=refresh],img[src],[onerror]").length ?? -1;})).toBe(0);
  } finally {if(rid)await owner.request.post(base+`/api/runs/${rid}/abort`).catch(()=>{});await owner.close();await teacher.close();}
});
