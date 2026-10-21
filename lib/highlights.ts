import {events} from './sim';
export function knownMatchTime(s:any,f:any,liveTime:number){if(s.live&&s.fixtures[s.live.index]===f)return Math.max(0,Number.isFinite(liveTime)?liveTime:0);return f.done?Infinity:0}
export function matchHighlights(s:any,f:any,knownTime:number){
 if(!f||knownTime<=0)return [];const ev=events(s,f),shown=ev.filter(e=>e.time<=knownTime),limit=Number.isFinite(knownTime)?knownTime:Math.max(180,...ev.map(e=>e.time+3.5));
 return shown.filter(e=>e.type==='goal'||e.type==='save'||e.type==='disallowed'||e.type==='card'&&e.card==='red'||e.type==='penaltykick'||e.type==='penaltymiss').map(e=>({id:e.id,event:e,priority:e.type==='goal'?5:e.type==='penaltykick'?4:e.type==='disallowed'||e.card==='red'?3:2,from:Math.max(0,e.time-4),to:Math.min(limit,e.time+3.5),shootoutScore:shown.filter(v=>v.type==='penaltykick'&&v.scored&&v.time<=e.time).reduce((v,g)=>(v[g.side]++,v),[0,0]),score:shown.filter(v=>v.type==='goal'&&v.time<=e.time).reduce((v,g)=>(v[g.side]++,v),[0,0])})).sort((a,b)=>b.event.time-a.event.time);
}
