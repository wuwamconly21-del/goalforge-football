import {surfacePhysics} from './weather';
import {formationPoints,tactics} from './tactics';
import {random} from './sim';
export type Point={x:number,y:number};
export type Frame={t:number,players:Point[],ball:Point,carrier:number,side:number,shot?:boolean,phase:string,eventId?:string,tackler?:number,sprint?:boolean,surface?:string,curves?:Float64Array,taker?:number,ready?:boolean,wall?:number[]};
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const smooth=(x:number)=>x*x*(3-2*x);
const foot=(p:Point,side:number)=>({x:p.x+(side===0?.013:-.013),y:p.y-.012});
const planCache=new WeakMap<object,Map<string,Frame[]>>();
// Animation is seeded independently of match results. Improving presentation never
// changes an existing result, substitutes a scorer or introduces new match events.
export function makePlan(ev:any[],seed:number,teams:any[]=[],surface='sunny'){
 const cacheKey=seed+':'+surface+':'+JSON.stringify(teams.map(t=>t.tactics)),cached=planCache.get(ev)?.get(cacheKey);if(cached)return cached;
 const physics=surfacePhysics(surface),rand=random(seed+7239),frames:Frame[]=[],shapes=[0,1].map(side=>formationPoints(tactics(teams[side]?.tactics).formation));
 const absent=(side:number,n:number,t:number)=>{let injured=false;for(const e of ev){if(e.time>t)break;if(e.side===side&&e.pIndex===n){if(e.type==='injury')injured=true;if(e.type==='substitution')injured=false}}return injured||ev.some(e=>e.type==='card'&&e.card==='red'&&e.side===side&&e.pIndex===n&&e.time<=t)};
 function frame(t:number,side:number,carrier:number,ball:Point,phase='playing',shot=false,duel=false,eventId?:string){
  if(carrier>0&&absent(side,carrier,t))carrier=Array.from({length:10},(_,i)=>i+1).find(i=>!absent(side,i,t))??-1;
  const direction=side===0?1:-1,progress=side===0?ball.x:1-ball.x,players:Point[]=[];
  for(let team=0;team<2;team++)for(let i=0;i<11;i++){
   const b=shapes[team][i],own=team===side,shift=own?(progress-.45)*.36:(progress-.5)*.31;
   const style=tactics(teams[team]?.tactics).style,adjust=style==='aggressive'?.03:style==='defensive'?-.03:0;
   let px=(team===0?b.x:1-b.x)+direction*shift+(team===0?adjust:-adjust);
   let py=b.y+(ball.y-.5)*(i>4?.22:.12)+(rand()-.5)*.035;
   if(i===0){px=team===0?.028:.972;py=clamp(.5+(ball.y-.5)*.46,.39,.61)}
   else if(!own){px=mix(px,ball.x,i<5?.26:.14);py=mix(py,ball.y,.15)}
   players.push({x:clamp(px,.025,.975),y:clamp(py,.045,.955)});
  }
  if(['centreReset','kickoffSetup','kickoffRestart'].includes(phase)){
   for(let team=0;team<2;team++)for(let i=0;i<11;i++){const p=shapes[team][i];players[team*11+i]={x:team?1-(.02+p.x*.63):.02+p.x*.63,y:p.y}}
   players[side*11+9]={x:.5-direction*.013,y:.512};players[side*11+6]={x:.5-direction*.085,y:.512};
  }
  if(phase==='freeKick'){
   const defenders=[1,2,3].filter(i=>!absent(1-side,i,t));defenders.forEach((n,j)=>players[(1-side)*11+n]={x:clamp(ball.x+direction*.10,.04,.96),y:.44+j*.06});
  }
  if(phase==='cornerSetup'||phase==='cornerKick'){
   for(let team=0;team<2;team++)for(let n=1;n<11;n++)players[team*11+n]={x:clamp((side===0?.82:.18)+(n%3)*.025*direction,.04,.96),y:.27+(n%6)*.083};
  }
  if(carrier>=0)players[side*11+carrier]={x:clamp(ball.x-direction*.013,.025,.975),y:clamp(ball.y+.012,.035,.965)};
  let tackler:number|undefined;
  if(carrier>0&&!['freeKick','cornerSetup','cornerKick'].includes(phase)){let nearest=-1,dist=Infinity;for(let i=1;i<11;i++){if(absent(1-side,i,t))continue;const index=(1-side)*11+i,p=players[index],d=Math.hypot(p.x-ball.x,p.y-ball.y);if(d<dist){nearest=index;dist=d}}if(nearest>=0){players[nearest]={x:clamp(ball.x+direction*(duel?.018:.065),.035,.965),y:clamp(ball.y+(duel?.023:.06),.05,.95)};if(duel)tackler=nearest;}}
  frames.push({t,players,ball,carrier,side,phase,shot,tackler,eventId,...(['freeKick','cornerSetup','cornerKick'].includes(phase)?{taker:carrier>=0?side*11+carrier:undefined}:{})});
 }
 frame(0,0,6,{x:.5,y:.5});
 // A review has one shot, followed by its verdict. Do not animate it twice or
 // reveal a confirmed goal before the review's seven-second stoppage finishes.
 const shots=ev.filter(e=>['review','goal','save','corner','block','disallowed','penaltymiss','offside','wide'].includes(e.type)&&Number.isFinite(e.x)&&!(e.type==='goal'||e.type==='disallowed'?ev.some(r=>r.type==='review'&&r.side===e.side&&r.pIndex===e.pIndex&&e.time>r.time&&e.time-r.time<1):false));
 for(const e of shots){
  const last=frames.at(-1)!,start=last.t+.75,end=e.time-.58,span=end-start,side=e.side;
  if(span<.1)continue;
  const lane=.2+rand()*.6,indices=[2+Math.floor(rand()*3),5+Math.floor(rand()*3),8+Math.floor(rand()*3),5+Math.floor(rand()*3),e.pIndex??9];
  const xs=e.counter?[.28,.43,.61,.75,e.x]:[.25,.40,.54,.72,e.x];
  if(e.method==='penalty'||e.method==='freeKick'){
   frame(start,side,e.pIndex??9,{x:e.method==='freeKick'?(side===0?.76:.24):(side===0?.895:.105),y:.5},e.method==='freeKick'?'freeKick':'penalties');
   frame(end,side,e.pIndex??9,{x:e.method==='freeKick'?(side===0?.76:.24):(side===0?.895:.105),y:.5},e.method==='freeKick'?'freeKick':'penalties');frames.at(-1)!.ready=true;
  }else{
   for(let k=0;k<5;k++){
    const t=start+span*k/4,x=k===4?e.x:side===0?xs[k]:1-xs[k],y=k===4?e.y:clamp(lane+Math.sin(k*1.9+rand())*.16,.12,.88);
    frame(t,side,indices[k],{x,y},'playing');frames.at(-1)!.sprint=!!e.counter;
    // A visible defensive challenge fits within the build-up; the same carrier
    // retains possession. It is presentation, not an extra foul or score event.
    if(k===2&&span>4){const dt=Math.min(.42,span/16);frame(t+dt,side,indices[k],{x:x+(side===0?.012:-.012),y},'playing',false,true);}
   }
  }
  const target=e.type==='wide'?{x:side===0?1.02:-.02,y:rand()>.5?.25:.75}:e.type==='goal'||e.type==='review'?{x:side===0?1.009:-.009,y:.5+(rand()-.5)*.06}:e.type==='corner'?{x:side===0?.99:.01,y:rand()>.5?.04:.96}:{x:side===0?.967:.033,y:.49+(rand()-.5)*.09};
  frame(e.time,side,-1,target,e.type==='review'?'review':e.type==='goal'?'goal':e.type==='corner'?'corner':e.type==='block'?'block':e.type==='offside'?'offside':'saveEvent',true,false,e.id);
  frame(e.time+.38,side,-1,target,e.type==='goal'?'goal':e.type==='review'?'review':'playing');
  const goal=e.type==='goal'?e:e.type==='review'?ev.find(v=>v.type==='goal'&&v.side===e.side&&v.pIndex===e.pIndex&&v.time>e.time&&v.time-e.time<1):null;
  if(goal){
   frame(goal.time+.55,1-side,-1,target,'goalCelebration');
   frame(goal.time+2.1,1-side,-1,{x:.5,y:.5},'centreReset');
   frame(goal.time+2.55,1-side,-1,{x:.5,y:.5},'kickoffSetup');
   frame(goal.time+3,1-side,6,{x:.5-(side===0?-1:1)*.085,y:.5},'kickoffRestart');
  }else if(e.type==='corner'){
   const corner={x:side===0?.988:.012,y:target.y<.5?.023:.977};
   frame(e.time+1.05,side,e.pIndex??9,corner,'cornerSetup');
   frame(e.time+1.7,side,e.pIndex??9,corner,'cornerSetup');
   frame(e.time+2.3,side,8,{x:side===0?.86:.14,y:.50},'cornerKick');
   frames.at(-1)!.taker=side*11+(e.pIndex??9);
  }
 }
 const last=frames.at(-1)!;
 frames.push({...last,t:Math.max(last.t+.1,240,(ev.at(-1)?.time||0)+5),phase:'fulltime',shot:false});
 // Bounded movement and monotone interpolation preserve momentum without
 // overshoot. Re-anchor every controlled ball after the speed limit is applied.
 for(let i=1;i<frames.length;i++){
  const a=frames[i-1],b=frames[i],restart=['centreReset','kickoffSetup','kickoffRestart'].includes(b.phase),limit=(b.t-a.t)*(restart?.30:.15)*physics.playerSpeed;
  b.players=b.players.map((p,j)=>{const q=a.players[j],dist=Math.hypot(p.x-q.x,p.y-q.y),k=dist>limit?limit/dist:1;return {x:q.x+(p.x-q.x)*k,y:q.y+(p.y-q.y)*k}});
  if(b.carrier>=0)b.ball=foot(b.players[b.side*11+b.carrier],b.side);
  if(b.phase==='freeKick'&&b.ready){b.wall=[1,2,3].filter(n=>!absent(1-b.side,n,b.t)).map(n=>(1-b.side)*11+n);b.wall.forEach((index,j)=>b.players[index]={x:clamp(b.ball.x+(b.side===0?1:-1)*.105,.025,.975),y:.44+j*.06})}
 }
 frames[0].surface=surface;frames[0].ball=foot(frames[0].players[6],0);
 // Store cubic coefficients once rather than recomputing 44 tangent pairs per frame.
 for(let i=0;i<frames.length-1;i++){const a=frames[i],b=frames[i+1],before=frames[Math.max(0,i-1)],after=frames[Math.min(frames.length-1,i+2)],span=b.t-a.t,c=new Float64Array(22*8);for(let j=0;j<22;j++)for(let axis=0;axis<2;axis++){const k=axis?'y':'x',start=a.players[j][k],end=b.players[j][k],slope=(end-start)/span,left=a.t>before.t?(start-before.players[j][k])/(a.t-before.t):slope,right=after.t>b.t?(after.players[j][k]-end)/(after.t-b.t):slope,harmonic=(x:number,y:number)=>x*y<=0?0:2*x*y/(x+y),m0=harmonic(left,slope)*span,m1=harmonic(slope,right)*span,at=j*8+axis*4;c[at]=start;c[at+1]=m0;c[at+2]=-3*start-2*m0+3*end-m1;c[at+3]=2*start+m0-2*end+m1}a.curves=c}
 const cache=planCache.get(ev)||new Map();cache.set(cacheKey,frames);if(cache.size>6)cache.delete(cache.keys().next().value!);planCache.set(ev,cache);return frames;
}
export function samplePlan(frames:Frame[],time:number){
 let lo=0,hi=frames.length-1;while(lo<hi){const m=Math.floor((lo+hi+1)/2);if(frames[m].t<=time)lo=m;else hi=m-1}
 const physics=surfacePhysics(frames[0].surface||'sunny'),a=frames[lo],b=frames[Math.min(lo+1,frames.length-1)],span=b.t-a.t,p=span===0?0:clamp((time-a.t)/span,0,1),ease=smooth(p);
 const previous=frames[Math.max(0,lo-1)],next=frames[Math.min(frames.length-1,lo+2)];
 function curve(i:number,axis:'x'|'y'){
  const c=a.curves,at=i*8+(axis==='y'?4:0);if(c)return ((c[at+3]*p+c[at+2])*p+c[at+1])*p+c[at];
  return mix(a.players[i][axis],b.players[i][axis],ease);
 }
 const players=a.players.map((_,i)=>{const px=curve(i,'x'),py=curve(i,'y'),dx=b.players[i].x-a.players[i].x,dy=b.players[i].y-a.players[i].y,drift=(1-physics.traction)*Math.sin(Math.PI*p)**2*(1-2*p)*.06;return {x:clamp(px-dy*drift,.025,.975),y:clamp(py+dx*drift,.035,.965)}});
 let ball:Point,carrier=a.carrier,side=a.side,height=0,action='dribble',flight=0;
 if(b.phase==='centreReset'){
  ball={x:mix(a.ball.x,.5,ease),y:mix(a.ball.y,.5,ease)};carrier=-1;action='centreReset';
 }else if(b.phase==='kickoffSetup'){
  ball={x:.5,y:.5};carrier=-1;action='kickoffSetup';
 }else if(a.phase==='kickoffSetup'&&b.phase==='kickoffRestart'){
  const to=foot(players[b.side*11+b.carrier],b.side);ball={x:mix(.5,to.x,p),y:mix(.5,to.y,p)};carrier=-1;action='kickoffRestart';side=b.side;
 }else if(a.phase==='cornerSetup'&&b.phase==='cornerKick'){
  const to=foot(players[b.side*11+b.carrier],b.side);ball={x:mix(a.ball.x,to.x,p),y:mix(a.ball.y,to.y,p)};carrier=-1;action='cornerKick';flight=p;height=Math.sin(Math.PI*p)*.045;
 }else if(b.shot){
  ball={x:mix(a.ball.x,b.ball.x,p),y:mix(a.ball.y,b.ball.y,p)};carrier=-1;action='shot';flight=p;height=Math.sin(Math.PI*p)*.018;
  // A keeper reacts to the shot, returning continuously to the planned position.
  const keeper=(1-side)*11,reach=Math.sin(Math.PI*p)*.035;
  players[keeper].y+=Math.sign(b.ball.y-a.players[keeper].y)*reach;
 }else if(a.carrier>=0&&a.side===b.side&&b.carrier>=0){
  const from=foot(players[a.side*11+a.carrier],a.side),to=foot(players[b.side*11+b.carrier],b.side);
  if(a.carrier===b.carrier){ball=from;ball.y+=Math.sin(time*13)*.0015*Math.sin(Math.PI*p);}
  else{
   const distance=Math.hypot(a.ball.x-b.ball.x,a.ball.y-b.ball.y),duration=clamp(distance/(1.05*physics.rollSpeed),.22,.85),release=Math.max(0,1-duration/Math.max(span,.001));
   flight=clamp((p-release)/Math.max(1-release,.001),0,1);if(frames[0].surface==='snow')flight=flight**1.14;
   ball={x:mix(from.x,to.x,flight),y:mix(from.y,to.y,flight)};
   if(flight>0){carrier=flight>=1?b.carrier:-1;action=flight>=1?'receive':'pass';height=Math.sin(Math.PI*flight)*(distance>.42?.018:.003);}
  }
 }else{
  const target=b.carrier>=0?foot(players[b.side*11+b.carrier],b.side):b.ball;
  ball={x:mix(a.ball.x,target.x,ease),y:mix(a.ball.y,target.y,ease)};
  carrier=-1;side=p>.5?b.side:a.side;action=a.phase==='goal'||a.phase==='review'?'restart':a.side!==b.side?'interception':'pass';
 }
 if(action==='dribble'&&a.phase==='freeKick')action='freeKickSetup';if(action==='dribble'&&a.phase==='cornerSetup')action='cornerSetup';
 if(action==='dribble'&&a.carrier>=0&&previous.side===a.side&&previous.carrier!==a.carrier&&time-a.t<.18)action='receive';
 const tackler=b.tackler??(p<.5?a.tackler:undefined);
 if(tackler!==undefined&&carrier>=0)action='tackle';else if(action==='dribble'&&a.sprint)action='dash';
 return {players,ball,carrier,side,taker:a.taker??b.taker,phase:p>.7?b.phase:a.phase,shot:!!b.shot,action,height,flight,tackler,receiver:b.carrier,eventId:b.eventId,segment:lo};
}
// The VAR monitor reuses the exact shot path from the broadcast, never invented
// offside coordinates. The outcome is taken only from the matching verdict.
export function reviewScene(plan:Frame[],ev:any[],incident:any,age:number){
 const verdict=incident&&ev.find(e=>e.time>incident.time&&e.time-incident.time<1&&e.side===incident.side&&e.pIndex===incident.pIndex&&['goal','disallowed'].includes(e.type));
 const end=plan.findIndex(f=>f.shot&&f.eventId===incident?.id),finish=end>=0?plan[end].t:incident?.time||0,start=end>0?plan[end-1].t:Math.max(0,finish-.58);
 const progress=clamp((age-2.2)/2.8,0,1),time=mix(start,finish,progress);
 return {scene:samplePlan(plan,time),from:samplePlan(plan,start).ball,to:samplePlan(plan,finish).ball,verdict,step:age<2.2?0:age<5||!verdict?1:2};
}
