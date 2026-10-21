import {applySchedulePlan} from './tournament-schedule';
import {broadcastSettings} from './broadcast';
import type {ArenaStore,RecordRow} from './arena-server';
import {matchClock,matchPlaybackDuration,advance,table} from './sim';
import {matchWeather} from './weather';
export function nextFixtureIndex(s:any){if(s.live)return s.live.index;const scheduled=s.fixtures.map((f:any,index:number)=>({f,index})).filter((v:any)=>!v.f.done&&v.f.autoStart&&v.f.scheduledAt).sort((a:any,b:any)=>Date.parse(a.f.scheduledAt)-Date.parse(b.f.scheduledAt));return scheduled[0]?.index??s.fixtures.findIndex((f:any)=>!f.done)}
export function kickOff(s:any,index:number,opened=Date.now(),source='manual'){
 const f=s.fixtures[index];f.weatherModel=1;f.engine=4;f.tiebreak=f.knockout?(f.tiebreak||s.knockoutRule||'extraTime'):undefined;f.rosters=structuredClone([s.teams.find((t:any)=>t.id===f.home),s.teams.find((t:any)=>t.id===f.away)]).map(({managerId,...t}:any)=>t);f.weather=matchWeather(s,f);f.actualOpenedAt=opened;const cfg=broadcastSettings(s),first=!s.fixtures.some((v:any)=>v.done),ceremonySeconds=first&&cfg.openingEnabled?cfg.openingSeconds:0,breakSeconds=!first?(s.lastBreakSeconds??(cfg.breakEnabled?cfg.breakSeconds:0)):0,presentationStarted=Math.max(opened+ceremonySeconds*1000,(s.lastMatchEndedAt||0)+breakSeconds*1000);s.live={index,auto:true,source,autoElapsed:0,elapsed:0,opened,ceremonyUntil:ceremonySeconds?presentationStarted:0,breakStarted:s.lastMatchEndedAt||opened,presentationStarted,started:presentationStarted+16000,playbackRate:180/cfg.matchSeconds,running:true,speed:1};
}
export function confirmMatch(s:any,at=Date.now()){const f=s.fixtures[s.live.index];f.done=true;f.confirmedAt=at;s.live=null;s.lastMatchEndedAt=at;const cfg=broadcastSettings(s);s.lastBreakSeconds=cfg.breakEnabled?cfg.breakSeconds:0;const previousCount=s.fixtures.length;advance(s);applySchedulePlan(s,previousCount);if(s.format==='league'&&s.fixtures.every((f:any)=>f.done))s.champion=table(s)[0]?.id||null}
export function scheduledChanges(s:any,now=Date.now()){
 if(s.removedAt||s.registration?.open||s.champion)return false;let changed=false;
 for(let limit=0;limit<512;limit++){
  const due=s.fixtures.map((f:any,index:number)=>({f,index,at:Date.parse(f.scheduledAt)})).filter((v:any)=>!v.f.done&&v.f.autoStart===true&&Number.isFinite(v.at)&&v.at<=now&&v.index!==s.live?.index).sort((a:any,b:any)=>a.at-b.at||a.index-b.index);
  if(s.live){if(!s.live.running||matchClock(s,now).status!=='fulltime')break;const end=s.live.started+(matchPlaybackDuration(s)-s.live.autoElapsed)*1000+8000;if(now<end||s.live.source!=='schedule'&&!due.length)break;confirmMatch(s,end);changed=true;if(s.champion)break;continue}
  if(!due.length)break;const first=due[0],opened=Math.max(first.at,s.lastMatchEndedAt||0);if(opened>now)break;kickOff(s,first.index,opened,'schedule');changed=true;
 }
 return changed;
}
export async function advanceScheduledRoom(db:ArenaStore,id:string):Promise<RecordRow|null>{for(let attempt=0;attempt<5;attempt++){const old=await db.get(id);if(!old)return null;const state=JSON.parse(old.data);if(state.removedAt)return null;if(!scheduledChanges(state))return old;const next={...old,revision:old.revision+1,data:JSON.stringify(state)};if(await db.update(next,old))return next}throw Error('Competition updated. Please try again.')}
export async function runSchedules(db:ArenaStore){const catalog=await db.get('__public_tournaments');if(!catalog)return {checked:0,changed:0};const ids=JSON.parse(catalog.data).filter((v:any)=>typeof v==='string'&&/^[0-9a-f-]{36}$/i.test(v));let changed=0;for(let i=0;i<ids.length;i+=6)await Promise.all(ids.slice(i,i+6).map(async(id:string)=>{const before=await db.get(id),after=await advanceScheduledRoom(db,id);if(before&&after&&after.revision>before.revision)changed++}));return {checked:ids.length,changed}}
