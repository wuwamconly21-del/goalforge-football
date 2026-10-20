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
