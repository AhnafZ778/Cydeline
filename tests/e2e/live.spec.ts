import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

test.skip(!process.env.RUN_LIVE, 'Requires a dedicated scripts/run_local.py range and RUN_LIVE=1');
test.describe.configure({mode:'serial'});
const terminal = (s:string)=>['completed','timed_out','aborted','technical_failure'].includes(s);
const proofDir=process.env.LIVE_PROOF_DIR ?? '/tmp/sentinel-live-proof';
const pin=process.env.LIVE_INSTRUCTOR_PIN;
async function snapshot(page:Page,rid:string){return (await page.request.get('/api/runs/'+rid)).json();}
test.beforeEach(async({page})=>{
  await page.goto('/');
  if(!pin) throw Error('LIVE_INSTRUCTOR_PIN must identify the dedicated review range.');
  const login=await page.request.post('/api/session',{data:{code:pin}});expect(login.ok()).toBeTruthy();
  const runs=(await (await page.request.get('/api/runs')).json()).runs;
  for(const run of runs) if(!terminal(run.state)) expect((await page.request.post('/api/runs/'+run.run_id+'/abort')).ok()).toBeTruthy();
  await page.request.post('/api/session/logout');await page.reload();
  await expect(page.locator('.soc-scenario-cards article')).toHaveCount(2);
});
async function launch(page:Page,name:string,assessment=false){
  await page.locator('article').filter({has:page.getByRole('heading',{name,exact:true})}).getByRole('button',{name:'Start scenario',exact:true}).click();
  if(assessment) await page.getByLabel('Training mode',{exact:true}).selectOption('assessment');
  await expect(page.getByTestId('live-start')).toBeEnabled({timeout:30000});
  const created=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/runs'&&r.request().method()==='POST',{timeout:45000});
  await page.getByTestId('live-start').click();expect((await created).ok()).toBeTruthy();
  await expect(page.getByRole('heading',{name:'Live Monitoring',exact:true})).toBeVisible();
  return page.url().match(/run_[a-z0-9]+/)![0];
}
for(const [name,version] of [['The Stolen Session','v1'],['The Reporting Blind Spot','v2']]) test(name+' real model, worksheet, case response and immutable export',async({page})=>{
  test.setTimeout(360000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const rid=await launch(page,name);
  await expect(page.getByRole('button',{name:'Begin investigation',exact:true})).toBeVisible();
  expect((await snapshot(page,rid)).virtual_clock_sec).toBe(0);
  await page.getByRole('button',{name:'Begin investigation',exact:true}).click();
  for(let attempt=0;attempt<3;attempt++){
    // A v2 turn has two sequential 30s model budgets plus socket allowance.
    await expect.poll(async()=>{const r=await snapshot(page,rid);return r.workspace.alerts.length>0||r.ai_unavailable;},{timeout:80000}).toBe(true);
    const current=await snapshot(page,rid);
    if(current.workspace.alerts.length) break;
    const retryResponse=page.waitForResponse(r=>r.url().endsWith('/api/runs/'+rid+'/ai/retry')&&r.request().method()==='POST',{timeout:80000});
    await page.getByRole('button',{name:'Retry AI',exact:true}).click();
    expect((await retryResponse).ok()).toBeTruthy();
  }
  await expect.poll(async()=> (await snapshot(page,rid)).workspace.alerts.length,{timeout:30000}).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Pause exercise',exact:true}).click();
  const s=await snapshot(page,rid),alert=s.workspace.alerts[0];
  const targetEvents=(await (await page.request.get('/api/runs/'+rid+'/events')).json()).events;
  expect(targetEvents.some((e:any)=>e.decision_id&&e.target_audit_id)).toBe(true);
  await page.getByRole('button',{name:'Take ownership of '+alert.id,exact:true}).click();await page.getByTestId('take-confirm').click();
  await page.getByRole('button',{name:'Create case '+alert.id,exact:true}).click();await page.getByTestId('create-continue').click();
  await expect(page.getByRole('heading',{name:'Incident Details',exact:true})).toBeVisible();
  await page.getByRole('textbox',{name:'Investigation notes',exact:true}).fill('The same access context changed source. Compare legitimate concurrent activity.');
  await page.getByRole('button',{name:'Save notes',exact:true}).click();
  await page.locator('.learning-worksheet > summary').click();
  await page.getByRole('textbox',{name:'1. Observation',exact:true}).fill('Observed a changed access source; attribution remains uncertain.');
  await expect.poll(async()=> (await (await page.request.get('/api/runs/'+rid+'/worksheet')).json()).revision).toBe(1);
  await page.reload();await page.locator('.learning-worksheet > summary').click();
  await expect(page.getByRole('textbox',{name:'1. Observation',exact:true})).toHaveValue('Observed a changed access source; attribution remains uncertain.');
  await page.context().setOffline(true);
  await page.getByRole('textbox',{name:'2. Working hypothesis',exact:true}).fill('Retain the competing legitimate-work explanation during reconnection.');
  await expect(page.locator('.learning-worksheet [role=status]')).toContainText('Reconnect required');
  await page.context().setOffline(false);await page.getByRole('button',{name:'Retry saving',exact:true}).click();
  await expect.poll(async()=> (await (await page.request.get('/api/runs/'+rid+'/worksheet')).json()).revision).toBe(2);
  const savedWorksheet=await (await page.request.get('/api/runs/'+rid+'/worksheet')).json();
  expect(savedWorksheet.fields.hypothesis).toBe('Retain the competing legitimate-work explanation during reconnection.');
  await page.reload();await page.locator('.learning-worksheet > summary').click();
  await expect(page.getByRole('textbox',{name:'2. Working hypothesis',exact:true})).toHaveValue(savedWorksheet.fields.hypothesis);
  await expect.poll(async()=> (await snapshot(page,rid)).workspace.alerts[0].owner_id).toBeTruthy();
  await page.getByRole('link',{name:'Log Management',exact:true}).click();
  await page.getByRole('button',{name:'Pro',exact:true}).click();await page.getByLabel('Pro query',{exact:true}).fill('ip:203.0.113.57');await page.getByRole('button',{name:'Search',exact:true}).click();
  await page.locator('.lm__list > li > button').first().click();await page.getByRole('button',{name:'Pin as evidence',exact:true}).click();
  await page.getByRole('link',{name:'Case Management',exact:true}).click();await page.getByRole('link',{name:'case_main',exact:true}).click();
  if(version==='v1'){
    await page.getByRole('link',{name:'Evidence Assistant',exact:true}).click();
    await page.getByRole('button',{name:/Use my pinned evidence/}).click();
    await page.getByRole('combobox',{name:'Assistance level',exact:true}).selectOption('guide');
    await page.getByRole('textbox',{name:'Question about the selected evidence',exact:true}).fill('Could legitimate concurrent work explain a changed source IP?');
    await page.getByRole('button',{name:'Ask assistant',exact:true}).click();
    const turn=page.getByRole('article',{name:'Assistant answer to: Could legitimate concurrent work explain a changed source IP?',exact:true});
    await expect(turn).toBeVisible({timeout:70000});await expect(turn.getByText('Query to try:',{exact:true})).toBeVisible();
    await turn.getByRole('combobox',{name:'Your review',exact:true}).selectOption('disputed');
    await turn.getByRole('textbox',{name:'What in the logs supports your review?',exact:true}).fill('The selected event alone cannot establish attribution; compare earlier sources.');
    await turn.getByRole('button',{name:'Save review',exact:true}).click();await expect(turn.getByText('Review saved',{exact:true})).toBeVisible();
    await page.reload();await expect(turn.getByRole('combobox',{name:'Your review',exact:true})).toHaveValue('disputed');
    const answers=(await (await page.request.get('/api/runs/'+rid+'/assistant')).json()).turns;
    expect(answers.at(-1).prompt_version).toBe('evidence-coach-8');expect(answers.at(-1).review_status).toBe('disputed');
    await page.getByRole('link',{name:'Case Management',exact:true}).click();await page.getByRole('link',{name:'case_main',exact:true}).click();
  }
  await page.getByTestId('start-playbook').click();await page.getByTestId('playbook-next').click();
  await page.getByRole('textbox',{name:'Scope and working hypothesis',exact:true}).fill('Investigated the observed browser context and independent reporting dependencies; verify each access path.');await page.getByTestId('playbook-next').click();
  await page.getByRole('combobox',{name:'Suspected account',exact:true}).selectOption('maya');await page.getByRole('combobox',{name:'Suspected access',exact:true}).selectOption('sess_A');await page.getByRole('textbox',{name:'Reason for declaration',exact:true}).fill('A source change on the same access context warrants containment and fresh verification.');
  await page.getByRole('button',{name:'Declare incident',exact:true}).click();await expect(page.getByText('Declaration recorded:',{exact:false})).toBeVisible();await page.getByTestId('playbook-next').click();
  await page.getByRole('combobox',{name:'Response target',exact:true}).selectOption('sess_A');await page.getByRole('button',{name:'Apply response',exact:true}).click();
  await expect.poll(async()=> (await snapshot(page,rid)).applied_actions.length).toBe(1);
  if(version==='v2'){
    await page.getByRole('combobox',{name:'Response',exact:true}).selectOption('revoke_api_credential');await page.getByRole('combobox',{name:'Response target',exact:true}).selectOption('key_reporting');await page.getByRole('button',{name:'Apply response',exact:true}).click();
    await expect.poll(async()=> (await snapshot(page,rid)).applied_actions.length).toBe(2);
  }
  await page.getByTestId('playbook-next').click();await page.getByRole('button',{name:'Run checks',exact:true}).click();
  await expect.poll(async()=> (await snapshot(page,rid)).verification?.all_passed).toBe(true);await page.getByTestId('playbook-next').click();
  await page.getByRole('textbox',{name:'Investigation report',exact:true}).fill('Evidence shows a changed access context. Revoked observed compromised access, verified independent denial and legitimate workflows, and preserved uncertainty in handoff.');
  await page.getByTestId('playbook-next').click();await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'End shift',exact:true}).click();await page.getByRole('button',{name:'Finish & evaluate',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Threat stopped. Company recovered.',exact:true})).toBeVisible();
  const replayResponse=await page.request.get('/api/runs/'+rid+'/replay');
  const replayText=await replayResponse.text(),replay=JSON.parse(replayText);
  expect(replay.workspace.cases[0].submitted_report.text).toContain('verified independent denial');
  expect(replay.defender_actions.every((a:any)=>a.target_audit_id)).toBe(true);
  const terminalWorksheet=await (await page.request.get('/api/runs/'+rid+'/worksheet')).json();
  const rejected=await page.request.patch('/api/runs/'+rid+'/worksheet',{data:{revision:terminalWorksheet.revision,save_id:'terminal_attempt_001',fields:{observation:'must not replace'},evidence_ids:[]}});expect(rejected.status()).toBe(409);
  expect(await (await page.request.get('/api/runs/'+rid+'/worksheet')).json()).toEqual(terminalWorksheet);
  const exported=await page.request.get('/api/runs/'+rid+'/export');expect(exported.ok()).toBeTruthy();expect(exported.headers()['content-type']).toContain('zip');
  const again=await (await page.request.get('/api/runs/'+rid+'/replay')).json();expect(again.trace_hash).toBe(replay.trace_hash);
  await page.reload();await expect(page.getByRole('heading',{name:'Threat stopped. Company recovered.',exact:true})).toBeVisible();
  const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(a11y.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);
  expect(errors).toEqual([]);mkdirSync(proofDir,{recursive:true});writeFileSync(proofDir+'/'+version+'-replay.json',replayText);await page.screenshot({path:proofDir+'/'+version+'-debrief.png',fullPage:true});
});
test('real assessment starts immediately, stays blind and rejects manual pause/coaching',async({page})=>{
  const rid=await launch(page,'The Stolen Session',true);
  await expect(page.getByRole('button',{name:'Begin investigation',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Pause exercise',exact:true})).toBeDisabled();
  expect((await page.request.post('/api/runs/'+rid+'/pause')).status()).toBe(403);
  await page.getByRole('link',{name:'Evidence Assistant',exact:true}).click();await expect(page.getByText('The evidence assistant is unavailable during assessments',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'End shift',exact:true}).click();await page.getByRole('button',{name:'Abort exercise',exact:true}).click();
  await expect(page.getByRole('link',{name:'Download evidence package',exact:true})).toBeVisible();
});
