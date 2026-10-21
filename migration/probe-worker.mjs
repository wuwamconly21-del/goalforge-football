// Public HTTP health check. No provider token, import or state-changing request.
import {readFile,appendFile} from 'node:fs/promises';
import {endpointResult,workerReadiness} from './worker-health.mjs';
import {targetURL as origin} from './ci-migration-guards.mjs';
const paths=['/','/api/arena','/api/account'];
const results=[];
for(const path of paths){
  try {
    const response=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(20000)});
    const text=(await response.text()).slice(0,200000);
    const item=endpointResult(path,response.status,text);
    results.push(item);
  }catch(error){results.push({path,status:null,networkError:['TimeoutError','AbortError'].includes(error.name)?'timeout':'connection-failed'});}
}
const config=JSON.parse(await readFile('wrangler.jsonc','utf8'));
const {ready,state,exitCode}=workerReadiness(results);
const report={target:origin,ready,state,repositoryEntry:config.main,repositoryMode:config.vars?.MIGRATION_MODE||null,results};
console.log('GOALFORGE_HEALTH_REPORT '+JSON.stringify(report));
if(process.env.GITHUB_STEP_SUMMARY){
  const lines=['# GoalForge public Worker health','', 'State: **'+state+'**', '', 'Application ready: **'+(ready?'yes':'no')+'**','', '| Endpoint | HTTP status |','| --- | --- |',...results.map(r=>'| '+r.path+' | '+(r.status??r.networkError)+' |'),'','This check uses public GET requests only. A completed check does not migrate data or authorize Cloudflare.',''];
  await appendFile(process.env.GITHUB_STEP_SUMMARY,lines.join('\n'));
}
if(state==='migration-pending')console.log('::notice::Worker is intentionally closed while migration verification is pending. The viewer application is NOT live. Production deployment guards remain unchanged.');
process.exitCode=exitCode;
