export const sourceSite='fca09e0c-d134-4b45-b1f1-43f95eb55e33';
export const sourceURL='https://goalforge-football-live.netlify.app';
export const targetWorker='goalforge-football1';
export const targetURL='https://goalforge-football1.wuwamconly21.workers.dev';
export function migrationSettings(env,config){
  for(const name of ['NETLIFY_AUTH_TOKEN','CLOUDFLARE_API_TOKEN'])if(!env[name]?.trim())throw Error('Missing repository secret: '+name);
  if(!/^[a-f0-9]{32}$/i.test(env.CLOUDFLARE_ACCOUNT_ID||''))throw Error('Set repository variable CLOUDFLARE_ACCOUNT_ID.');
  if(config.name!==targetWorker||config.main!=='cloudflare/migration-worker.ts'||config.vars?.MIGRATION_MODE!=='import')throw Error('The repository must still target the closed import Worker. Migration is not an update or reset command.');
  if(env.CLOUDFLARE_LIVE_READY==='true')throw Error('Disable the separate Actions production deployment before first migration.');
  return {...config,account_id:env.CLOUDFLARE_ACCOUNT_ID};
}
export function mayChangeLock(current,action,owner){
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(owner))throw Error('Invalid migration owner.');
  if(current?.active&&(current.owner||'local')!==owner)throw Error('Another migration owns the Netlify lock.');
  if(!['freeze','unfreeze'].includes(action))throw Error('Invalid migration lock action.');
}
export function targetIsEmpty(inventory){
  if(!Array.isArray(inventory?.rooms)||inventory.rooms.length||!Array.isArray(inventory.records))return false;
  return inventory.records.every(r=>r.id==='__migration_probe');
}
export function sameSnapshot(a,b){
  return !!a?.hash&&a.hash===b?.hash&&Array.isArray(a.records)&&a.records.some(r=>r.id==='__password_admin');
}

export function checkTargetBindings(bindings){
  if(!Array.isArray(bindings)||!bindings.some(b=>b.name==='MIGRATION_MODE'&&b.text==='import'))throw Error('The selected Cloudflare Worker is not confirmed in import mode. No deployment was attempted.');
  const arena=bindings.find(b=>b.name==='ARENA'&&b.type==='durable_object_namespace');
  if(!arena||arena.class_name!=='ArenaRecords'||arena.script_name&&arena.script_name!==targetWorker)throw Error('The selected Worker must bind ARENA to its own ArenaRecords class. No data was changed.');
}
