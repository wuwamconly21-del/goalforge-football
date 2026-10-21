import {validEntryCount} from './tournament-entry';
export const seasonLimit=(format:string,count:number,old:any)=>Math.max(format==='groups'?8:2,count,Math.min(32,Number.isInteger(Number(old))?Number(old):32));
export function seasonFormError(s:any,v:any,now=Date.now()){
 const target=Number(v.targetSeason);if(!Number.isInteger(target)||target<=Number(s.season)||target>9999||(s.history||[]).some((h:any)=>Number(h.season)===target))return 'seasonNumberError';
 if(v.archive&&!v.acknowledged)return 'seasonAcknowledgeError';if(v.archive&&(!s.champion||v.winner!=='auto')&&!String(v.reason||'').trim())return 'seasonReasonError';
 if(v.registration!=='closed'){const limit=Number(v.limit),min=v.registration==='fresh'?16:Math.max(16,s.teams.length);if(!validEntryCount(s.format,limit)||limit<min)return 'seasonLimitError'}
 if(v.registration==='closed'&&!validEntryCount(s.format,s.teams.length))return 'seasonTeamsError';
 if(v.schedule&&v.registration==='closed'){if(!v.start||!Number.isFinite(Date.parse(v.start+'+08:00'))||Date.parse(v.start+'+08:00')<now+1000)return 'futureTime';if(!Number.isInteger(Number(v.days))||Number(v.days)<1||Number(v.days)>30||!Number.isInteger(Number(v.gap))||Number(v.gap)<1||Number(v.gap)>1440)return 'seasonScheduleError'}return '';
}
