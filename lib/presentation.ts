import {events,footballTeams,score,lineupAt,matchClock} from './sim';
import {matchWeather} from './weather';
import {nextFixtureIndex} from './scheduler';
import {samplePlan,type Frame} from './motion';
export const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
const ease=(n:number)=>{n=clamp(n);return n*n*(3-2*n)};
// Only changes which can affect the seeded motion invalidate a plan. Polls,
// pause/resume, sponsors and cosmetic edits do not restart the animation loop.
export function motionKey(s:any,f:any){return JSON.stringify([f.home,f.away,f.seed,f.engine,f.mode,f.knockout,f.tiebreak,f.weatherModel,matchWeather(s,f),footballTeams(s,f)])}
export function medicalScene(plan:Frame[],incident:any,age:number,duration=4){
 const players=samplePlan(plan,Math.max(0,incident.time-.001)).players,index=(incident.side||0)*11+(incident.pIndex||0),patient=players[index],edge={x:clamp(patient.x,.12,.88),y:patient.y<.5?-.015:1.015},arrive=duration*.32,leave=duration*.65,travel=ease(age/arrive),exit=ease((age-leave)/(duration-leave)),at={x:patient.x+(edge.x-patient.x)*exit,y:patient.y+(edge.y-patient.y)*exit};
 return {patient:at,index,medics:[-.018,.018].map(dx=>({x:edge.x+dx+(patient.x-edge.x)*travel+(edge.x-patient.x)*exit,y:edge.y+(patient.y-edge.y)*travel+(edge.y-patient.y)*exit})),stage:age<arrive?'medicalArriving':age<leave?'medicalAssessing':'medicalLeaving',stretcher:age>=leave,progress:clamp(age/duration)};
}
export function decisionFor(ev:any[],time:number,forced?:any){
 const e=forced||ev.filter(e=>e.time<=time&&['card','offside','foul','penaltyAwarded','freeKick','disallowed','protest'].includes(e.type)).at(-1);if(!e||!forced&&time-e.time>3.5)return null;
 const base={event:e,title:e.type,reason:'refereeRestart',restart:'playResumes',side:e.side||0};
 if(e.type==='card')return {...base,title:e.secondYellow?'secondYellow':e.card,reason:e.card==='red'?(e.secondYellow?'twoCautionsReason':'directRedReason'):'cautionReason',restart:e.card==='red'?'playerDismissed':'playResumes'};
 if(e.type==='foul')return {...base,title:'foul',reason:e.decision==='penaltyAwarded'?'penaltyAreaReason':'foulReason',restart:e.decision==='penaltyAwarded'?'penaltyAwarded':'freeKick',side:1-(e.side||0)};
 if(e.type==='penaltyAwarded')return {...base,reason:'penaltyAreaReason',restart:'penaltyAwarded'};
 if(e.type==='freeKick')return {...base,reason:'foulReason',restart:'freeKick'};
 if(e.type==='offside'||e.type==='disallowed')return {...base,reason:e.type==='disallowed'?'offsideGoalReason':'offsideReason',restart:'offsideRestart',side:1-(e.side||0)};
 if(e.type==='protest')return {...base,title:'decisionStands',reason:'protestReason'};
 return base;
}
export function halftimeAnalysis(s:any,f:any,plan:Frame[]){
 const cutoff=90,ev=events(s,f).filter(e=>e.time<=cutoff),count=(types:string[])=>[0,1].map(side=>ev.filter(e=>e.side===side&&types.includes(e.type)).length),control=[0,0];
 // Possession is an estimate from the actual seeded movement up to half-time.
 for(let t=.5;t<cutoff;t+=1)control[samplePlan(plan,t).side||0]++;
 const home=Math.round(control[0]/cutoff*100),shots=count(['goal','save','wide','block','corner','penaltymiss','disallowed']),onTarget=count(['goal','save']);
 return {score:score(s,f,cutoff),possession:[home,100-home],shots,onTarget,fouls:count(['foul']),cards:count(['card']),chances:ev.filter(e=>['goal','save','wide','block','corner','disallowed','penaltymiss'].includes(e.type)&&Number.isFinite(e.x)).map(e=>({x:e.x,y:e.y,side:e.side,goal:e.type==='goal'})),lead:shots[0]===shots[1]?-1:shots[0]>shots[1]?0:1,players:lineupAt(s,f,cutoff)};
}
export function stadiumBoard(s:any,now=Date.now()){
 const f=s.fixtures?.[nextFixtureIndex(s)]||s.fixtures?.at(-1);if(!f)return null;const m=s.live?matchClock(s,now):{time:f.done?Infinity:0,status:f.done?'fulltime':'prematch'};
 return {f,m,teams:footballTeams(s,f),score:score(s,f,m.time)};
}
// A measured CPU budget reduces pixels/particles first, preserving animation rate.
export class RenderBudget{
 average=0;lite=false;private frames=0;private total=0;
 record(cost:number){this.total+=cost;this.frames++;if(this.frames>=60){this.average=this.total/this.frames;if(this.average>8)this.lite=true;else if(this.average<3)this.lite=false;this.frames=0;this.total=0}return this.lite}
}
