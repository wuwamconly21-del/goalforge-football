export const migrationMessage='GoalForge migration verification is in progress.';
export function endpointResult(path,status,text){
  let body=null;try{body=JSON.parse(text)}catch{}
  const item={path,status,json:!!body&&typeof body==='object',htmlApp:path==='/'&&text.includes('id="root"'),notFound:body?.error==='Not found'};
  if(status===503&&body?.error===migrationMessage)item.reason='migration-verification';
  else if(status===503&&body?.error==='Service temporarily unavailable.')item.reason='service-error';
  if(path==='/api/arena')item.competitions=status===200&&Array.isArray(body?.rooms)?body.rooms.length:null;
  if(path==='/api/account')item.organizerConfigured=status===200&&typeof body?.organizerConfigured==='boolean'?body.organizerConfigured:null;
  return item;
}
export function workerReadiness(results){
  const home=results.find(r=>r.path==='/'),arena=results.find(r=>r.path==='/api/arena'),account=results.find(r=>r.path==='/api/account');
  const complete=!!home&&!!arena&&!!account;
  const ready=!!(complete&&home.status===200&&home.htmlApp&&arena.status===200&&Number.isInteger(arena.competitions)&&account.status===200&&account.organizerConfigured===true);
  const migrationPending=complete&&[home,arena,account].every(r=>r.status===503&&r.reason==='migration-verification');
  return {ready,state:ready?'ready':migrationPending?'migration-pending':'not-ready',exitCode:ready||migrationPending?0:2};
}
