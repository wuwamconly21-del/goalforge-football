import assert from 'node:assert/strict';
import {load,cleanup} from './load.mjs';
const {makePlan,samplePlan,reviewScene}=await load('motion'),{events,score}=await load('sim'),{presetTeams}=await load('competitions'),{weatherPresentation}=await load('weather'),{rows}=await load('i18n');
try {
 const s={teams:presetTeams('nations')},actions=new Set();let maxBallJump=0,maxPlayerStep=0,reviews=0;
 for(let seed=1;seed<=120;seed++){
  const f={home:'t0',away:'t1',seed,mode:'rating',engine:3,weatherModel:1},ev=events(s,f),before=score(s,f),plan=makePlan(ev,seed,s.teams.slice(0,2));
  if(seed<4)assert.deepEqual(makePlan(ev,seed,s.teams.slice(0,2)),plan);
  assert(plan.every((p,i)=>!i||p.t>plan[i-1].t));
  for(const frame of plan){
   const a=samplePlan(plan,frame.t-1e-6),b=samplePlan(plan,frame.t+1e-6);
   maxBallJump=Math.max(maxBallJump,Math.hypot(a.ball.x-b.ball.x,a.ball.y-b.ball.y));
  }
  for(let time=0;time<180;time+=.07){
   const a=samplePlan(plan,time),b=samplePlan(plan,time+.025);actions.add(a.action);
   assert(Number.isFinite(a.ball.x)&&Number.isFinite(a.ball.y)&&a.height>=0);
   for(let i=0;i<22;i++){const p=a.players[i];assert(p.x>=.02&&p.x<=.98&&p.y>=.01&&p.y<=.99);maxPlayerStep=Math.max(maxPlayerStep,Math.hypot(p.x-b.players[i].x,p.y-b.players[i].y));}
   if(a.action==='pass')assert.equal(a.carrier,-1);
  }
  for(const incident of ev.filter(e=>e.type==='review')){
   reviews++;const a=reviewScene(plan,ev,incident,1),b=reviewScene(plan,ev,incident,3.6),c=reviewScene(plan,ev,incident,6);
   assert.equal(a.step,0);assert.equal(b.step,1);assert.equal(c.step,2);
   assert.equal(c.verdict.side,incident.side);assert.equal(c.verdict.pIndex,incident.pIndex);
   assert.deepEqual(c.scene.ball,samplePlan(plan,incident.time).ball);
   assert.equal(plan.filter(p=>p.shot&&p.eventId===c.verdict.id).length,0,'reviewed shot must not be animated twice');
   assert.equal(reviewScene(plan,ev.filter(e=>e.id!==c.verdict.id),incident,6).step,1,'missing verdict stays pending');
  }
  assert.deepEqual(score(s,f),before);
  assert.deepEqual(weatherPresentation(s,f),weatherPresentation(s,f));
 }
 assert(maxBallJump<.0001);assert(maxPlayerStep<.013);assert(reviews>0);
 for(const action of ['pass','shot','tackle','dash','interception'])assert(actions.has(action),action);
 for(const [key,translations] of Object.entries(rows)){assert.equal(translations.length,5,key);assert(translations.every(s=>typeof s==='string'&&s.length),key);}
 console.log(JSON.stringify({presentation:true,seeds:120,reviews,maxBallJump,maxPlayerStep,actions:[...actions],translatedKeys:Object.keys(rows).length}));
} finally {cleanup()}
