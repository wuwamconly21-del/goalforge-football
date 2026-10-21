import type {ArenaStore,RecordRow} from './arena-server';
import {access,validRoom,profile,type AccessOptions} from './arena-access';
const json=(v:any,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
const fresh=()=>({presence:{} as any,supports:{} as any,messages:[] as any[],muted:{} as any,rate:{} as any,enabled:true});
const UUID=/^[a-zA-Z0-9-]{20,60}$/;
export function createCommunityHandler(db:ArenaStore,options:AccessOptions={}){return async(r:Request)=>{try{
 const url=new URL(r.url);let body:any={};if(r.method==='POST'){let origin=r.headers.get('origin');if(origin&&origin!==url.origin)return json({error:'Permintaan asal tidak sah'},403);let raw=await r.text();if(raw.length>4000)return json({error:'Data terlalu besar'},413);body=JSON.parse(raw)}else if(r.method!=='GET')return json({error:'Kaedah tidak dibenarkan'},405);
 const room=r.method==='GET'?url.searchParams.get('room'):body.room;if(!validRoom(room))return json({error:'Room tidak sah'},400);let arena=await db.get(room);if(!arena||JSON.parse(arena.data).removedAt)return json({error:'Kejohanan tidak ditemui'},404);
 let bearer=r.headers.get('authorization')?.replace('Bearer ','')||'',rights=await access(db,options.identity,arena,bearer,options.passwordOnly),me=options.identity?await profile(db,options.identity):null;
 const teams=JSON.parse(arena.data).teams;
 const key='__community_'+room,now=Date.now();
 function output(c:any){const supporters=Object.entries(c.supports||{}).filter(([id]:any)=>c.presence['u:'+id]>now-60000),ultras=teams.map((team:any)=>{const fans=supporters.filter(([,v]:any)=>v.teamId===team.id);return {teamId:team.id,count:fans.length,flags:['stripes','checkered','diagonal'].map(pattern=>({pattern,count:fans.filter(([,v]:any)=>v.pattern===pattern).length})).filter(f=>f.count)}}).filter((v:any)=>v.count);return {ultras,mySupport:me?c.supports?.[me.publicId]||null:null,viewers:Object.values(c.presence).filter((v:any)=>v>now-60000).length,messages:c.messages.filter((m:any)=>!m.deleted).map((m:any)=>({id:m.id,userId:m.userId,name:m.name,text:m.text,time:m.time,organizer:!!m.organizer})),enabled:c.enabled,canModerate:rights.admin,mutedUsers:rights.admin?Object.entries(c.muted).filter(([,until]:any)=>until>now).map(([id])=>id):[],canChat:!!me&&c.enabled&&!(c.muted[me.publicId]>now),mutedUntil:me?c.muted[me.publicId]||0:0}}
 if(r.method==='GET'){let row=await db.get(key);return json(output(row?JSON.parse(row.data):fresh()))}
 for(let attempt=0;attempt<4;attempt++){
  let old=await db.get(key),c=old?JSON.parse(old.data):fresh();c.supports||={};c.presence=Object.fromEntries(Object.entries(c.presence).filter(([,v]:any)=>v>now-60000));c.rate=Object.fromEntries(Object.entries(c.rate).filter(([,v]:any)=>v>now-60000));
  c.supports=Object.fromEntries(Object.entries(c.supports).filter(([id])=>c.presence['u:'+id]>now-60000));
  if(body.action==='supportTeam'){
   if(!me)return json({error:'Guest session required.'},401);if(!teams.some((t:any)=>t.id===body.teamId)||!['stripes','checkered','diagonal'].includes(body.pattern))return json({error:'Invalid team or flag.'},400);const rateKey='support:'+me.publicId;if(c.rate[rateKey]&&now-c.rate[rateKey]<3000)return json({error:'Wait 3 seconds.'},429);if(Object.keys(c.presence).length>=500&&!c.presence['u:'+me.publicId])return json({error:'Stadium is busy.'},429);c.rate[rateKey]=now;c.presence['u:'+me.publicId]=now;c.supports[me.publicId]={teamId:body.teamId,pattern:body.pattern};
  }else if(body.action==='presence'){
   if(!UUID.test(body.visitorId||''))return json({error:'Sesi pelayar tidak sah'},400);let who=me?'u:'+me.publicId:'v:'+body.visitorId;if(me)delete c.presence['v:'+body.visitorId];if(Object.keys(c.presence).length>=500&&!c.presence[who])return json(output(c));c.presence[who]=now;
  }else if(body.action==='message'){
   if(!me)return json({error:'Muat semula untuk menyediakan sesi penonton.'},401);if(!c.enabled)return json({error:'Chat ditutup oleh penganjur.'},403);if(c.muted[me.publicId]>now)return json({error:'Akaun ini dibisukan sementara oleh penganjur.'},403);
   let text=String(body.text||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim();if(!text||text.length>280)return json({error:'Mesej perlu 1–280 aksara.'},400);if(c.rate[me.publicId]&&now-c.rate[me.publicId]<3000)return json({error:'Tunggu 3 saat sebelum mesej seterusnya.'},429);
   c.messages.push({id:crypto.randomUUID(),userId:me.publicId,name:me.name,text,time:now,organizer:rights.organizer});c.messages=c.messages.slice(-100);c.rate[me.publicId]=now;
  }else{
   if(!rights.admin)return json({error:'Kawalan ini untuk penganjur sahaja.'},403);
   if(body.action==='deleteMessage'){let m=c.messages.find((m:any)=>m.id===body.messageId);if(!m)return json({error:'Mesej tidak ditemui'},404);m.deleted=true;m.text=''}
   else if(body.action==='mute'){if(!/^[a-f0-9]{32}$/.test(body.userId||'')||!c.messages.some((m:any)=>m.userId===body.userId&&!m.organizer))return json({error:'Penonton tidak ditemui'},400);c.muted[body.userId]=now+30*60*1000}
   else if(body.action==='unmute'){if(!/^[a-f0-9]{32}$/.test(body.userId||''))return json({error:'Penonton tidak sah'},400);delete c.muted[body.userId]}
   else if(body.action==='toggleChat'){if(typeof body.enabled!=='boolean')return json({error:'Tetapan tidak sah'},400);c.enabled=body.enabled}
   else return json({error:'Tindakan tidak sah'},400);
  }
  let next:RecordRow={id:key,secret:'',data:JSON.stringify(c),revision:(old?.revision||0)+1};let ok=false;if(old)ok=await db.update(next,old);else try{await db.create(next);ok=true}catch{ok=false}if(ok)return json(output(c));
 }
 return json({error:'Chat sibuk. Cuba semula.'},409);
 }catch{return json({error:'Chat tidak dapat diproses'},400)}}}
