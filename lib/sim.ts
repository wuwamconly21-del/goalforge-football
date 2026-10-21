import {broadcastPhase} from './broadcast';
import {createShootout,equalShootoutPlayers} from './shootout';
import {weatherInfo} from './weather';
import {tacticalPower} from './tactics';
import {presetTeams} from './competitions';
export function random(seed:number){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
export function defaults(){return presetTeams('my')}
const seed=()=>crypto.getRandomValues(new Uint32Array(1))[0];
export function fixtures(teams:any[],season=1,mode='open'){
 const rand=random(seed());let ring=teams.map(t=>t.id);for(let i=ring.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[ring[i],ring[j]]=[ring[j],ring[i]]}if(ring.length%2)ring.push(null);
 const result:any[]=[];for(let round=0;round<ring.length-1;round++){for(let i=0;i<ring.length/2;i++){const a=ring[i],b=ring.at(-1-i);if(a!==null&&b!==null)result.push({home:(round+i)%2?a:b,away:(round+i)%2?b:a,round:round+1,seed:Math.floor(rand()*4294967295),engine:2,weatherModel:1,mode,done:false})}ring.splice(1,0,ring.pop())}return result;
}
export function cupFixtures(teams:any[],mode='open',round=1){const out:any[]=[];for(let i=0;i<teams.length;i+=2)out.push({home:teams[i].id,away:teams[i+1].id,seed:seed(),engine:2,weatherModel:1,mode,knockout:true,stage:'knockout',round,done:false});return out}
export function buildCompetition(teams:any[],format:string,mode='open',legs=1){
 if(format==='knockout')return cupFixtures(teams,mode);
 if(format==='groups'){const list:any[]=[];for(let i=0;i<teams.length;i+=4)list.push(...fixtures(teams.slice(i,i+4),1,mode).map(f=>({...f,group:String.fromCharCode(65+i/4),stage:'group'})));return list.sort((a,b)=>a.round-b.round||a.group.localeCompare(b.group))}
 const one=fixtures(teams,1,mode).map(f=>({...f,stage:'league'}));return legs===2?[...one,...one.map(f=>({...f,home:f.away,away:f.home,seed:seed(),round:f.round+teams.length-(teams.length%2?0:1)}))]:one;
}
const cache=new WeakMap<object,Map<string,any[]>>();
export function footballTeams(s:any,f:any){return f.rosters||[s.teams.find((t:any)=>t.id===f.home),s.teams.find((t:any)=>t.id===f.away)]}
export function events(s:any,f:any):any[]{let c=cache.get(s);if(!c){c=new Map();cache.set(s,c)}const key=f.home+':'+f.away+':'+f.seed+':'+f.mode+':'+!!f.knockout+':'+(f.weather||s.weatherPolicy||'auto')+':'+!!f.weatherModel+':'+f.engine+':'+f.tiebreak;if(c.has(key))return c.get(key)!;
 const modern=f.engine>=4,r=random(f.seed),teams=footballTeams(s,f),lineups=teams.map(t=>t.players.map((p:any)=>({...p}))),used=[new Set<number>(),new Set<number>()],subs=[0,0],red=[new Set<number>(),new Set<number>()],yellow=[new Map<number,number>(),new Map<number,number>()],out:any[]=[];
 const push=(e:any)=>{e.id='e'+out.length;out.push(e)};
 const available=(side:number)=>Array.from({length:10},(_,i)=>i+1).filter(i=>lineups[side][i]&&!red[side].has(i));
 const choose=(side:number,attack=false)=>{let list=available(side);if(attack&&list.some(i=>i>=5))list=list.filter(i=>i>=5);return list[Math.floor(r()*list.length)]};
 const avg=(t:any)=>t.players.reduce((a:number,p:any)=>a+p.rating,0)/11;
 const form=[.82+r()*.36,.82+r()*.36],strength=f.mode==='rating'?(avg(teams[0])-avg(teams[1]))/100:0;
 const weather=weatherInfo(s,f),powers=teams.map(tacticalPower),tactical=f.mode==='rating';
 const windows=[0,0],injuries=[0,0],subSlots=[new Set<number>(),new Set<number>()],subStages=[0,0];
 function tacticalSubs(time:number){if(!modern)return;for(let side=0;side<2;side++){
  const stage=subStages[side];if(stage>=3||time<[103,133,163][stage])continue;subStages[side]++;
  if(windows[side]>=3||subs[side]>=5)continue;
  const bench=teams[side].bench||[];let changed=0;
  for(const who of available(side).filter(i=>!subSlots[side].has(i)).reverse()){
   const old=lineups[side][who],bi=bench.findIndex((b:any,i:number)=>b.position===old.position&&!used[side].has(i));
   if(bi<0)continue;used[side].add(bi);subSlots[side].add(who);subs[side]++;changed++;yellow[side].delete(who);lineups[side][who]={...bench[bi]};
   push({type:'substitution',time:time-3+changed*.08,side,pIndex:who,player:bench[bi].name,outPlayer:old.name,replacement:{...bench[bi]},window:windows[side]+1});
   if(changed>=2||subs[side]>=5)break;
  }
  if(changed)windows[side]++;
 }}
 let injury=false,review=false;
 function run(start:number,end:number){for(let time=start+7+r()*3;time<end-2;time+=9+r()*3){
  if(Math.abs(time-90)<2||Math.abs(time-210)<2)continue;
  let share=Math.max(.2,Math.min(.8,.5+strength*.18+(form[0]-form[1])*.18+(tactical?(powers[0].control-powers[1].control)*.2:0)+(available(0).length-available(1).length)*.04)),side=r()<share?0:1,p=choose(side,true);if(p===undefined)continue;
  tacticalSubs(time);const at=time-2.2;
  if((!injury||modern&&injuries[side]<1)&&(!modern||injuries[side]<1)&&time>20&&r()<.11*weather.injury){const who=choose(side);if(who!==undefined){const old=lineups[side][who],bench=teams[side].bench||[],bi=bench.findIndex((b:any,i:number)=>b.position===old.position&&!used[side].has(i));push({type:'injury',time:at,side,pIndex:who,player:old.name,stoppage:true,decision:'medical'});lineups[side][who]=null;if(bi>=0&&subs[side]<5&&(!modern||windows[side]<3)){used[side].add(bi);subs[side]++;if(modern){windows[side]++;subSlots[side].add(who);yellow[side].delete(who)}lineups[side][who]={...bench[bi]};push({type:'substitution',time:at+.2,side,pIndex:who,player:bench[bi].name,outPlayer:old.name,replacement:{...bench[bi]},...(modern?{window:windows[side]}:{})})}injury=true;if(modern)injuries[side]++}}
  else if(r()<.19*(tactical?powers[1-side].cards:1)){const offender=1-side,who=choose(offender);if(who!==undefined){const count=(yellow[offender].get(who)||0)+1,straight=r()<.045,card=straight||count>=2?'red':'yellow';yellow[offender].set(who,count);if(card==='red')red[offender].add(who);push({type:'card',time:at,side:offender,pIndex:who,player:lineups[offender][who].name,card,secondYellow:!straight&&count>=2,decision:card==='red'?'sentOff':'caution'});if(r()<.2)push({type:'protest',time:at+.2,side:offender,player:teams[offender].name,stoppage:true,decision:'decisionStands'})}}
  p=choose(side,true);if(p===undefined)continue;const player=lineups[side][p],roll=r(),foul=modern&&r()<.22,penalty=modern?foul&&r()<.27:r()<.065,freeKick=foul&&!penalty,offside=!penalty&&!freeKick&&r()<.09,goal=!offside&&roll<(penalty?.75:.20*(freeKick?.65:1)*form[side]*weather.accuracy*(weather.type==='sunny'&&f.weatherModel&&time>90?.96:1)*(tactical?powers[side].attack/powers[1-side].defence:1)+(f.mode==='rating'?(player.rating-teams[1-side].players[0].rating)/100*.06:0));
  const base={time,side,pIndex:p,player:player.name,method:penalty?'penalty':freeKick?'freeKick':r()<.25?'header':'openPlay',counter:r()<.3,x:side===0?.92:.08,y:.46+r()*.08};
  if(foul){const offender=choose(1-side);push({type:'foul',time:time-1.3,side:1-side,pIndex:offender,player:offender===undefined?teams[1-side].name:lineups[1-side][offender].name,decision:penalty?'penaltyAwarded':'freeKickAwarded'});push({type:penalty?'penaltyAwarded':'freeKick',time:time-.7,side,pIndex:p,player:player.name})}
  if(modern&&!foul&&r()<.12)push({type:'throwIn',time:time-1.5,side,pIndex:p,player:player.name});
  if(goal&&!review&&time>24&&r()<.33&&(!(f.engine>=3)||!penalty)){push({...base,type:'review',stoppage:true,decision:'checkingGoal'});const allowed=r()>.28;push({...base,time:time+.35,type:allowed?'goal':'disallowed',decision:allowed?'goalConfirmed':'offsideGoal'});review=true}
  else if(modern&&!offside&&!goal&&!penalty&&roll>.94){push({...base,type:'wide'});push({type:'goalKick',time:time+.45,side:1-side,pIndex:0,player:lineups[1-side][0].name})}
  else push({...base,type:offside?'offside':goal?'goal':penalty?'penaltymiss':roll>.83?'corner':roll>.58?'block':'save'});
 }}
 run(0,180);const goals=(limit=Infinity)=>out.reduce((a,e)=>{if(e.type==='goal'&&e.time<=limit)a[e.side]++;return a},[0,0]);
 if(modern&&f.knockout){let v=goals(180);if(v[0]===v[1]){
  if(f.tiebreak!=='penalties'){run(180,240);v=goals()}
  if(v[0]===v[1]){const eligible=equalShootoutPlayers(lineups,red),start=f.tiebreak==='penalties'?184:244,first=r()<.5?0:1;
   const kicks=createShootout(eligible,start,first,(side,p)=>r()<Math.max(.55,Math.min(.90,.75+(f.mode==='rating'?(lineups[side][p].rating-lineups[1-side][0].rating)*.002:0))),lineups);
   for(const kick of kicks)push({...kick,outcome:kick.scored?'goal':(f.seed+kick.round+kick.side)%2?'saved':'wide'});
  }
 }}else{
 if(f.knockout){let v=goals(180);if(v[0]===v[1]){run(180,240);v=goals();if(v[0]===v[1]){
  const totals=[0,0],taken=[0,0],eligible=[[...available(0),0],[...available(1),0]],equal=Math.min(eligible[0].length,eligible[1].length);eligible[0]=eligible[0].slice(0,equal);eligible[1]=eligible[1].slice(0,equal);let kick=0,done=false;
  while(!done&&kick<400){const side=kick%2,round=Math.floor(kick/2),p=eligible[side][round%equal],scored=r()<.75;totals[side]+=Number(scored);taken[side]++;push({type:'penaltykick',time:244+kick*3,side,pIndex:p,player:lineups[side][p].name,scored,round:round+1,x:side===0?.95:.05,y:.5});kick++;
   if(taken[0]<=5&&taken[1]<=5){done=totals[0]>totals[1]+(5-taken[1])||totals[1]>totals[0]+(5-taken[0])}if(taken[0]>=5&&taken[0]===taken[1]&&totals[0]!==totals[1])done=true;
  }
 }}}
 }
 out.sort((a,b)=>a.time-b.time);c.set(key,out);return out;
}
export function score(s:any,f:any,time=Infinity){const v=[0,0];for(const e of events(s,f))if(e.type==='goal'&&e.time<=time)v[e.side]++;return v}
export function penalties(s:any,f:any,time=Infinity){const v=[0,0];for(const e of events(s,f))if(e.type==='penaltykick'&&e.scored&&e.time<=time)v[e.side]++;return v}
export function matchLength(s:any,f:any){const ev=events(s,f),kicks=ev.filter(e=>e.type==='penaltykick');if(kicks.length)return kicks.at(-1).time+2;const v=score(s,f,180);return f.knockout&&v[0]===v[1]?240:180}
export function winner(s:any,f:any){const v=score(s,f),p=penalties(s,f);return v[0]!==v[1]?(v[0]>v[1]?f.home:f.away):f.knockout?(p[0]>p[1]?f.home:f.away):null}
export function lineupAt(s:any,f:any,time:number){const ts=footballTeams(s,f),lineups=ts.map(t=>t.players.map((p:any)=>({...p}))),absent=new Set<number>();for(const e of events(s,f)){if(e.time>time)break;const i=e.side*11+(e.pIndex||0);if(e.type==='injury'){lineups[e.side][e.pIndex]=null;absent.add(i)}if(e.type==='substitution'){lineups[e.side][e.pIndex]=e.replacement;absent.delete(i)}if(e.type==='card'&&e.card==='red')absent.add(i)}return {lineups,absent:[...absent]}}
type Stop={time:number,status:string,duration:number,event:any};
const timelines=new WeakMap<object,{index:number,list:Stop[]}>();
function stops(s:any){const cached=timelines.get(s);if(cached?.index===s.live.index)return cached.list;const f=s.fixtures[s.live.index],length=matchLength(s,f);let list:Stop[]=events(s,f).filter(e=>e.stoppage).map(e=>({time:e.time,status:e.type,duration:e.type==='review'?7:e.type==='injury'?4:3,event:e}));list.push({time:90,status:'halftime',duration:9,event:null});if(length>180&&!(f.engine>=4&&f.tiebreak==='penalties'))list.push({time:180,status:'extratime',duration:6,event:null},{time:210,status:'extrabreak',duration:4,event:null});if(events(s,f).some(e=>e.type==='penaltykick'))list.push({time:f.engine>=4&&f.tiebreak==='penalties'?180:240,status:'shootout',duration:6,event:null});list.sort((a,b)=>a.time-b.time);timelines.set(s,{index:s.live.index,list});return list}
export function matchPlaybackDuration(s:any){return matchLength(s,s.fixtures[s.live.index])/(s.live.playbackRate||1)+stops(s).reduce((sum,stop)=>sum+stop.duration,0)}
export function matchClock(s:any,now=Date.now()):any{
 const live=s.live,phase=broadcastPhase(s,now);if(phase)return {time:0,status:phase.kind,running:false,limit:0,period:1,playback:0,autoResumeIn:phase.remaining};if(!live)return {time:0,status:'prematch',running:false,limit:0,period:1,playback:0};
 const presented=live.presentationStarted??live.opened,opening=presented+13000;if(live.running&&!(live.autoElapsed>0)&&now<live.started){if(now<opening)return {time:0,status:now<presented+4000?'entrance':'lineup',openingAge:Math.max(0,(now-presented)/1000),running:false,limit:0,period:1};return {time:0,status:'countdown',countdown:Math.ceil((live.started-now)/1000),running:false,limit:0,period:1}}
 const f=s.fixtures[live.index],shootoutAt=f.engine>=4&&f.tiebreak==='penalties'?180:240,length=matchLength(s,f),playback=Math.max(0,(live.autoElapsed||0)+(live.running?Math.max(0,now-live.started)/1000:0));let cursor=0,last=0;
 const rate=live.playbackRate||1;const period=(time:number)=>time<90?1:time<180?2:time<210?3:4;
 for(const stop of stops(s)){const end=cursor+(stop.time-last)/rate;if(playback<end-.000001)return {time:last+(playback-cursor)*rate,status:live.running?(last>=shootoutAt?'penalties':'playing'):'paused',running:!!live.running,limit:stop.time,period:period(last+(playback-cursor)*rate),playback};if(playback<end+stop.duration-.000001)return {time:stop.time,status:live.running?stop.status:'paused',running:false,limit:stop.time,stop:stop.event,period:stop.time===90?1:period(stop.time),playback,stoppedAt:now-(playback-end)*1000,autoResumeIn:end+stop.duration-playback};cursor=end+stop.duration;last=stop.time}
 const time=Math.min(length,last+(playback-cursor)*rate),done=time>=length;return {time,status:done?'fulltime':live.running?(time>=shootoutAt?'penalties':'playing'):'paused',running:!!live.running&&!done,limit:length,period:period(time),playback};
}
export function table(s:any,group?:string){const ids=group?[...new Set(s.fixtures.filter((f:any)=>f.group===group).flatMap((f:any)=>[f.home,f.away]))]:s.teams.map((t:any)=>t.id),list=s.teams.filter((t:any)=>ids.includes(t.id)).map((t:any)=>({...t,p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}));for(const f of s.fixtures){if(!f.done||f.knockout||group&&f.group!==group)continue;const v=score(s,f);for(let side=0;side<2;side++){const t=list.find((t:any)=>t.id===(side?f.away:f.home));if(!t)continue;t.p++;t.gf+=v[side];t.ga+=v[1-side];if(v[side]>v[1-side]){t.w++;t.pts+=3}else if(v[side]===v[1-side]){t.d++;t.pts++}else t.l++}}return list.sort((a:any,b:any)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.name.localeCompare(b.name))}
export function advance(s:any){if(!s.fixtures.every((f:any)=>f.done)||s.format==='league')return;
 const knock=s.fixtures.filter((f:any)=>f.knockout);
 if(!knock.length&&s.format==='groups'){
  const groups=[...new Set(s.fixtures.map((f:any)=>f.group))].sort(),qualified=groups.map((g:any)=>table(s,g).slice(0,2));let pairs:any[]=[];for(let i=0;i<qualified.length;i+=2)pairs.push(qualified[i][0],qualified[i+1][1],qualified[i+1][0],qualified[i][1]);s.fixtures.push(...cupFixtures(pairs,s.mode,1));return;
 }
 const round=Math.max(...knock.map((f:any)=>f.round)),last=knock.filter((f:any)=>f.round===round);if(last.length===1){s.champion=winner(s,last[0]);return}const winners=last.map((f:any)=>s.teams.find((t:any)=>t.id===winner(s,f)));s.fixtures.push(...cupFixtures(winners,s.mode,round+1));
}
