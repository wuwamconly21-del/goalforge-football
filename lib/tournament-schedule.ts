import {expectedMatches} from './playoffs';
export function createSchedulePlan(s:any,b:any,now=Date.now()){
 const at=Date.parse(b.startAt),days=Number(b.days),intervalMinutes=Number(b.intervalMinutes);if(!Number.isFinite(at)||at<now+1000||!Number.isInteger(days)||days<1||days>30||!Number.isInteger(intervalMinutes)||intervalMinutes<1||intervalMinutes>1440||typeof b.autoStart!=='boolean')throw Error('Invalid multi-day schedule.');
 const remaining=Math.max(1,expectedMatches(s)-s.fixtures.filter((f:any)=>f.done).length-(s.live?1:0)),matchesPerDay=Math.ceil(remaining/days),local=new Date(at+28800000),minute=local.getUTCHours()*60+local.getUTCMinutes();if(minute+(matchesPerDay-1)*intervalMinutes>=1440)throw Error('Daily fixtures cross midnight. Use more days or a shorter interval.');
 return {startAt:new Date(at).toISOString(),days,intervalMinutes,autoStart:b.autoStart,matchesPerDay,nextSlot:0};
}
export function applySchedulePlan(s:any,from=0){const p=s.schedulePlan;if(!p)return;for(let i=from;i<s.fixtures.length;i++){const f=s.fixtures[i];if(f.done||s.live?.index===i)continue;const slot=p.nextSlot++,day=Math.floor(slot/p.matchesPerDay),within=slot%p.matchesPerDay;f.scheduledAt=new Date(Date.parse(p.startAt)+day*86400000+within*p.intervalMinutes*60000).toISOString();f.autoStart=p.autoStart}}
