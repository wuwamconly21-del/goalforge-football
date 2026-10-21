import {waitingSeason} from './season-opening';
import {validEntryCount,entryMinimum} from './tournament-entry';
import {enableFlow} from './match-flow';
import {matchClock} from './sim';
import {confirmMatch} from './scheduler';
import {seasonLimit} from './season-form';
import {buildCompetition} from './sim';
import {initializeDouble} from './playoffs';
import {createSchedulePlan,applySchedulePlan} from './tournament-schedule';
// Called only after authenticated admin + revision checks. Build on a copy so validation is atomic.
const validLimit=validEntryCount;
export function setArchiveResult(h:any,b:any,now=Date.now()){
 const note=String(b.note||'').trim().slice(0,240);if(!note)throw Error('Add a reason for the archive correction.');
 if(b.restore!==true&&b.championId!==null&&!h.teams.some((t:any)=>t.id===b.championId))throw Error('Choose a team from that archived season.');
 const original=h.resultSource==='admin'?h.simulatedChampion:h.champion,chosen=b.restore===true?original??null:b.championId;h.resultChanges=[...(h.resultChanges||[]),{at:now,from:h.champion||null,to:chosen,note,source:b.restore===true?'restore':'admin'}].slice(-50);
 if(b.restore===true){h.champion=original??null;delete h.resultSource;delete h.resultNote;delete h.simulatedChampion}else{h.simulatedChampion=original??null;h.champion=chosen;h.resultSource='admin';h.resultNote=note}
 return h;
}
export function editSeason(current:any,b:any,now=Date.now()){
 const s=structuredClone(current);if(s.live&&matchClock(s,now).status==='fulltime')confirmMatch(s,now);
 const target=Number(b.targetSeason),started=!!s.live||s.fixtures.some((f:any)=>f.done),complete=!!s.champion&&!s.live&&s.fixtures.length>0&&s.fixtures.every((f:any)=>f.done);
 if(!Number.isInteger(target)||target<1||target>9999||target<=s.season||(s.history||[]).some((h:any)=>h.season===target))throw Error('Choose a higher unused season number from 1 to 9999.');
 if(!['renumber','archive'].includes(b.mode))throw Error('Choose a season operation.');
 if(b.mode==='renumber'&&started)throw Error('An active season must be archived first.');
 if(b.mode==='archive'&&b.confirmName!==s.name)throw Error('Type the tournament name to confirm.');
 const reason=String(b.reason||'').trim().slice(0,240);if(b.mode==='archive'&&!complete&&!reason)throw Error('Explain why this season is ending early.');
 s.history||=[];if(b.mode==='archive')s.history.push({season:s.season,teams:s.teams,fixtures:s.fixtures,format:s.format,mode:s.mode,playoffMode:s.playoffMode,champion:complete?s.champion:null,competition:s.competition,completed:complete,archivedAt:now,reason,interrupted:!!s.live});
 if(b.mode==='archive'&&b.archiveChampionId!==undefined)setArchiveResult(s.history.at(-1),{championId:b.archiveChampionId,note:reason},now);
 const from=s.season;s.season=target;s.live=null;s.champion=null;s.playoff=undefined;s.schedulePlan=undefined;s.lastMatchEndedAt=undefined;s.lastBreakSeconds=undefined;
 if(b.nextRegistration!==undefined){if(!['closed','keep','fresh'].includes(b.nextRegistration))throw Error('Choose a registration mode.');const limit=b.nextRegistration==='closed'?seasonLimit(s.format,s.teams.length,b.teamLimit??s.registration?.limit):Number(b.teamLimit??s.registration?.limit??32);if(!validLimit(s.format,limit)||b.nextRegistration!=='fresh'&&limit<s.teams.length)throw Error('Choose a valid team limit.');if(b.nextRegistration==='fresh'){if(b.mode!=='archive')throw Error('Archive this season before clearing its entries.');s.teams=[];s.market=undefined}s.registration={open:b.nextRegistration!=='closed',limit,minimum:b.nextRegistration==='closed'?(s.registration?.minimum??2):entryMinimum(limit)};if(!s.registration.open&&!validLimit(s.format,s.teams.length))throw Error('Prepare a valid team count before closing registration.');}
 if(s.market)s.market.lockedTeams=[];
 // Renumbering an unplayed season retains its fixture seeds and admin weather choices.
 if(b.mode==='archive'||!s.fixtures.length&&!s.registration?.open)s.fixtures=s.registration?.open?[]:buildCompetition(s.teams,s.format,s.mode,s.legs);
 if(s.registration?.open)s.fixtures=[];
 for(const f of s.fixtures){delete f.scheduledAt;f.autoStart=false}initializeDouble(s);
 if(b.schedule){if(s.registration?.open||!s.fixtures.length)throw Error('Close registration and prepare fixtures before scheduling.');s.schedulePlan=createSchedulePlan(s,b.schedule,now);applySchedulePlan(s)}
 s.seasonOpening=waitingSeason(b.openingAt??null,now);if(b.schedule&&s.seasonOpening.at&&Date.parse(b.schedule.startAt)<Date.parse(s.seasonOpening.at))throw Error('Match schedule begins before the season opening.');
 enableFlow(s,current.flow?.enabled!==false,now);
 s.seasonLog=[...(s.seasonLog||[]),{from,to:target,operation:b.mode,at:now,reason}].slice(-100);return s;
}
