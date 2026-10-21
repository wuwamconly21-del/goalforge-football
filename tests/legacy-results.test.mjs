import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {load,cleanup} from './load.mjs';
const {events}=await load('sim'),{presetTeams}=await load('competitions');
try{
 const hashes=[];
 for(const engine of [2,3])for(let seed=1;seed<=100;seed++)for(const knockout of [false,true]){
  const s={teams:presetTeams('my'),weatherPolicy:'rain'},f={home:s.teams[0].id,away:s.teams[1].id,seed,mode:'rating',engine,knockout,weatherModel:1};
  hashes.push(createHash('sha256').update(JSON.stringify(events(s,f))).digest('hex'));
 }
 assert.equal(createHash('sha256').update(JSON.stringify(hashes)).digest('hex'),'7d7715582604f37c1b46f22752a637da6f5054f5622b79d25a9bcc7d0e6629ac');
 console.log('PASS: 400 legacy league/cup fixtures preserve their exact pre-v1.5 event hashes.');
}finally{cleanup()}
