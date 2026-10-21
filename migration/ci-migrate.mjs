import {readFile,writeFile,mkdir,rename,access,rm,appendFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {randomBytes,createHash} from 'node:crypto';
import {cutover} from './cutover.mjs';
import {migrationSettings,targetIsEmpty,sameSnapshot,sourceSite,sourceURL,targetURL,checkTargetBindings} from './ci-migration-guards.mjs';

class SafeError extends Error {}
const privateDir='.migration-private/ci';
const env={...process.env,NETLIFY_SITE_ID:sourceSite,NETLIFY_AGENT:'codex',GOALFORGE_MIGRATION_URL:targetURL,
  GOALFORGE_MIGRATION_OWNER:'gha-'+(process.env.GITHUB_RUN_ID||'local')+'-'+(process.env.GITHUB_RUN_ATTEMPT||'1')};
const state={phase:'starting',source:sourceURL,target:targetURL};
const cfScript='node_modules/wrangler/bin/wrangler.js';
const netlifyScript='.migration-private/tools/node_modules/netlify-cli/bin/run.js';
let original,originalToml,token;
const exists=async path=>{try{await access(path);return true}catch{return false}};
const jsonFile=async path=>JSON.parse(await readFile(path,'utf8'));
function command(binary,args,options={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(binary,args,{env,cwd:process.cwd(),stdio:['pipe','pipe','pipe']});
    let output='';
    child.stdout.on('data',chunk=>{if(output.length<4000000)output+=chunk;});
    // SDK stderr can include Authorization headers. Never relay raw output.
    child.stderr.on('data',()=>{});
    child.stdin.on('error',()=>{});child.stdin.end(options.input||'');
    child.on('error',()=>reject(new SafeError('Unable to launch '+(options.label||'a migration command'))));
    child.on('close',code=>code===0?resolve(output):reject(new SafeError((options.label||'Migration command')+' failed (exit '+code+'). No credentials were logged.')));
  });
}
const node=(file,args=[],options={})=>command(process.execPath,[file,...args],options);
const cf=(args,options={})=>node(cfScript,args,{label:'Cloudflare '+args[0],...options});
const helper=(name,args=[])=>node('migration/'+name,args,{label:name});
async function phase(value){
  state.phase=value;console.log('GOALFORGE_MIGRATION_PHASE '+value);
  await writeFile(privateDir+'/state.json',JSON.stringify(state,null,2),{mode:0o600});
}
async function requestJSON(url,options={}){
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new SafeError('A migration endpoint returned HTTP '+response.status+'.');
  return response.json();
}
async function providerSettings(){
  const url='https://api.cloudflare.com/client/v4/accounts/'+env.CLOUDFLARE_ACCOUNT_ID+'/workers/scripts/'+original.name+'/settings';
  const data=await requestJSON(url,{headers:{Authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN}});
  if(!data.success)throw new SafeError('Cloudflare account or Worker permissions could not be verified.');
  const bindings=data.result?.bindings||[];
  try{checkTargetBindings(bindings);}catch(error){throw new SafeError(error.message);}
}
async function assertHead(){
  const head=(await command('git',['ls-remote','origin','refs/heads/main'],{label:'GitHub branch check'})).split(/\s/)[0];
  if(!env.GITHUB_SHA||head!==env.GITHUB_SHA)throw new SafeError('The main branch changed. Retry from the latest main before maintenance.');
}
async function sourceSafe(){
  const lock=JSON.parse(await helper('netlify-lock.mjs',['status']));
  if(lock.active)throw new SafeError('Netlify is already locked by a migration. Stop and inspect the previous run; do not unlock it blindly.');
  const directory=await requestJSON(sourceURL+'/api/arena');
  if(!Array.isArray(directory.rooms))throw new SafeError('Source competition directory could not be verified.');
  if(directory.rooms.some(r=>r.live&&r.status!=='fulltime'))throw new SafeError('Wait for active matches to reach full-time before migrating.');
}
async function preflight(){
  try{original=migrationSettings(env,await jsonFile('wrangler.jsonc'));}catch(error){throw new SafeError(error.message);}
  if(env.GITHUB_REPOSITORY!=='wuwamconly21-del/goalforge-football'||env.GITHUB_REF!=='refs/heads/main')throw new SafeError('Migration must run from the authorized repository main branch.');
  originalToml=await readFile('netlify.toml','utf8');
  if(!originalToml.includes('  to = "/index.html"\n  status = 200'))throw new SafeError('Source Netlify routing has changed.');
  await assertHead();await sourceSafe();await providerSettings();
  await helper('export-netlify.mjs',[privateDir+'/preflight']);
  const manifest=await jsonFile(privateDir+'/preflight/manifest.json');
  if(!manifest.records.some(r=>r.id==='__password_admin'))throw new SafeError('Source admin account is missing; this is not the correct full export.');
  state.records=manifest.records.length;
  state.competitions=manifest.records.filter(r=>/^[0-9a-f-]{36}$/i.test(r.id)).length;
  await phase('preflight-passed');
}
async function prepare(){
  await preflight();
  if(env.CLOUDFLARE_NATIVE_BUILDS_PAUSED!=='true')throw new SafeError('Pause native Cloudflare auto-builds during migration, then set CLOUDFLARE_NATIVE_BUILDS_PAUSED=true.');
  if(!await exists(netlifyScript))throw new SafeError('The migration workflow must install the private Netlify deployment tool first.');
  await writeFile('wrangler.jsonc',JSON.stringify(original,null,2)+'\n');
  token=randomBytes(32).toString('hex');
  console.log('::add-mask::'+token);
  env.GOALFORGE_MIGRATION_TOKEN=token;
  await cf(['secret','put','MIGRATION_TOKEN'],{input:token+'\n'});
  await cf(['deploy']);
  const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
  const status=await requestJSON(targetURL+'/status',{headers});
  const inventory=await requestJSON(targetURL+'/inventory',{headers});
  if(status.mode!=='import'||!targetIsEmpty(inventory))throw new SafeError('The import target contains existing records. Overwrite/reset is refused.');
  const probe={id:'__migration_probe',secret:'',data:JSON.stringify({test:true}),revision:0};
  const result=await requestJSON(targetURL+'/import',{method:'POST',headers,body:JSON.stringify(probe)});
  if(result.hash!==createHash('sha256').update(JSON.stringify(probe)).digest('hex'))throw new SafeError('Cloudflare storage probe did not match.');
  await sourceSafe();await assertHead();await phase('target-ready');
}
async function snapshot(){
  await helper('export-netlify.mjs',[privateDir+'/final']);
  await helper('export-netlify.mjs',[privateDir+'/final-check']);
  const a=await jsonFile(privateDir+'/final/manifest.json'),b=await jsonFile(privateDir+'/final-check/manifest.json');
  if(!sameSnapshot(a,b))throw new SafeError('Source records changed after maintenance or the full admin record is missing. Import stopped.');
  state.records=a.records.length;
  state.rooms=a.records.filter(r=>/^[0-9a-f-]{36}$/i.test(r.id)).map(r=>r.id).sort();
  await phase('stable-snapshot-verified');
}
async function importAndVerify(){
  await helper('import-cloudflare.mjs',[privateDir+'/final']);
  // Verify the complete global record inventory as well as every record checksum.
  const rows=(await readFile(privateDir+'/final/records.jsonl','utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
  const expected=rows.filter(r=>!/^[0-9a-f-]{36}$/i.test(r.id)).map(r=>r.id);
  if(!expected.includes('__migration_probe'))expected.push('__migration_probe');
  const found=[];let after='';
  while(true){
    const page=await requestJSON(targetURL+'/inventory?after='+encodeURIComponent(after),{headers:{Authorization:'Bearer '+token}});
    if(!Array.isArray(page.records))throw new SafeError('Global record inventory unavailable.');
    found.push(...page.records.map(r=>r.id));
    if(page.records.length<100)break;
    const next=page.records.at(-1).id;if(next===after)throw new SafeError('Inventory cursor did not advance.');after=next;
  }
  if(JSON.stringify(expected.sort())!==JSON.stringify(found.sort()))throw new SafeError('Global account/session record inventory differs.');
  await assertHead();await phase('all-records-and-inventory-verified');
}
async function activate(){
  const live={...original,main:'cloudflare/worker.ts',vars:{...original.vars,MIGRATION_MODE:'live'}};
  const toml=originalToml.replace('  to = "/index.html"\n  status = 200','  to = "'+targetURL+'/:splat"\n  status = 302\n  force = true');
  await writeFile('wrangler.jsonc',JSON.stringify(live,null,2)+'\n');
  await writeFile('netlify.toml',toml);
  await command('git',['add','--','wrangler.jsonc','netlify.toml'],{label:'Stage verified cutover configuration'});
  await command('git',['-c','user.name=github-actions[bot]','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','commit','-m','Activate verified full GoalForge migration to Cloudflare'],{label:'Save verified cutover configuration'});
  await command('git',['push','origin','HEAD:main'],{label:'Publish verified cutover configuration'});
  // Intent was recorded before the push: an uncertain push/deploy never reopens Netlify.
  await cf(['deploy']);
}
async function verifyLive(){
  const account=await requestJSON(targetURL+'/api/account');
  const directory=await requestJSON(targetURL+'/api/arena');
  if(!account.organizerConfigured||!Array.isArray(directory.rooms))throw new SafeError('Cloudflare live account or competition check failed.');
  if(state.rooms.length<=40&&JSON.stringify(directory.rooms.map(r=>r.room).sort())!==JSON.stringify(state.rooms))throw new SafeError('Live competition registry differs from the verified export.');
  const home=await fetch(targetURL,{signal:AbortSignal.timeout(30000)});
  if(!home.ok||!(await home.text()).includes('id="root"'))throw new SafeError('Cloudflare frontend check failed.');
}
async function redirect(){
  await mkdir('.netlify',{recursive:true});
  await writeFile('.netlify/state.json',JSON.stringify({siteId:sourceSite}));
  const scheduler='netlify/functions/match-scheduler.mjs',backup=privateDir+'/match-scheduler.mjs';
  await rename(scheduler,backup);
  try{await node(netlifyScript,['deploy','--no-build','--dir','netlify-dist','--functions','netlify/functions','--prod','--skip-functions-cache','--message','Verified full GoalForge migration','--json'],{label:'Netlify redirect deployment'});}
  finally{if(await exists(backup))await rename(backup,scheduler);}
  let confirmed=false;
  for(let i=0;i<6;i++){
    const response=await fetch(sourceURL,{redirect:'manual',signal:AbortSignal.timeout(30000)});
    if(response.status===302&&new URL(response.headers.get('location')||'',sourceURL).origin===targetURL){confirmed=true;break;}
    if(i<5)await new Promise(r=>setTimeout(r,5000));
  }
  if(!confirmed)throw new SafeError('Cloudflare is live, but the old URL redirect is not yet confirmed. Netlify remains locked.');
  try{await cf(['secret','delete','MIGRATION_TOKEN'],{input:'y\n'});}
  catch{state.importSecretCleanupPending=true;console.log('Import entry is closed; temporary provider secret cleanup still needs verification.');}
}
async function main(){
  await mkdir(privateDir,{recursive:true,mode:0o700});
  let action=process.env.GOALFORGE_MIGRATION_ACTION;
  if(!action){const request=await jsonFile('migration/request.json');action=request.action;}
  if(!['preflight','migrate'].includes(action))throw new SafeError('Choose preflight or migrate.');
  if(action==='preflight'){await preflight();return;}
  await cutover({prepare,savePhase:phase,
    freeze:async()=>{await phase('freezing-source');await helper('netlify-lock.mjs',['freeze',targetURL]);},
    drain:async()=>{console.log('Waiting 60 seconds for in-flight source writes to finish.');await new Promise(r=>setTimeout(r,60000));},
    snapshot,importAndVerify,activate,verifyLive,redirect,
    unfreeze:async()=>{await helper('netlify-lock.mjs',['unfreeze']);const lock=JSON.parse(await helper('netlify-lock.mjs',['status']));if(lock.active)throw new SafeError('Source unlock not confirmed.');}
  });
}
try{await main();}
catch(error){
  process.exitCode=1;
  console.error(error instanceof SafeError?error.message:'Migration stopped; raw provider errors are hidden to protect credentials.');
  console.error('Last phase: '+state.phase+'. Target: '+targetURL);
  if(['activation-attempted','cloudflare-live','source-lock-check-required'].includes(state.phase))console.error('Do not reopen Netlify without checking Cloudflare and this run first.');
}
finally{
  if(env.GITHUB_STEP_SUMMARY){
    const lines=['# GoalForge full migration','','Phase: **'+state.phase+'**','','Target: '+targetURL,'','Records in source export: '+(state.records??'not exported'),'','No private export or credential was uploaded as an Actions artifact. The original Netlify data is retained.',''];
    await appendFile(env.GITHUB_STEP_SUMMARY,lines.join('\n'));
  }
  // The runner copy contains private password hashes and session records.
  await rm(privateDir,{recursive:true,force:true});
}
