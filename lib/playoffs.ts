import {cupFixtures,winner} from './sim';
function batch(s:any,phase:string,pairs:string[][],bracket:string,round:number){const p=s.playoff;p.phase=phase;p.batchStart=s.fixtures.length;p.batchCount=pairs.length;for(const [home,away] of pairs){const teams=[home,away].map(id=>s.teams.find((t:any)=>t.id===id));s.fixtures.push({...cupFixtures(teams,s.mode,round)[0],bracket,matchId:crypto.randomUUID()})}}
const pairs=(ids:string[])=>Array.from({length:ids.length/2},(_,i)=>ids.slice(i*2,i*2+2));
export function initializeDouble(s:any,start=0){if(s.playoffMode!=='double'||!s.fixtures.length||s.format==='league'||s.format==='groups'&&start===0)return;const initial=s.fixtures.slice(start);if(!initial.length)return;for(const f of initial){f.bracket='upper';f.matchId||=crypto.randomUUID()}s.playoff={type:'double',phase:'upper',upper:initial.flatMap((f:any)=>[f.home,f.away]),lower:[],flexible:initial.some((f:any)=>f.byeQualifiers?.length),batchByes:initial.flatMap((f:any)=>f.byeQualifiers||[]),upperRound:1,lowerRound:0,batchStart:start,batchCount:initial.length}}
export function advanceDouble(s:any){const p=s.playoff;if(p.phase==='complete'||s.champion)return;const played=s.fixtures.slice(p.batchStart,p.batchStart+p.batchCount);if(!played.length||played.some((f:any)=>!f.done))return;const wins=played.map((f:any)=>winner(s,f)),losses=played.map((f:any,i:number)=>wins[i]===f.home?f.away:f.home);
 if(p.flexible){advanceFlexible(s,wins,losses);return}
 const upper=()=>batch(s,'upper',pairs(p.upper),'upper',++p.upperRound),grand=()=>batch(s,'grand',[[p.upper[0],p.lower[0]]],'grand',1);
 if(p.phase==='grand'){if(wins[0]===p.upper[0]){s.champion=wins[0];p.phase='complete'}else batch(s,'reset',[[p.upper[0],p.lower[0]]],'reset',2);return}
 if(p.phase==='reset'){s.champion=wins[0];p.phase='complete';return}
 if(p.phase==='upper'){p.upper=wins;if(!p.lower.length){p.lower=losses;if(p.lower.length>1)batch(s,'lowerInitial',pairs(p.lower),'lower',++p.lowerRound);else if(p.upper.length>1)upper();else grand()}else{const drop=[...losses].reverse();batch(s,'lowerMerge',p.lower.map((id:string,i:number)=>[id,drop[i]]),'lower',++p.lowerRound)}return}
 p.lower=wins;if(p.upper.length===1){grand();return}if(p.phase==='lowerMerge'&&p.lower.length>1)batch(s,'lowerReduce',pairs(p.lower),'lower',++p.lowerRound);else upper();
}
function advanceFlexible(s:any,wins:string[],losses:string[]){const p=s.playoff,advancers=[...wins,...(p.batchByes||[])];p.batchByes=[];
 const play=(ids:string[],phase:string,bracket:string,round:number)=>{p.batchByes=ids.length%2?[ids.at(-1)!]:[];batch(s,phase,Array.from({length:Math.floor(ids.length/2)},(_,i)=>ids.slice(i*2,i*2+2)),bracket,round)};
 const upper=()=>play(p.upper,'upper','upper',++p.upperRound),lower=()=>play(p.lower,'lowerFlexible','lower',++p.lowerRound),grand=()=>batch(s,'grand',[[p.upper[0],p.lower[0]]],'grand',1);
 if(p.phase==='grand'){if(wins[0]===p.upper[0]){s.champion=wins[0];p.phase='complete'}else batch(s,'reset',[[p.upper[0],p.lower[0]]],'reset',2);return}
 if(p.phase==='reset'){s.champion=wins[0];p.phase='complete';return}
 if(p.phase==='upper'){p.upper=advancers;p.lower.push(...losses)}else p.lower=advancers;
 if(p.upper.length===1){if(p.lower.length>1)lower();else grand()}else if(p.lower.length>p.upper.length)lower();else upper();
}
export function expectedMatches(s:any){const n=s.teams.length,groupGames=s.fixtures.filter((f:any)=>f.group).length,q=s.format==='groups'?(groupGames?new Set(s.fixtures.filter((f:any)=>f.group).map((f:any)=>f.group)).size:Math.ceil(n/4))*2:n;return s.format==='league'?s.fixtures.length:groupGames+(s.playoffMode==='double'?2*q-1:q-1)}
export function playoffLosses(s:any){const losses:Record<string,number>={};for(const f of s.fixtures.filter((f:any)=>f.done&&f.knockout)){const win=winner(s,f),lost=win===f.home?f.away:f.home;losses[lost]=(losses[lost]||0)+1}return losses}
