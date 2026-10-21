// This latch is independent of match progression: only an authenticated admin start clears it.
export const awaitsSeasonOpening=(s:any)=>s.seasonOpening?.status==='waiting'||!s.seasonOpening&&Number(s.season)>1&&!s.live&&!s.champion&&!(s.fixtures||[]).some((f:any)=>f.done);
export const openingTime=(s:any)=>{const at=Date.parse(s.seasonOpening?.at);return Number.isFinite(at)?at:null};
export function waitingSeason(at:any=null,now=Date.now()){if(at!==null&&at!==undefined&&at!==''){if(typeof at!=='string'||!Number.isFinite(Date.parse(at))||Date.parse(at)<now+1000)throw Error('Choose a future season opening time.');return {status:'waiting',at:new Date(at).toISOString()}}return {status:'waiting',at:null}}
export function releaseSeasonOpening(s:any,now=Date.now()){if(!awaitsSeasonOpening(s))return;const at=openingTime(s);if(at!==null&&at>now)throw Error('Wait for the season opening time.');s.seasonOpening={...s.seasonOpening,status:'opened',openedAt:now}}
