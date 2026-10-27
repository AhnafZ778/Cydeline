import { chromium } from '/home/ahnaf-zakaria/Downloads/Cydeline/tests/e2e/node_modules/@playwright/test/index.mjs';
import { installSoc, scenarios } from '/home/ahnaf-zakaria/Downloads/Cydeline/tests/e2e/soc-fixture.ts';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const repo='/home/ahnaf-zakaria/Downloads/Cydeline';
const source=readFileSync(repo+'/tests/e2e/briefing-layout.spec.ts','utf8');
const briefing=Function('return ('+source.match(/const briefing=(.*);\nfor/)[1]+')')();
const executablePath=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);
const browser=await chromium.launch({executablePath,args:['--no-sandbox']});
const results=[];
try {
 for(const [width,height] of [[1357,605],[320,568],[844,390]]) {
  const page=await browser.newPage({viewport:{width,height}}); await installSoc(page,false);
  await page.route('**/api/scenarios',r=>r.fulfill({json:{scenarios:scenarios.map(s=>({...s,briefing,variants:[{id:'baseline',label:'Baseline'}]}))}}));
  await page.goto('http://127.0.0.1:5177/'); await page.getByRole('button',{name:'Start scenario',exact:true}).first().click();
  const dialog=page.getByRole('dialog'),region=dialog.getByRole('region');
  await region.focus(); await page.keyboard.press('PageDown'); await page.waitForTimeout(250);
  const down=await region.evaluate(e=>e.scrollTop); assert(down>0,'PageDown must scroll briefing');
  await page.keyboard.press('Control+End');await page.waitForTimeout(250);
  const end=await region.evaluate(e=>({top:e.scrollTop,max:e.scrollHeight-e.clientHeight})); assert(Math.abs(end.max-end.top)<3,'Control+End must reach briefing bottom');
  const labels=await dialog.locator('select').evaluateAll(es=>es.map(e=>({id:e.id,visible:!!e.getClientRects().length})));assert(labels.every(e=>e.visible));
  await dialog.getByTestId('live-start').focus();await page.keyboard.press('Tab');assert(await dialog.getByRole('button',{name:'Close',exact:true}).evaluate(e=>e===document.activeElement));
  await page.keyboard.press('Shift+Tab');assert(await dialog.getByTestId('live-start').evaluate(e=>e===document.activeElement));
  const foot=await dialog.locator('footer').boundingBox();assert(foot.y+foot.height<=height);
  await page.screenshot({path:`/tmp/briefing-independent-bottom-${width}.png`});
  results.push({width,height,pageDownScroll:down,keyboardEnd:end,footer:foot,focusTrap:'forward and reverse passed'});await page.close();
 }
} finally {await browser.close();}
writeFileSync('/tmp/briefing-independent-keyboard.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
