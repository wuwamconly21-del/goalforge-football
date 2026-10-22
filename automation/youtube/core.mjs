import {createHash,createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
export const TARGET_CHANNEL='UCLyksjgSV9Tn2ICCfoX6Cbg';
export const TARGET_HANDLE='@NelyxGaming';
export const SOURCE='https://goalforge-football1.wuwamconly21.workers.dev';
export const hash=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
export const clean=(v,max=100)=>String(v||'').replace(/[<>\u0000-\u001f\u007f]/g,'').trim().slice(0,max);
export function encrypt(state,key){
 const k=Buffer.from(key,'base64');if(k.length!==32)throw Error('HIGHLIGHTS_STATE_KEY must be 32 random bytes, base64 encoded.');
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',k,iv);cipher.setAAD(Buffer.from('goalforge-youtube-v1'));
 const bytes=Buffer.concat([cipher.update(gzipSync(Buffer.from(JSON.stringify(state)))),cipher.final()]);
 return JSON.stringify({version:1,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:bytes.toString('base64')});
}
export function decrypt(text,key){
 const v=JSON.parse(text);if(v.version!==1)throw Error('Unknown broadcast ledger version.');
 const cipher=createDecipheriv('aes-256-gcm',Buffer.from(key,'base64'),Buffer.from(v.iv,'base64'));cipher.setAAD(Buffer.from('goalforge-youtube-v1'));cipher.setAuthTag(Buffer.from(v.tag,'base64'));
 return JSON.parse(gunzipSync(Buffer.concat([cipher.update(Buffer.from(v.data,'base64')),cipher.final()]),{maxOutputLength:100*1024*1024}).toString());
}
// Use a minimal public, frozen fixture snapshot. Never persist account IDs,
// claim proofs, chat messages, sponsor applications or payment information.
export function snapshot(s,f,teams){
 const keepTeam=t=>({id:t.id,name:t.name,short:t.short,color:t.color,logo:typeof t.logo==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(t.logo)&&t.logo.length<350000?t.logo:'',players:t.players,bench:t.bench,tactics:t.tactics,clubStadium:t.clubStadium});
 const roster=teams.map(keepTeam),fixture={...f,rosters:roster};
 return {name:clean(s.name,70),season:s.season,format:s.format,mode:s.mode,weatherPolicy:s.weatherPolicy,stadium:s.stadium,sponsors:(s.sponsors||[]).filter(v=>v.placement==='board'||v.placement==='stadium').map(v=>({brand:clean(v.brand,60),placement:v.placement})),teams:roster,fixtures:[fixture],live:null};
}
export function discover(room,s,engine){
 const out=[];if(s.removedAt)return out;
 for(const season of [...(s.history||[]).map(h=>({...h,name:s.name,stadium:s.stadium,sponsors:s.sponsors})),s]){
  for(const [index,f] of (season.fixtures||[]).entries()){
   if(!f.done||f.home==null||f.away==null)continue;
   const teams=engine.footballTeams(season,f);if(teams.some(t=>!t||!Array.isArray(t.players)||t.players.length<11))continue;
   const id=hash(['match-v1',room,season.season,index,f.home,f.away,f.seed]);
   out.push({id,kind:'match',room,season:season.season,index,snapshot:snapshot(season,f,teams)});
  }
 }return out;
}
export function enqueue(ledger,jobs){
 let count=0;for(const job of jobs){if(ledger.jobs[job.id])continue;ledger.jobs[job.id]={...job,status:'queued',attempts:0,queuedAt:Date.now(),nextAttempt:0};count++}return count;
}
export function segments(s,engine){
 const f=s.fixtures[0];return engine.matchHighlights(s,f,Infinity).sort((a,b)=>a.event.time-b.event.time);
}
export function metadata(job,engine,visibility='public'){
 if(!['private','unlisted','public'].includes(visibility))throw Error('Invalid YOUTUBE_VISIBILITY.');
 const marker=`GoalForge broadcast ID: ${job.id}`;
 if(job.kind==='update')return {snippet:{title:clean(`GoalForge ${job.version} | Apa yang baharu?`,100),description:clean(job.notes,4000)+'\n\n'+marker+'\nOriginal football simulator by Nelyx Entertainment.\n'+SOURCE,categoryId:'20',tags:['GoalForge','NelyxGaming','Game update']},status:{privacyStatus:visibility,selfDeclaredMadeForKids:false}};
 const s=job.snapshot,f=s.fixtures[0],[a,b]=engine.footballTeams(s,f),score=engine.score(s,f),pens=engine.penalties(s,f),moments=segments(s,engine);
 const lines=moments.map(m=>`${Math.floor(m.event.time/2)}′ · ${clean(m.event.type,30)} · ${clean(m.event.player,80)}`);
 return {snippet:{title:clean(`${a.name} ${score[0]}–${score[1]} ${b.name} | Semua Highlights · S${job.season}`,100),description:clean(s.name,70)+` · Season ${job.season}\nAll ${moments.length} in-game highlight moments from this confirmed match.\n`+(pens.some(Boolean)?`Penalty shootout: ${pens.join('–')}\n`:'')+'\n'+lines.join('\n').slice(0,3800)+`\n\nSimulated football, not footage of a real match.\n${marker}\nPlay / watch: ${SOURCE}/?room=${encodeURIComponent(job.room)}\nSupport: https://ko-fi.com/nelyxentertainment`,categoryId:'20',tags:['GoalForge','NelyxGaming','Football simulator','Match highlights']},status:{privacyStatus:visibility,selfDeclaredMadeForKids:false}};
}
export function backoff(attempt){return Math.min(24*3600000,15*60000*2**Math.min(7,Math.max(0,attempt-1)))}
