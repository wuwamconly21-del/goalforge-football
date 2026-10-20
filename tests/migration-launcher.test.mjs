import assert from 'node:assert/strict';
import {cutover} from '../migration/cutover.mjs';

const order=['prepare','freeze','drain','snapshot','importAndVerify','activate','verifyLive','redirect'];
async function attempt(failure,rollbackFails=false){
  const calls=[],phases=[];
  const steps=Object.fromEntries(order.map(name=>[name,async()=>{calls.push(name);if(name===failure)throw Error(name)}]));
  steps.savePhase=async phase=>{phases.push(phase)};
  steps.unfreeze=async()=>{calls.push('unfreeze');if(rollbackFails)throw Error('offline')};
  let failed=false;
  try{await cutover(steps)}catch{failed=true}
  return {calls,phases,failed};
}
const good=await attempt();
assert.deepEqual(good.calls,order);
assert.deepEqual(good.phases,['activation-attempted','cloudflare-live','complete']);
assert.equal(good.failed,false);
for(const name of order){
  const r=await attempt(name);
  assert.equal(r.failed,true);
  const index=order.indexOf(name);
  // Includes a lost response while freezing: rollback must still be attempted.
  assert.equal(r.calls.includes('unfreeze'),index>=1&&index<5,name);
  assert.ok(!r.phases.includes('complete'),name);
  if(index>=5){assert.ok(r.phases.includes('activation-attempted'));assert.ok(!r.phases.includes('source-restored'));}
}
const rollback=await attempt('snapshot',true);
assert.equal(rollback.phases.at(-1),'source-lock-check-required');
const calls=[];
await assert.rejects(cutover({
  ...Object.fromEntries(order.map(n=>[n,async()=>{calls.push(n)}])),
  savePhase:async p=>{if(p==='activation-attempted')throw Error('disk full')},
  unfreeze:async()=>calls.push('unfreeze')
}));
assert.ok(calls.includes('unfreeze'));
assert.ok(!calls.includes('activate'));
console.log('Migration launcher: ordering, lost freeze response, rollback failure, durable intent and single-writer failures passed.');
