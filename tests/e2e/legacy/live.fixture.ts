import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.skip(!process.env.RUN_LIVE,'Requires scripts/run_local.py and RUN_LIVE=1');
test.beforeEach(async({page})=>{
 await page.goto('/#/live');await expect(page.getByTestId('live-start')).toBeEnabled();
 await page.request.post('/api/session',{data:{code:'review-instructor'}});
 const runs=(await (await page.request.get('/api/runs')).json()).runs;
 for(const r of runs)if(!['completed','timed_out','aborted','technical_failure'].includes(r.state))await page.request.post('/api/runs/'+r.run_id+'/abort');
 await page.request.post('/api/session/logout');await page.reload();
});
test('live evidence, refresh, real containment and recorded debrief',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.getByTestId('live-start').click();await expect(page.getByRole('heading',{name:'Live monitoring',exact:true})).toBeVisible();
 await expect(page.getByText('Session observed from a new source',{exact:true})).toBeVisible({timeout:45000});
 await page.getByRole('button',{name:'Pause exercise',exact:true}).click();
 await page.getByRole('link',{name:'Live evidence',exact:true}).click();
 const row=page.getByRole('row').filter({hasText:'203.0.113.57'}).first();await expect(row).toBeVisible();await row.getByRole('button',{name:/Pin event/}).click();
 await page.getByRole('link',{name:'Live response',exact:true}).click();
 await page.getByLabel('Case notes',{exact:true}).fill('Source changed for the same access handle.');await expect(page.getByText('Saved',{exact:true})).toBeVisible();await expect.poll(async()=>{const id=page.url().match(/run_[a-z0-9]+/)![0];return (await (await page.request.get('/api/runs/'+id)).json()).workspace.note}).toBe('Source changed for the same access handle.');
 await page.reload();await expect(page.getByLabel('Case notes',{exact:true})).toHaveValue('Source changed for the same access handle.');
 await page.getByLabel('Suspected account',{exact:true}).selectOption('maya');await page.getByLabel('Suspected access',{exact:true}).selectOption('sess_A');await page.getByLabel('Reason for declaration').fill('Same session observed from a new source.');await page.getByRole('button',{name:'Declare incident',exact:true}).click();await expect(page.getByText('Declaration recorded')).toBeVisible();
 await page.getByRole('button',{name:'Apply response',exact:true}).click();await expect(page.getByText('Revoke Session ·')).toBeVisible();
 await page.getByRole('button',{name:'Run checks',exact:true}).click();await page.getByRole('link',{name:'Open debrief',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Threat stopped. Company recovered.'})).toBeVisible();await expect(page.getByRole('link',{name:'Download evidence package'})).toBeVisible();
 const id=page.url().match(/run_[a-z0-9]+/)![0];
 const replay=(await (await page.request.get('/api/runs/'+id+'/replay')).json()).events as {agent_meta?:unknown}[];
 const decision=replay.findIndex(e=>e.agent_meta);expect(decision).toBeGreaterThanOrEqual(0);
 await page.getByLabel('Recorded event',{exact:true}).fill(String(decision));
 await expect(page.getByText(/AI chose/)).toBeVisible();
 await page.getByRole('button',{name:'Inspect recorded event',exact:true}).click();
 await expect(page.getByTestId('model-decision')).toContainText(/accepted and executed|not executed/);
 await page.keyboard.press('Escape');
 const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(a11y.violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
 expect(errors).toEqual([]);await page.screenshot({path:'/tmp/cydeline-live-debrief.png',fullPage:true});
});
test('assessment is blind and cannot pause',async({page})=>{
 await page.getByLabel('Training mode').selectOption('assessment');await page.getByTestId('live-start').click();await expect(page.getByRole('heading',{name:'Live monitoring',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Pause exercise'})).toBeDisabled();await expect(page.getByText('Adversary lens',{exact:true})).toHaveCount(0);await expect(page.getByRole('link',{name:'Evidence assistant'})).toHaveCount(0);
 await page.getByRole('button',{name:'End shift',exact:true}).click();await expect(page.getByRole('button',{name:'Cancel',exact:true})).toBeFocused();await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('heading',{name:'Your shift, explained'})).toBeVisible();
});
test('mission catalog fits narrow and wide screens',async({page})=>{
 for(const width of [390,768,1440]){await page.setViewportSize({width,height:900});await expect(page.getByRole('heading',{name:'Your next shift starts here.'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);}
});
test('assistant stays inside selected evidence and the learner owns the verdict',async({page})=>{
 test.setTimeout(300000);
 await page.getByTestId('live-start').click();
 await expect(page.getByText('Session observed from a new source',{exact:true})).toBeVisible({timeout:45000});
 await page.getByRole('button',{name:'Pause exercise',exact:true}).click();
 await page.getByRole('link',{name:'Evidence assistant',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Evidence assistant',level:2})).toBeVisible();
 await expect(page.getByRole('button',{name:'Ask assistant',exact:true})).toBeDisabled();
 const picks=page.getByRole('list',{name:'Released target events'}).getByRole('checkbox');
 await expect(picks.first()).toBeVisible();
 await picks.nth(0).check();await picks.nth(1).check();
 await page.getByLabel('Question about the selected evidence').fill('What do these requests have in common, and what should I verify next?');
 const answer=page.getByRole('article',{name:/Assistant answer to/});
 // A 1.7B model occasionally fails schema or citation validation; the product reports that and lets the learner retry.
 for(let attempt=0;attempt<3&&!(await answer.count());attempt++){
  await page.getByRole('button',{name:'Ask assistant',exact:true}).click();
  await expect.poll(async()=>(await answer.count())||(await page.getByText('You can try again.').count()),{timeout:100000}).toBeGreaterThan(0);
 }
 await expect(answer).toHaveCount(1);
 await expect(answer.getByText(/Unverified/).first()).toBeVisible();
 const id=page.url().match(/run_[a-z0-9]+/)![0];
 const turn=(await (await page.request.get('/api/runs/'+id+'/assistant')).json()).turns[0];
 expect(turn.evidence_ids).toHaveLength(2);
 for(const claim of turn.analysis.claims)for(const cited of claim.evidence_ids)expect(turn.evidence_ids).toContain(cited);
 await answer.getByLabel('Your review',{exact:true}).selectOption('corroborated');
 await answer.getByLabel('What in the logs supports your review?').fill('Both requests share the handle and path.');
 await answer.getByRole('button',{name:'Save review',exact:true}).click();
 await expect(answer.getByText('Review saved')).toBeVisible();
 await expect.poll(async()=>(await (await page.request.get('/api/runs/'+id+'/assistant')).json()).turns[0].review_status).toBe('corroborated');
 expect((await (await page.request.get('/api/runs/'+id)).json()).workspace.hints_used.some((h:string)=>h.startsWith('assistant:'))).toBe(true);
 await page.reload();await expect(page.getByRole('article',{name:/Assistant answer to/}).getByText('Corroborated by you').first()).toBeVisible();
 const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(a11y.violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
});
test('progress counts only valid attempts and shows its own policy',async({page})=>{
 await page.getByTestId('live-start').click();await expect(page.getByRole('heading',{name:'Live monitoring',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'End shift',exact:true}).click();await page.getByRole('button',{name:'Confirm',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Your shift, explained'})).toBeVisible();
 await page.goto('/#/live/progress');await expect(page.getByRole('heading',{name:'Skills built through practice'})).toBeVisible();
 const data=await (await page.request.get('/api/progress')).json();
 await expect(page.getByTestId('progress-policy')).toContainText(`${data.counted} counted \u00b7 ${data.excluded} not counted`);
 expect(data.attempts.length).toBe(data.counted+data.excluded);
 for(const a of data.attempts)if(a.state==='aborted'||a.branch)expect(a.counts_toward_progress).toBe(false);
 const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(a11y.violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
});
