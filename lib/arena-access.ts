import type {ArenaStore,RecordRow} from './arena-server';
export type ArenaIdentity={userId:string,displayName?:string,isAdmin?:boolean,isOwner?:boolean,adminId?:string,canInviteAdmins?:boolean,isManager?:boolean,guest?:boolean,sessionKey?:string};
export type AccessOptions={identity?:ArenaIdentity|null,setupHash?:string,signInPath?:string,signOutPath?:string,publicOnly?:boolean,passwordOnly?:boolean};
export const validRoom=(v:any):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export async function digest(v:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)))].map(b=>b.toString(16).padStart(2,'0')).join('')}
export async function ownerRecord(db:ArenaStore){let r=await db.get('__arena_owner');return r?JSON.parse(r.data):null}
export async function access(db:ArenaStore,identity:ArenaIdentity|null|undefined,row:RecordRow|null,bearer:string,passwordOnly=false){let owner=await ownerRecord(db);let organizer=!!identity&&(identity.isAdmin===true||!passwordOnly&&owner?.userId===identity.userId);let legacy=!passwordOnly&&!owner&&!!identity&&!!row&&!!bearer&&row.secret===await digest(bearer);return {organizer,admin:organizer||legacy,configured:!!owner}}
export async function profile(db:ArenaStore,identity:ArenaIdentity){let publicId=(await digest(identity.userId)).slice(0,32);if(identity.guest||identity.isAdmin||identity.isManager)return {publicId,name:identity.displayName||'Penonton'};let row=await db.get('__profile_'+publicId);let p=row?JSON.parse(row.data):null;return {publicId,name:identity.guest||identity.isAdmin||identity.isManager?identity.displayName||'Penonton':p?.name||'Penonton '+publicId.slice(0,5)}}
export function createAccountHandler(db:ArenaStore,options:AccessOptions={}){return async(r:Request)=>{const json=(v:any,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});try{
 const identity=options.identity,owner=await ownerRecord(db),url=new URL(r.url);let current=identity?await profile(db,identity):null;
 if(r.method==='GET')return json({authenticated:!!identity,user:current,organizer:!!identity&&owner?.userId===identity.userId,organizerConfigured:!!owner,setupAvailable:!!options.setupHash&&!owner,signInPath:options.signInPath,signOutPath:options.signOutPath});
 if(r.method!=='POST')return json({error:'Kaedah tidak dibenarkan'},405);let origin=r.headers.get('origin');if(origin&&origin!==url.origin)return json({error:'Permintaan asal tidak sah'},403);if(!identity)return json({error:'Log masuk diperlukan'},401);
 const raw=await r.text();if(raw.length>3000)return json({error:'Data terlalu besar'},413);let b=JSON.parse(raw);
 if(b.action==='claimOrganizer'){
  if(owner){return owner.userId===identity.userId?json({claimed:true}):json({error:'Akaun penganjur sudah ditetapkan. Log masuk menggunakan akaun tersebut.'},403)}
  let keyValid=typeof b.setupKey==='string'&&!!options.setupHash&&(await digest(b.setupKey))===options.setupHash;
  let row=validRoom(b.room)?await db.get(b.room):null,legacyValid=!!row&&typeof b.token==='string'&&row.secret===await digest(b.token);
  if(!keyValid&&!legacyValid)return json({error:'Pautan pengaktifan atau kunci penganjur yang sah diperlukan.'},403);
  try{await db.create({id:'__arena_owner',secret:'',revision:0,data:JSON.stringify({userId:identity.userId,created:Date.now()})})}catch{let actual=await ownerRecord(db);if(actual?.userId!==identity.userId)return json({error:'Akaun penganjur telah diaktifkan.'},409)}
  return json({claimed:true});
 }
 if(b.action==='profile'){
  let name=String(b.name||'').replace(/[\u0000-\u001f\u007f]/g,'').trim();if(name.length<2||name.length>24)return json({error:'Nama paparan perlu 2–24 aksara.'},400);
  let id='__profile_'+current!.publicId,old=await db.get(id),next={id,secret:'',revision:(old?.revision||0)+1,data:JSON.stringify({name})};
  if(old){if(!await db.update(next,old))return json({error:'Profil berubah. Cuba semula.'},409)}else try{await db.create(next)}catch{return json({error:'Profil berubah. Cuba semula.'},409)}
  return json({user:{publicId:current!.publicId,name}});
 }
 return json({error:'Tindakan tidak sah'},400);
 }catch{return json({error:'Permintaan akaun tidak dapat diproses'},400)}}}
