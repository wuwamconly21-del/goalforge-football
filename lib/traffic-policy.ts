// Animation runs locally; network refreshes only synchronize persisted changes.
export function arenaPollDelay(s:any,admin=false,now=Date.now()){
 const active=s?.live?.running,base=active?(admin?10000:15000):s?.live?(admin?20000:30000):(admin?30000:60000);
 if(active)return base;
 const dates=[s?.flow?.next?.at,...(s?.fixtures||[]).filter((f:any)=>!f.done&&f.autoStart).map((f:any)=>Date.parse(f.scheduledAt))].filter((v:any)=>Number.isFinite(v)&&v>now);
 if(!dates.length)return base;const until=Math.min(...dates)-now;return until<=30000?(admin?4000:8000):Math.min(base,Math.max(5000,until-30000));
}
export function sweepDue(event:any){return Math.floor((Number.isFinite(event?.scheduledTime)?event.scheduledTime:Date.now())/60000)%15===0}
// Viewer counts are ephemeral. A hibernation/eviction can clear them; actual
// heartbeats restore counts without repeatedly rewriting chat history to SQL.
export class PresenceMemory{
 private rooms=new Map<string,Record<string,number>>();
 merge(room:string,values:Record<string,number>,now=Date.now()){
  const previous=this.rooms.get(room)||{},all={...previous};for(const [id,at] of Object.entries(values))if(Number.isFinite(at))all[id]=Math.max(all[id]||0,at);
  const current=Object.fromEntries(Object.entries(all).filter(([,at])=>at>now-60000).sort((a,b)=>b[1]-a[1]).slice(0,500));this.rooms.delete(room);if(this.rooms.size>=200)this.rooms.delete(this.rooms.keys().next().value!);this.rooms.set(room,current);return {...current};
 }
}
