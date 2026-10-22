import {createCanvas,loadImage} from '@napi-rs/canvas';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {writeFile,readFile,stat,unlink} from 'node:fs/promises';
import {hash,segments,clean} from './core.mjs';
const W=1280,H=720,FPS=30;
const labels={goal:'GOL!',save:'PENYELAMATAN',disallowed:'VAR · GOL DIBATALKAN',card:'KAD MERAH',penaltykick:'SEPAKAN PENALTI',penaltymiss:'PENALTI TERSASAR'};
export function timeline(job,engine){
 if(job.kind==='update')return [{type:'update',duration:Math.max(12,Math.min(45,job.notes.length/18))}];
 const moments=segments(job.snapshot,engine);return [{type:'intro',duration:4},{type:'lineups',duration:6},...moments.map(m=>({type:'moment',moment:m,duration:m.to-m.from})),{type:'outro',duration:5}];
}
function text(ctx,value,x,y,size=24,color='#e8f5ee',max=1180){ctx.fillStyle=color;ctx.font=`bold ${size}px sans-serif`;ctx.fillText(clean(value,200),x,y,max)}
function wrap(ctx,value,x,y,width,size=24,maxLines=10){let line='',n=0;ctx.font=`${size}px sans-serif`;for(const word of clean(value,5000).split(/\s+/)){if(ctx.measureText(line+word).width>width&&line){ctx.fillText(line,x,y+n*size*1.5);line='';if(++n>=maxLines)return}line+=word+' '}ctx.fillText(line,x,y+n*size*1.5)}
export async function painter(job,engine){
 const canvas=createCanvas(W,H),ctx=canvas.getContext('2d');let background,teams,plan,logos=[];
 if(job.kind==='match'){
  const s=job.snapshot,f=s.fixtures[0];teams=engine.footballTeams(s,f);const weather=engine.matchWeather(s,f);plan=engine.makePlan(engine.events(s,f),f.seed,teams,weather);background=createCanvas(1060,740);engine.paintGround(background.getContext('2d'),{...s,stadium:engine.matchStadium(s,f)},weather,'FOOTBALL UNIVERSE');
  logos=await Promise.all(teams.map(async t=>{try{return t.logo?await loadImage(Buffer.from(t.logo.split(',')[1],'base64')):null}catch{return null}}));
 }
 function badge(side,x,y){const t=teams[side];ctx.fillStyle=t.color||'#d56851';ctx.beginPath();ctx.arc(x,y,36,0,Math.PI*2);ctx.fill();if(logos[side])ctx.drawImage(logos[side],x-27,y-27,54,54);else{ctx.textAlign='center';text(ctx,t.short||t.name.slice(0,3),x,y+8,22,'#fff',65);ctx.textAlign='left'}}
 function heading(){ctx.fillStyle='#0b181f';ctx.fillRect(0,0,W,H);text(ctx,'goalforge',40,44,30,'#ee7967');text(ctx,'NEL YX GAMING'.replace('NEL YX','NELYX'),1010,42,18,'#b6d2c7');ctx.strokeStyle='#36524e';ctx.beginPath();ctx.moveTo(40,62);ctx.lineTo(1240,62);ctx.stroke();}
 return {canvas,draw(segment,age,absolute){
  heading();
  if(job.kind==='update'){text(ctx,'KEMAS KINI / WHAT’S NEW',64,136,25,'#d6bc83');text(ctx,`GoalForge ${job.version}`,64,218,55);ctx.fillStyle='#d7e5df';wrap(ctx,job.notes,64,290,1120,28,8);text(ctx,'An original football simulator · Nelyx Entertainment',64,672,21,'#98b4aa');return canvas;}
  const s=job.snapshot,f=s.fixtures[0],final=engine.score(s,f),pens=engine.penalties(s,f);
  if(segment.type==='intro'||segment.type==='outro'){
   badge(0,220,300);badge(1,1060,300);text(ctx,s.name,64,136,30,'#d6bc83');text(ctx,`SEASON ${job.season} · ${segment.type==='intro'?'SEMUA HIGHLIGHTS / ALL MOMENTS':'KEPUTUSAN PENUH / FULL TIME'}`,64,185,23,'#9dbbb0');ctx.textAlign='center';text(ctx,teams[0].name,290,400,27,'#fff',460);text(ctx,teams[1].name,990,400,27,'#fff',460);text(ctx,final.join(' : '),640,320,84,'#fff',360);if(pens.some(Boolean))text(ctx,`PENALTIES ${pens.join(' : ')}`,640,475,25,'#e2c58a');ctx.textAlign='left';text(ctx,'SIMULATED FOOTBALL · GoalForge × NelyxGaming',64,650,24);return canvas;
  }
  if(segment.type==='lineups'){
   text(ctx,'KESEBELASAN UTAMA / STARTING XI',64,120,30,'#d6bc83');for(let side=0;side<2;side++){const x=side?690:64;badge(side,x+35,180);text(ctx,teams[side].name,x+85,189,27,'#fff',440);teams[side].players.slice(0,11).forEach((p,i)=>text(ctx,`${i+1}. ${p.name}`,x,252+i*34,22,'#d2e5da',510));}return canvas;
  }
  const m=segment.moment,time=m.from+Math.min(age,m.to-m.from),scene=engine.samplePlan(plan,time),ev=m.event,swapped=time>=90&&time<180||time>=210&&time<240,px=v=>60+(swapped?1-v:v)*940,py=v=>90+v*564;
  ctx.save();ctx.translate(24,116);ctx.scale(.77,.77);ctx.drawImage(background,0,0);const inGroundScore=engine.score(s,f,time);ctx.textAlign='center';text(ctx,inGroundScore.join(' : '),530,34,20,'#e8f5df',170);text(ctx,teams[0].short,409,32,11,'#d7eade',65);text(ctx,teams[1].short,651,32,11,'#d7eade',65);ctx.textAlign='left';
  const absent=new Set(engine.lineupAt(s,f,time).absent),shoot=ev.type==='penaltykick';
  scene.players.forEach((p,i)=>{if(absent.has(i))return;const side=Math.floor(i/11),n=i%11;let x=p.x,y=p.y;if(shoot){x=side?.83:.17;y=.14+n*.065;if(side===ev.side&&n===ev.pIndex){x=.895;y=.5}if(side===1-ev.side&&n===0){x=.974;y=.5}}
   const x1=shoot?60+x*940:px(x),y1=py(y),stride=Math.sin(absolute*12+i)*2;ctx.strokeStyle='#d8e4dd';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x1-5,y1+8);ctx.lineTo(x1-7-stride,y1+13);ctx.moveTo(x1+5,y1+8);ctx.lineTo(x1+7+stride,y1+13);ctx.stroke();ctx.fillStyle=n===0?(side?'#a98de5':'#edbf62'):teams[side].color||'#dd7961';ctx.beginPath();ctx.arc(x1,y1,9,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#f0fff5';ctx.lineWidth=1;ctx.stroke();ctx.textAlign='center';text(ctx,n+1,x1,y1+3,9,'#fff',18);ctx.textAlign='left';
  });
  let bx=px(scene.ball.x),by=py(scene.ball.y)-scene.height*564;if(shoot){const p=Math.max(0,Math.min(1,(time-ev.time)/.45));bx=60+(.895+((ev.scored?1.015:.974)-.895)*p)*940;by=py(.5+(ev.scored?.01:.10)*p)}ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(bx,by,5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#1b2e2b';ctx.stroke();ctx.restore();
  const shownScore=engine.score(s,f,time);text(ctx,`${teams[0].short}  ${shownScore.join(' : ')}  ${teams[1].short}`,40,100,24,'#fff',780);
  const eShown=time>=ev.time;const x=875;text(ctx,`${Math.floor(time/2)}′ · REPLAY`,x,165,23,'#dbbd84',350);text(ctx,eShown?labels[ev.type]||ev.type:'MEMBINA SERANGAN',x,220,24,eShown?'#f1d18a':'#d6e8dd',350);ctx.fillStyle='#e0ece5';wrap(ctx,ev.player||teams[ev.side]?.name,x,270,350,26,3);text(ctx,teams[ev.side]?.name,x,402,20,'#a9c5b8',350);if(ev.method)text(ctx,ev.method.replace(/([A-Z])/g,' $1'),x,447,20,'#a9c5b8',350);
  text(ctx,'SIMULATED MATCH · All confirmed highlight moments',40,695,20,'#a2baae');
  if(eShown&&ev.type==='goal')for(let i=0;i<40;i++){ctx.fillStyle=['#eab95d','#69d6bb','#ed7968'][i%3];ctx.fillRect((i*127+age*26)%W,(i*59+(time-ev.time)*150)%H,5,10)}
  const fade=Math.max(0,1-Math.min(age,segment.duration-age)/.25);if(fade){ctx.fillStyle=`rgba(9,20,26,${fade})`;ctx.fillRect(0,0,W,H)}return canvas;
 }};
}
function audio(timeline,fps){
 const seconds=timeline.reduce((a,s)=>a+s.duration,0),rate=24000,count=Math.ceil(seconds*rate),buffer=Buffer.alloc(44+count*2);buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(count*2,40);
 let at=0;const cues=[];for(const s of timeline){if(s.moment)cues.push({at:at+s.moment.event.time-s.moment.from,goal:s.moment.event.type==='goal'||s.moment.event.type==='penaltykick'&&s.moment.event.scored});at+=s.duration;}
 let seed=76813,low=0;for(let i=0;i<count;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/4294967296*2-1,t=i/rate;low=low*.96+noise*.04;let gain=.13,kick=0;for(const c of cues){const dt=t-c.at;if(c.goal&&dt>=0&&dt<2.3)gain+=.55*Math.exp(-dt);if(dt>=-.5&&dt<-.43)kick+=Math.sin(dt*480)*.14;}const v=Math.max(-.85,Math.min(.85,low*gain*5+kick));buffer.writeInt16LE(Math.round(v*32767),44+i*2)}return buffer;
}
export async function render(job,engine,path,{fps=FPS}={}){
 const frames=timeline(job,engine).map(s=>({...s,duration:Math.ceil(s.duration*fps)/fps})),paint=await painter(job,engine),wav=path+'.wav';await writeFile(wav,audio(frames,fps));
 const proc=spawn('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','rawvideo','-pixel_format','rgba','-video_size',`${W}x${H}`,'-framerate',String(fps),'-i','pipe:0','-i',wav,'-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-map_metadata','-1','-fflags','+bitexact','-flags:v','+bitexact','-movflags','+faststart','-shortest',path],{stdio:['pipe','ignore','pipe']});
 let err='';proc.stderr.on('data',b=>{err=(err+b).slice(-2000)});let pipeError;proc.stdin.on('error',e=>{pipeError=e});const exit=once(proc,'close');let absolute=0;
 try{for(const s of frames){for(let i=0;i<Math.round(s.duration*fps);i++){if(pipeError)throw Error('Video encoder input closed.');paint.draw(s,i/fps,absolute+i/fps);const bytes=paint.canvas.getContext('2d').getImageData(0,0,W,H).data;if(!proc.stdin.write(Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength)))await Promise.race([once(proc.stdin,'drain'),exit.then(()=>{throw Error('Video encoder stopped early.')})]);}absolute+=s.duration;}proc.stdin.end();const [code]=await exit;if(code!==0)throw Error('Video encoding failed: '+err);const bytes=await readFile(path);return {size:(await stat(path)).size,hash:hash(bytes),seconds:absolute,moments:frames.filter(s=>s.type==='moment').length};}
 catch(e){proc.kill();await exit.catch(()=>{});throw e}finally{await unlink(wav).catch(()=>{})}
}
