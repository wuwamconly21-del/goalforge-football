export function deploymentSettings(env,template) {
  if(env.CLOUDFLARE_LIVE_READY!=='true')throw Error('Initial migration has not been marked complete.');
  if(!/^[a-f0-9]{32}$/i.test(env.CLOUDFLARE_ACCOUNT_ID||''))throw Error('Cloudflare account ID required.');
  const name=env.CLOUDFLARE_WORKER_NAME||'';
  if(!/^[a-z][a-z0-9-]{0,62}$/.test(name))throw Error('Explicit existing Worker name required.');
  if(!env.CLOUDFLARE_API_TOKEN?.trim())throw Error('Cloudflare deployment secret required.');
  const url=new URL(env.GOALFORGE_LIVE_URL||'');
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash||
    !url.hostname.startsWith(name+'.')||!url.hostname.endsWith('.workers.dev'))throw Error('Existing workers.dev URL must match the Worker name.');
  return {url:url.origin,config:{...template,name,account_id:env.CLOUDFLARE_ACCOUNT_ID,
    main:'cloudflare/worker.ts',vars:{...template.vars,MIGRATION_MODE:'live'}}};
}
export function checkLiveResponses(directory,account) {
  if(!Array.isArray(directory?.rooms)||account?.organizerConfigured!==true)throw Error('Target is not an initialized live GoalForge instance. Complete data migration first.');
}
export function verifiedRelease(template,release){
  if(release.schema!==1||release.enabled!==true||template.main!=='cloudflare/worker.ts'||template.vars?.MIGRATION_MODE!=='live'||template.name!==release.worker)throw Error('Release must match the verified live Worker.');
  const url=new URL(release.url);
  if(url.protocol!=='https:'||url.origin!==release.url||url.username||url.password||url.port||!url.hostname.startsWith(release.worker+'.')||!url.hostname.endsWith('.workers.dev'))throw Error('Release URL does not match the Worker.');
  if(release.verifiedMigrationRun!=='https://github.com/wuwamconly21-del/goalforge-football/actions/runs/39525146781')throw Error('Verified migration evidence required.');
  return {worker:release.worker,url:url.origin};
}

export function storageAvailability(directory,account,health){
 const quota=v=>v?.code==='storageQuota'||v?.error==='Exceeded allowed volume of requests in Durable Objects free tier.'||v?.error==='Exceeded allowed volume of requests in Durable Objects free tier';
 if((quota(directory)||Array.isArray(directory?.rooms))&&(quota(account)||account?.organizerConfigured===true||quota(directory)&&account?.error==='Permintaan akaun tidak dapat diproses'&&health?.version==='1.13.0')&&(quota(directory)||quota(account))&&health?.application==='GoalForge'&&health?.mode==='live'&&/^1\.\d+\.\d+$/.test(health?.version||''))return 'quota';
 checkLiveResponses(directory,account);return 'ready';
}
