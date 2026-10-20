// Public HTTP health check. No provider token, import or state-changing request.
import {readFile,appendFile} from 'node:fs/promises';
const origin='https://goalforge-football.wuwamconly21.workers.dev';
const paths=['/','/api/arena','/api/account'];
const results=[];
for(const path of paths){
  try {
    const response=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(20000)});
    const text=(await response.text()).slice(0,200000);
    let body=null;try{body=JSON.parse(text)}catch{}
    const item={path,status:response.status,json:!!body&&typeof body==='object',htmlApp:path==='/'&&text.includes('id="root"'),notFound:body?.error==='Not found'};
    if(path==='/api/arena')item.competitions=Array.isArray(body?.rooms)?body.rooms.length:null;
    if(path==='/api/account')item.organizerConfigured=body?.organizerConfigured===true;
    results.push(item);
  }catch(error){results.push({path,status:null,networkError:['TimeoutError','AbortError'].includes(error.name)?'timeout':'connection-failed'});}
}
const config=JSON.parse(await readFile('wrangler.jsonc','utf8'));
const ready=results[0].status===200&&results[0].htmlApp&&results[1].status===200&&Number.isInteger(results[1].competitions)&&results[2].status===200&&results[2].organizerConfigured===true;
const report={target:origin,ready,repositoryEntry:config.main,repositoryMode:config.vars?.MIGRATION_MODE||null,results};
console.log('GOALFORGE_HEALTH_REPORT '+JSON.stringify(report));
if(process.env.GITHUB_STEP_SUMMARY){
  const lines=['# GoalForge public Worker health','', 'Application ready: **'+(ready?'yes':'no')+'**','', '| Endpoint | HTTP status |','| --- | --- |',...results.map(r=>'| '+r.path+' | '+(r.status??r.networkError)+' |'),'','This check uses public GET requests only. A completed check does not migrate data or authorize Cloudflare.',''];
  await appendFile(process.env.GITHUB_STEP_SUMMARY,lines.join('\n'));
}
if(!ready)process.exitCode=2;
