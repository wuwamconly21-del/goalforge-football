import assert from 'node:assert/strict';import {load,memory,cleanup} from './load.mjs';
const {createArenaHandler}=await load('arena-server'),{kickOff,confirmMatch,scheduledChanges}=await load('scheduler'),{matchClock,matchPlaybackDuration,events,score}=await load('sim'),{broadcastPhase,musicCue}=await load('broadcast'),{presetTeams}=await load('competitions');
const oldNow=Date.now;let now=Date.parse('2026-10-21T08:00:00Z');Date.now=()=>now;
try{
 const db=memory(),handle=createArenaHandler(db,{identity:{isAdmin:true,userId:'owner'},passwordOnly:true});const action=async(body,handler=handle)=>{const r=await handler(new Request('https://goal.test/api/arena',{method:'POST',body:JSON.stringify(body)}));return {status:r.status,...await r.json()}};
 let d=await action({action:'create',name:'Mahawangsa',preset:'my',teamIds:['t0','t1','t2','t3'],format:'league'}),room=d.room;assert.equal(d.status,200);
 const settings={openingEnabled:true,breakEnabled:true,breakSeconds:188,matchSeconds:300};d=await action({action:'broadcastSettings',room,revision:d.revision,broadcast:settings});assert.equal(d.status,200);
 const viewer=createArenaHandler(db,{identity:null,passwordOnly:true});assert.equal((await action({action:'broadcastSettings',room,revision:d.revision,broadcast:settings},viewer)).status,403);
 assert.equal((await action({action:'broadcastSettings',room,revision:d.revision,broadcast:{...settings,breakSeconds:1}})).status,400);
 d=await action({action:'start',room,revision:d.revision,index:0});const opened=now;assert.equal(matchClock(d.state,now).status,'ceremony');assert.equal(musicCue(d.state,matchClock(d.state),now).track,'opening');assert.equal(d.state.live.started,opened+99000);
 assert.equal((await action({action:'pause',room,revision:d.revision})).status,400);assert.equal((await action({action:'start',room,revision:d.revision,index:1})).status,400);
 assert.equal(matchClock(d.state,opened+83000).status,'entrance');assert.equal(matchClock(d.state,opened+87000).status,'lineup');assert.equal(matchClock(d.state,opened+96000).status,'countdown');assert.equal(matchClock(d.state,opened+99000).status,'playing');assert.equal(matchClock(d.state,opened+109000).time,6);
 const frozen=events(d.state,d.state.fixtures[0]),before=score(d.state,d.state.fixtures[0]);d=await action({action:'broadcastSettings',room,revision:d.revision,broadcast:{...settings,matchSeconds:900}});assert.equal(d.state.live.playbackRate,.6);assert.deepEqual(events(d.state,d.state.fixtures[0]),frozen);
 now=opened+119000;d=await action({action:'pause',room,revision:d.revision});assert.equal(d.status,200);const paused=matchClock(d.state,now).time;now+=60000;assert.equal(matchClock(d.state,now).time,paused);d=await action({action:'pause',room,revision:d.revision});assert.equal(d.status,200);assert.equal(matchClock(d.state,now+10000).time,paused+6);
 now=d.state.live.started+(matchPlaybackDuration(d.state)-d.state.live.autoElapsed)*1000+1;assert.equal(matchClock(d.state,now).status,'fulltime');d=await action({action:'next',room,revision:d.revision});assert.equal(d.status,200);assert.equal(matchClock(d.state,now).status,'sponsorBreak');assert.equal(broadcastPhase(d.state,now).remaining,188);
 d=await action({action:'start',room,revision:d.revision,index:1});assert.equal(d.status,200);assert.equal(matchClock(d.state,now).status,'sponsorBreak','manual kickoff cannot skip the sponsor interval');assert.equal(d.state.live.playbackRate,.2);assert(!d.state.live.ceremonyUntil);assert.equal(matchClock(d.state,now+188000).status,'entrance');assert.deepEqual(score(d.state,d.state.fixtures[0]),before);
 // A late scheduled fixture waits for the same shared break and then opens without a browser.
 let s=structuredClone(d.state);s.live=null;s.fixtures[1].autoStart=true;s.fixtures[1].scheduledAt=new Date(now-1000).toISOString();assert(scheduledChanges(s,now));assert.equal(matchClock(s,now).status,'sponsorBreak');assert.equal(matchClock(s,now+188000).status,'entrance');assert.equal(broadcastPhase(s,now+30000).remaining,158);
 now=s.live.started+matchPlaybackDuration(s)*1000+8000;scheduledChanges(s,now);assert(s.fixtures[1].done);assert.equal(s.season,1);assert(!s.live);
 // New season clears old break anchors; only the first match gets the ceremony.
 s={teams:presetTeams('my').slice(0,2),season:2,format:'league',fixtures:[{home:'t0',away:'t1',seed:23,mode:'open'}]};kickOff(s,0,now);assert.equal(matchClock(s,now).status,'ceremony');assert.equal(musicCue(null,null,now).track,'home');
 // Existing live broadcasts without new fields retain their original time and event outcomes.
 s.live={index:0,opened:now,started:now+16000,running:true,autoElapsed:0};assert.equal(matchClock(s,now).status,'entrance');assert.equal(matchClock(s,now+26000).time,10);
 console.log('PASS: shared opening/break timing, queued automatic/manual starts, frozen match duration, pause/resume, late joins, admin permissions and legacy timelines.');
}finally{Date.now=oldNow;cleanup()}
