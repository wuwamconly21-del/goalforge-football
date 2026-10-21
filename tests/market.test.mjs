import assert from 'node:assert/strict';
import {load,cleanup,memory} from './load.mjs';
const {createManagerHandler}=await load('manager-server'),{createArenaHandler}=await load('arena-server'),{presetTeams}=await load('competitions'),{score}=await load('sim'),{ensureMarket,transferAction,STARTING_BUDGET}=await load('market');
const db=memory(),admin={userId:'admin',isAdmin:true},identities=[0,1,2].map(i=>({userId:'manager:'+i,isManager:true,displayName:'Manager '+i}));
const raw=async(body,identity=admin)=>{const r=await createArenaHandler(db,{identity,passwordOnly:true})(new Request('https://goal.test/api/arena',{method:'POST',body:JSON.stringify(body)}));return {status:r.status,...await r.json()}};
let room;
const manager=async(i,body)=>{const r=await createManagerHandler(db,{identity:identities[i]})(new Request('https://goal.test/api/manager'+(!body?'?room='+room:''),{method:body?'POST':'GET',...(body?{body:JSON.stringify({room,...body})}:{})}));return {status:r.status,...await r.json()}};
try{
 let d=await raw({action:'create',autoFlow:false,preset:'custom',entry:'manager',name:'Transfer test',teamLimit:4,mode:'rating'});room=d.room;let rev=d.revision;
 for(let i=0;i<3;i++){d=await manager(i,{action:'registerTeam',revision:rev,team:presetTeams('custom')[i]});assert.equal(d.status,200);rev=d.revision}
 let a=await manager(0),b=await manager(1),c=await manager(2);const aid=a.team.id,bid=b.team.id;
 assert.equal(a.market.balance,STARTING_BUDGET);assert.equal(a.market.agents.length,12);assert.equal(a.team.reserves.length,0);
 assert.equal((await manager(2,{action:'buyPlayer',revision:rev,teamId:aid,playerId:a.market.agents[0].id})).status,403);
 d=await manager(0,{action:'buyPlayer',revision:rev,teamId:bid,playerId:a.market.agents[0].id});assert.equal(d.code,'ownOnly');
 const target=a.market.agents.find(p=>p.position==='MID'),before=a.market.balance;
 d=await manager(0,{action:'buyPlayer',revision:rev,teamId:aid,playerId:target.id,price:1});assert.equal(d.status,200);rev=d.revision;
 a=await manager(0);assert.equal(a.market.balance,before-target.price);assert.equal(a.team.reserves[0].id,target.id);assert.equal(a.canEditRoster,false);assert.equal(a.market.history.length,1);
 assert.equal((await manager(0,{action:'updateTeam',revision:rev,team:a.team})).status,403);
 assert.equal((await manager(1,{action:'buyPlayer',revision:rev,teamId:bid,playerId:target.id})).code,'marketUnavailable');
 d=await manager(0,{action:'lineupSwap',revision:rev,teamId:aid,part:'reserves',playerId:target.id,slot:0});assert.equal(d.code,'keeperRequired');
 d=await manager(0,{action:'lineupSwap',revision:rev,teamId:aid,part:'reserves',playerId:target.id,slot:6});assert.equal(d.status,200);rev=d.revision;a=await manager(0);assert.equal(a.team.players[6].id,target.id);assert.equal(a.team.players.length,11);
 assert.equal((await manager(0,{action:'listPlayer',revision:rev,teamId:aid,playerId:target.id,price:2e6})).code,'sellReservesOnly');
 const sale=a.team.bench[1];d=await manager(0,{action:'listPlayer',revision:rev,teamId:aid,playerId:sale.id,price:-1});assert.equal(d.code,'invalidPrice');
 d=await manager(0,{action:'listPlayer',revision:rev,teamId:aid,playerId:sale.id,price:3e6});assert.equal(d.status,200);rev=d.revision;a=await manager(0);let listing=a.market.listings[0];assert.equal((await manager(0,{action:'buyPlayer',revision:rev,teamId:aid,listingId:listing.id})).code,'cannotBuyOwn');
 assert.equal((await manager(0,{action:'lineupSwap',revision:rev,teamId:aid,part:'bench',playerId:sale.id,slot:1})).code,'cancelBeforeLineup');
 b=await manager(1);const total=a.market.balance+b.market.balance;
 d=await manager(1,{action:'buyPlayer',revision:rev,teamId:bid,listingId:listing.id,price:0});assert.equal(d.status,200);rev=d.revision;a=await manager(0);b=await manager(1);assert.equal(a.market.balance+b.market.balance,total);assert.equal(b.team.reserves[0].id,sale.id);assert(!a.team.bench.some(p=>p.id===sale.id));assert.equal(a.market.listings.length,0);
 // Two managers purchasing the same stock at the same revision cannot both commit.
 const contested=a.market.agents[0].id,results=await Promise.all([manager(1,{action:'buyPlayer',revision:rev,teamId:bid,playerId:contested}),manager(2,{action:'buyPlayer',revision:rev,teamId:c.team.id,playerId:contested})]);assert.deepEqual(results.map(v=>v.status).sort(),[200,409]);rev=results.find(v=>v.status===200).revision;
 const state=JSON.parse((await db.get(room)).data),all=state.teams.flatMap(t=>[...t.players,...t.bench,...t.reserves]);assert.equal(all.filter(p=>p.id===contested).length,1);assert.equal(new Set(all.map(p=>p.id)).size,all.length);
 d=await raw({action:'marketWindow',room,revision:rev,open:false});assert.equal(d.status,200);rev=d.revision;a=await manager(0);assert.equal(a.market.open,false);assert.equal((await manager(0,{action:'buyPlayer',revision:rev,teamId:aid,playerId:a.market.agents[0].id})).code,'marketClosed');
 d=await raw({action:'marketWindow',room,revision:rev,open:true});rev=d.revision;
 d=await raw({action:'registration',room,revision:rev,open:false,limit:4});assert.equal(d.status,200);rev=d.revision;
 d=await raw({action:'start',room,revision:rev,index:d.state.fixtures.findIndex(f=>f.home===aid||f.away===aid)});assert.equal(d.status,200);rev=d.revision;const result=score(d.state,d.state.fixtures[d.state.live.index]);
 assert.equal((await manager(0,{action:'listPlayer',revision:rev,teamId:aid,playerId:a.team.bench[0].id,price:2e6})).code,'marketMatchLocked');
 // Future roster changes cannot rewrite the frozen played-match squads.
 const frozen=structuredClone(d.state);frozen.teams[0].players.forEach(p=>p.rating=1);assert.deepEqual(score(frozen,frozen.fixtures[frozen.live.index]),result);
 // Boundary checks on the domain service (all prices authoritative).
 const isolated=structuredClone(state);ensureMarket(isolated);const club=isolated.teams[0];club.finance.balance=0;assert.throws(()=>transferAction(isolated,club,{action:'buyPlayer',teamId:club.id,playerId:isolated.market.agents[0].id}),/insufficientBudget/);club.finance.balance=STARTING_BUDGET;club.reserves=Array.from({length:7},(_,i)=>({id:'extra'+i}));assert.throws(()=>transferAction(isolated,club,{action:'buyPlayer',teamId:club.id,playerId:isolated.market.agents[0].id}),/reservesFull/);
 const depleted=structuredClone(state);ensureMarket(depleted);depleted.market.agents=[];ensureMarket(depleted);assert.equal(depleted.market.agents.length,0,'sold stock must not respawn on read');const balance=depleted.teams[0].finance.balance;depleted.season++;ensureMarket(depleted);assert.equal(depleted.market.agents.length,12);assert.equal(depleted.teams[0].finance.balance,balance);
 console.log('PASS: transfers, server prices, conserved budgets, single-sale CAS, ownership, match locks, 25-player limit, lineup swaps, admin window, persistent finances and frozen results.');
}finally{cleanup()}
