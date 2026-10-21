import {buildCompetition} from './sim';
import {initializeDouble} from './playoffs';
import {createSchedulePlan,applySchedulePlan} from './tournament-schedule';
// Called only after authenticated admin + revision checks. Build on a copy so validation is atomic.
export function editSeason(current:any,b:any,now=Date.now()){
 const s=structuredClone(current),target=Number(b.targetSeason),started=!!s.live||s.fixtures.some((f:any)=>f.done),complete=!!s.champion&&!s.live&&s.fixtures.length>0&&s.fixtures.every((f:any)=>f.done);
 if(!Number.isInteger(target)||target<1||target>9999||target<=s.season||(s.history||[]).some((h:any)=>h.season===target))throw Error('Choose a higher unused season number from 1 to 9999.');
 if(!['renumber','archive'].includes(b.mode))throw Error('Choose a season operation.');
 if(b.mode==='renumber'&&started)throw Error('An active season must be archived first.');
 if(b.mode==='archive'&&b.confirmName!==s.name)throw Error('Type the tournament name to confirm.');
 const reason=String(b.reason||'').trim().slice(0,240);if(b.mode==='archive'&&!complete&&!reason)throw Error('Explain why this season is ending early.');
 s.history||=[];if(b.mode==='archive')s.history.push({season:s.season,teams:s.teams,fixtures:s.fixtures,format:s.format,mode:s.mode,playoffMode:s.playoffMode,champion:complete?s.champion:null,competition:s.competition,completed:complete,archivedAt:now,reason,interrupted:!!s.live});
 const from=s.season;s.season=target;s.live=null;s.champion=null;s.playoff=undefined;s.schedulePlan=undefined;s.lastMatchEndedAt=undefined;s.lastBreakSeconds=undefined;
 // Renumbering an unplayed season retains its fixture seeds and admin weather choices.
 if(b.mode==='archive')s.fixtures=s.registration?.open?[]:buildCompetition(s.teams,s.format,s.mode,s.legs);
 for(const f of s.fixtures){delete f.scheduledAt;f.autoStart=false}initializeDouble(s);
 if(b.schedule){if(s.registration?.open||!s.fixtures.length)throw Error('Close registration and prepare fixtures before scheduling.');s.schedulePlan=createSchedulePlan(s,b.schedule,now);applySchedulePlan(s)}
 s.seasonLog=[...(s.seasonLog||[]),{from,to:target,operation:b.mode,at:now,reason}].slice(-100);return s;
}
