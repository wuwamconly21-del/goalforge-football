// Server-owned broadcast timing. Existing live matches retain their frozen timeline.
export const broadcastDefaults={openingEnabled:true,openingSeconds:83,breakEnabled:true,breakSeconds:20,matchSeconds:180};
export function broadcastSettings(s:any){const cfg={...broadcastDefaults,...s.broadcast};cfg.breakSeconds=cfg.breakSeconds>=15&&cfg.breakSeconds<=30?cfg.breakSeconds:20;return cfg}
export function breakDuration(s:any){const cfg=broadcastSettings(s),value=s.lastBreakSeconds??(cfg.breakEnabled?cfg.breakSeconds:0);return value===0?0:value>=15&&value<=30?value:20}
export function broadcastPhase(s:any,now=Date.now()){
 const live=s?.live;if(live?.presentationStarted>now){const ceremony=live.ceremonyUntil>now;return {kind:ceremony?'ceremony':'sponsorBreak',start:ceremony?live.opened:live.breakStarted,end:live.presentationStarted,remaining:Math.max(0,Math.ceil((live.presentationStarted-now)/1000))}}
 if(!live&&s?.lastMatchEndedAt&&!s.champion&&s.fixtures?.some((f:any)=>!f.done)){const cfg=broadcastSettings(s),end=s.lastMatchEndedAt+breakDuration(s)*1000;if(now<end)return {kind:'sponsorBreak',start:s.lastMatchEndedAt,end,remaining:Math.ceil((end-now)/1000)}}
 return null;
}
export function musicCue(s:any,m:any,now=Date.now()){
 if(!s)return {track:'home',key:'home',age:0};const phase=broadcastPhase(s,now);
 if(phase)return {track:phase.kind==='ceremony'?'opening':'break',key:phase.kind+phase.start,age:Math.max(0,(now-phase.start)/1000)};
 const key=String(s.live?.opened||s.lastMatchEndedAt||s.createdAt||'');
 if(['entrance','lineup','countdown'].includes(m?.status))return {track:'warmup',key:'warmup'+key,age:Math.max(0,(now-(s.live?.presentationStarted||s.live?.opened||now))/1000)};
 if(m?.status==='halftime')return {track:'halftime',key:'halftime'+key,age:Math.max(0,(now-(m.stoppedAt||now))/1000)};
 if(m?.status==='fulltime'){const anchor=s.live?.opened||s.fixtures?.filter((f:any)=>f.done).at(-1)?.actualOpenedAt||key;return {track:'fulltime',key:'fulltime'+anchor,age:0}};
 return {track:'',key:'quiet'+key,age:0};
}
