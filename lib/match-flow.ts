import {matchPlaybackDuration} from './sim';
export const MATCH_GRACE_MS=16000;
export const flowHeld=(s:any,now=Date.now())=>Number(s.flow?.hold?.until)>now;
export function fullTimeAt(s:any){return s.live.started+(matchPlaybackDuration(s)-(s.live.autoElapsed||0))*1000}
export function confirmDueAt(s:any){return Math.max(fullTimeAt(s),s.flow?.enabled?s.flow.activatedAt||0:0)+MATCH_GRACE_MS}
export function prepareFlow(s:any,now=Date.now()){
 if(!s.flow?.enabled||s.removedAt||s.registration?.open||s.champion||s.live){if(s.flow?.next){s.flow.next=null;return true}return false}
 const planned=s.fixtures.map((f:any,index:number)=>({f,index})).filter((v:any)=>!v.f.done&&v.f.autoStart&&Number.isFinite(Date.parse(v.f.scheduledAt))).sort((a:any,b:any)=>Date.parse(a.f.scheduledAt)-Date.parse(b.f.scheduledAt)),index=planned[0]?.index??s.fixtures.findIndex((f:any)=>!f.done),f=s.fixtures[index];
 if(!f||f.autoStart&&Number.isFinite(Date.parse(f.scheduledAt))){if(s.flow.next){s.flow.next=null;return true}return false}
 const key=[s.season,index,f.seed,f.scheduledAt||'',s.lastMatchEndedAt||0].join(':');if(s.flow.next?.key===key)return false;
 s.flow.next={key,index,at:Math.max(now,Date.parse(f.scheduledAt)||0)+MATCH_GRACE_MS};return true;
}
export function enableFlow(s:any,enabled=true,now=Date.now()){s.flow={enabled,activatedAt:now,next:null};prepareFlow(s,now)}
export function nextTransitionAt(s:any,now=Date.now()):number|null{
 if(s.removedAt||s.registration?.open||s.champion)return null;if(flowHeld(s,now))return s.flow.hold.until;
 const dates=s.fixtures.filter((f:any,index:number)=>!f.done&&f.autoStart&&index!==s.live?.index).map((f:any)=>Date.parse(f.scheduledAt)).filter(Number.isFinite),next=dates.length?Math.min(...dates):null;
 if(s.live){if(!s.live.running)return null;const end=confirmDueAt(s);if(s.flow?.enabled||s.live.source==='schedule')return Math.max(now+100,end);return next===null?null:Math.max(now+100,end,next)}
 const fallback=s.flow?.enabled?s.flow.next?.at:null,values=[next,fallback].filter((v:any)=>Number.isFinite(v)&&v!==null&&v!==undefined);return values.length?Math.max(now+100,Math.min(...values)):null;
}
