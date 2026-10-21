import assert from 'node:assert/strict';
import {load,cleanup,memory} from './load.mjs';
const {createShootout,shootoutState,equalShootoutPlayers}=await load('shootout');
const {events,score,penalties,winner,lineupAt,matchClock,matchPlaybackDuration}=await load('sim');
const {presetTeams}=await load('competitions'),{createArenaHandler}=await load('arena-server');
try{
 const players=Array.from({length:11},(_,i)=>({name:'P'+i,rating:75})),lineups=[players,players];
 for(const first of [0,1]){
  const early=createShootout([[1,2,3,0],[1,2,3,0]],184,first,side=>side===0,lineups);
  assert.equal(early.length,6);assert.deepEqual(shootoutState(early).goals,[3,0]);
  const sudden=createShootout([[1,2,3,0],[1,2,3,0]],244,first,(side,p,round)=>round<5||side===0,lineups);
  assert.equal(sudden.length,12);assert(shootoutState(sudden).finished);assert.equal(shootoutState(sudden).winner,0);
  for(let n=0;n<sudden.length;n++)assert(!shootoutState(sudden.slice(0,n)).finished,'never end a sudden-death round after just one turn');
 }
 const equal=equalShootoutPlayers([players,[...players.slice(0,10),null]],[new Set([2,3]),new Set()]);
 assert.equal(equal[0].length,9);assert.equal(equal[1].length,9);assert(equal.every(list=>list.includes(0)));assert(!equal[0].includes(2));
 let direct=0,extra=0,draws=0,fouls=0,restarts=0,subs=0;
 for(let seed=1;seed<=650;seed++)for(const tiebreak of ['extraTime','penalties']){
  const teams=presetTeams('my').slice(0,2),f={home:teams[0].id,away:teams[1].id,seed,mode:'rating',engine:4,weatherModel:1,knockout:true,tiebreak},s={teams,fixtures:[f],weatherPolicy:'auto'};
  const ev=events(s,f),pk=ev.filter(e=>e.type==='penaltykick');assert(winner(s,f));assert.deepEqual(score(s,f),score(s,f,tiebreak==='penalties'?180:240));
  for(const side of [0,1]){
   const changes=ev.filter(e=>e.type==='substitution'&&e.side===side);assert(changes.length<=5);subs+=changes.length;
   const windows=new Set(changes.map(e=>e.window));assert(windows.size<=3);
   assert.equal(new Set(changes.map(e=>e.player)).size,changes.length,'no bench player re-enters');
  }
  fouls+=ev.filter(e=>e.type==='foul').length;restarts+=ev.filter(e=>['throwIn','goalKick','freeKick'].includes(e.type)).length;
  if(pk.length){
   if(tiebreak==='penalties'){direct++;assert.equal(pk[0].time,184)}else{extra++;assert.equal(pk[0].time,244)}
   assert(shootoutState(pk).finished);assert.notEqual(...penalties(s,f));
   const at=lineupAt(s,f,pk[0].time-1),eligible=equalShootoutPlayers(at.lineups,[new Set(at.absent.filter(i=>i<11)),new Set(at.absent.filter(i=>i>=11).map(i=>i-11))]);
   for(const side of [0,1]){const kicks=pk.filter(e=>e.side===side);for(let i=0;i<kicks.length;i++){const e=kicks[i];assert(eligible[side].includes(e.pIndex));assert.equal(e.player,at.lineups[side][e.pIndex].name);if(i<eligible[side].length)assert(!kicks.slice(0,i).some(v=>v.pIndex===e.pIndex));}}
   const game={...s,live:{index:0,opened:0,started:16000,running:true,autoElapsed:0}};let saw=false;
   for(let t=0;t<=matchPlaybackDuration(game)+2;t++){const m=matchClock(game,16000+t*1000);if(m.status==='penalties')saw=true;if(tiebreak==='penalties')assert(!['extratime','extrabreak'].includes(m.status));}
   assert(saw);assert.equal(matchClock(game,16000+(matchPlaybackDuration(game)+1)*1000).status,'fulltime');
  }
  const league={...f,knockout:false},ls={teams};if(!winner(ls,league))draws++;assert(!events(ls,league).some(e=>e.type==='penaltykick'));
 }
 assert(direct>50&&extra>20&&draws>50&&fouls>100&&restarts>100&&subs>1000);
 const db=memory(),handle=createArenaHandler(db,{identity:{userId:'owner',isAdmin:true},passwordOnly:true});
 const post=async body=>{const r=await handle(new Request('https://goal.test/api/arena',{method:'POST',body:JSON.stringify(body)}));return {status:r.status,...await r.json()}};
 let result=await post({action:'create',preset:'my',name:'Playoff tests',format:'knockout',teamIds:presetTeams('my').slice(0,4).map(t=>t.id),knockoutRule:'penalties'});assert.equal(result.status,200);
 const room=result.room;result=await post({action:'start',room,revision:result.revision});assert.equal(result.status,200);const f=result.state.fixtures[0],before=JSON.stringify(events(result.state,f));assert.equal(f.engine,4);assert.equal(f.tiebreak,'penalties');
 result=await post({action:'footballRules',room,revision:result.revision,knockoutRule:'extraTime'});assert.equal(result.status,200);assert.equal(result.state.fixtures[0].tiebreak,'penalties');assert.equal(JSON.stringify(events(result.state,result.state.fixtures[0])),before,'rule changes cannot rewrite a live match');
 assert.equal((await post({action:'footballRules',room,revision:result.revision,knockoutRule:'invalid'})).status,400);
 console.log('PASS: 1,300 playoff simulations; early finish, sudden death, both toss outcomes, eligible kickers, equal numbers, substitution limits, league draws, restarts and frozen live rules.');
}finally{cleanup()}
