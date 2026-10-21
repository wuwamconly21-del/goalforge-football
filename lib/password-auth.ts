import type {ArenaStore,RecordRow} from './arena-server';
import {digest,type ArenaIdentity} from './arena-access';
const ADMIN='__Host-goalforge_admin',GUEST='__Host-goalforge_guest',ADMIN_KEY='__password_admin';
const ITERATIONS=100000;
const json=(v:any,status=200,cookie?:string)=>Response.json(v,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
const randomToken=()=>[...crypto.getRandomValues(new Uint8Array(32))].map(v=>v.toString(16).padStart(2,'0')).join('');
function cookies(r:Request){return Object.fromEntries((r.headers.get('cookie')||'').split(';').map(s=>s.trim().split('=')).filter(v=>v.length===2))}
function cookie(name:string,value:string,seconds:number){return `${name}=${value}; Path=/; Max-Age=${seconds}; HttpOnly; Secure; SameSite=Lax`}
function equal(a:string,b:string){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0}
export async function passwordHash(password:string,salt:string,iterations=ITERATIONS){let key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);let bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations},key,256);return [...new Uint8Array(bits)].map(v=>v.toString(16).padStart(2,'0')).join('')}
function credentials(username:any,password:any){let u=String(username||'').toLowerCase();if(!/^[a-z0-9_.-]{3,32}$/.test(u))throw Error('Username perlu 3–32 huruf, nombor, titik, _ atau -');if(typeof password!=='string'||password.length<12||password.length>128)throw Error('Kata laluan perlu 12–128 aksara');return u}
async function sessionRow(r:Request,db:ArenaStore,name:string){let token=cookies(r)[name];if(!token||!/^[a-f0-9]{64}$/.test(token))return null;let row=await db.get('__session_'+await digest(token));if(!row)return null;let value=JSON.parse(row.data);if(value.expires<=Date.now())return null;return {row,value}}
export async function resolveManagerSession(r:Request,db:ArenaStore):Promise<ArenaIdentity|null>{const session=await sessionRow(r,db,'__Host-goalforge_manager');if(session?.value.kind!=='manager')return null;const row=await db.get(session.value.account);if(!row)return null;const config=JSON.parse(row.data);if(config.version!==session.value.version)return null;return {userId:'manager:'+row.id,displayName:config.name,isManager:true,sessionKey:session.row.id}}
export async function resolveSession(r:Request,db:ArenaStore):Promise<ArenaIdentity|null>{
 let admin=await sessionRow(r,db,ADMIN);if(admin?.value.kind==='admin'){let config=await db.get(ADMIN_KEY);if(config){let c=JSON.parse(config.data),child=admin.value.adminId?(c.admins||[]).find((a:any)=>a.id===admin.value.adminId&&a.active):null;const valid=admin.value.adminId?child&&child.version===admin.value.version:admin.value.version===c.version;if(valid)return {userId:child?'local-admin:'+child.id:'local-admin',displayName:child?.username||c.username,isAdmin:true,isOwner:!child,canInviteAdmins:!child||child.canInviteAdmins===true,adminId:child?.id,sessionKey:admin.row.id}}}
 const manager=await resolveManagerSession(r,db);if(manager)return manager;
 let guest=await sessionRow(r,db,GUEST);if(guest?.value.kind==='guest')return {userId:'guest:'+guest.row.id,displayName:guest.value.name,guest:true,sessionKey:guest.row.id};return null;
}
async function issue(db:ArenaStore,kind:'admin'|'guest',config?:any){let token=randomToken(),seconds=kind==='admin'?43200:604800,value=kind==='admin'?{kind,...(config.adminId?{adminId:config.adminId}:{}),version:config.version,expires:Date.now()+seconds*1000}:{kind,name:'GF-'+token.slice(0,4),expires:Date.now()+seconds*1000};await db.create({id:'__session_'+await digest(token),secret:'',revision:0,data:JSON.stringify(value)});return {cookie:cookie(kind==='admin'?ADMIN:GUEST,token,seconds),name:kind==='admin'?config.username:value.name}}
export function createPasswordAccountHandler(db:ArenaStore,options:{setupHash?:string,clientIp?:string}={}){return async(r:Request)=>{try{
 const url=new URL(r.url);let configRow=await db.get(ADMIN_KEY),config=configRow?JSON.parse(configRow.data):null,identity=await resolveSession(r,db);
 const state=async(id:ArenaIdentity|null)=>({authenticated:!!(id?.isAdmin||id?.isManager),organizer:!!id?.isAdmin,owner:!!id?.isOwner,canInviteAdmins:!!id?.isAdmin&&(!!id?.isOwner||id?.canInviteAdmins===true),manager:!!id?.isManager,role:id?.isAdmin?'admin':id?.isManager?'manager':'viewer',guest:!id?.isAdmin&&!id?.isManager,organizerConfigured:!!config,setupAvailable:!config&&!!options.setupHash,user:id?{publicId:(await digest(id.userId)).slice(0,32),name:id.displayName}:null,authMode:'password'});
 if(r.method==='GET'&&url.searchParams.has('admins')){
  if(!identity?.isOwner&&!identity?.canInviteAdmins)return json({error:'Invitation access required.',code:'adminOwnerOnly'},403);
  return json({canManageAdmins:!!identity.isOwner,admins:[{id:'owner',username:config.username,owner:true,active:true},...(config.admins||[]).map((a:any)=>({id:a.id,username:a.username,active:a.active,created:a.created,canInviteAdmins:a.canInviteAdmins===true}))],invites:(config.invites||[]).filter((i:any)=>identity.isOwner||i.createdBy===identity.adminId).map((i:any)=>({id:i.id,label:i.label,expires:i.expires,used:!!i.usedAt,revoked:!!i.revoked})),limit:8});
 }
 if(r.method==='GET'){let setCookie:string|undefined;if(!identity){let s=await issue(db,'guest');setCookie=s.cookie;let req=new Request(r,{headers:{...Object.fromEntries(r.headers),cookie:(r.headers.get('cookie')||'')+'; '+s.cookie.split(';')[0]}});identity=await resolveSession(req,db)}return json(await state(identity),200,setCookie)}
 if(r.method!=='POST')return json({error:'Kaedah tidak dibenarkan'},405);let origin=r.headers.get('origin');if(origin&&origin!==url.origin)return json({error:'Permintaan asal tidak sah'},403);let raw=await r.text();if(raw.length>4000)return json({error:'Data terlalu besar'},413);let b=JSON.parse(raw);
 if(b.action==='setupPassword'){
  if(config)return json({error:'Admin sudah ditetapkan. Gunakan Login admin.'},403);
  if(!options.setupHash||typeof b.setupKey!=='string'||!equal(await digest(b.setupKey),options.setupHash))return json({error:'Pautan setup peribadi yang sah diperlukan.'},403);
  let username=credentials(b.username,b.password),salt=randomToken();config={username,salt,hash:await passwordHash(b.password,salt),iterations:ITERATIONS,version:1};
  try{await db.create({id:ADMIN_KEY,secret:'',revision:0,data:JSON.stringify(config)})}catch{return json({error:'Admin sudah ditetapkan.'},409)}let issued=await issue(db,'admin',config);return json({success:true},200,issued.cookie);
 }
 if(b.action==='login'||b.action==='acceptInvite'){
  if(!config)return json({error:'Admin belum ditetapkan. Gunakan pautan setup peribadi.'},403);
  const limitId='__login_'+await digest(options.clientIp||'unknown'),now=Date.now();let allowed=false;
  for(let retry=0;retry<4;retry++){let old=await db.get(limitId),v=old?JSON.parse(old.data):{start:now,count:0};if(now-v.start>600000)v={start:now,count:0};if(v.count>=10)return json({error:'Terlalu banyak percubaan. Cuba semula selepas 10 minit.'},429);v.count++;let next={id:limitId,secret:'',revision:(old?.revision||0)+1,data:JSON.stringify(v)};if(old)allowed=await db.update(next,old);else try{await db.create(next);allowed=true}catch{}if(allowed)break}
  if(!allowed)return json({error:'Login sibuk. Cuba semula.'},429);
  if(b.action==='acceptInvite'){
   const inviteHash=typeof b.inviteToken==='string'&&/^[a-f0-9]{64}$/.test(b.inviteToken)?await digest(b.inviteToken):'',inv=(config.invites||[]).find((v:any)=>equal(v.hash,inviteHash));
   if(!inv||inv.usedAt||inv.revoked||inv.expires<=now||inv.createdBy&&!(config.admins||[]).some((a:any)=>a.id===inv.createdBy&&a.active&&a.canInviteAdmins===true))return json({error:'Invitation unavailable.',code:'invalidAdminInvite'},403);
   if((config.admins||[]).filter((a:any)=>a.active).length>=7)return json({error:'Admin limit reached.',code:'adminLimit'},400);
   const username=credentials(b.username,b.password);if([config,...(config.admins||[])].some((a:any)=>a.username===username))return json({error:'Username unavailable.',code:'usernameTaken'},409);
   const salt=randomToken(),child={id:crypto.randomUUID(),username,salt,hash:await passwordHash(b.password,salt),iterations:ITERATIONS,version:1,active:true,created:now};config.admins=[...(config.admins||[]).filter((a:any)=>a.active),...(config.admins||[]).filter((a:any)=>!a.active).slice(-42),child];inv.usedAt=now;
   if(!await db.update({...configRow!,data:JSON.stringify(config),revision:configRow!.revision+1},configRow!))return json({error:'Account settings changed.',code:'conflict'},409);
   const issued=await issue(db,'admin',{...child,adminId:child.id});return json({success:true},200,issued.cookie);
  }
  const username=String(b.username||'').toLowerCase(),account=username===config.username?config:(config.admins||[]).find((a:any)=>a.active&&a.username===username);
  let attempt=typeof b.password==='string'&&b.password.length<=128?b.password:'';let candidate=await passwordHash(attempt,account?.salt||config.salt,account?.iterations||config.iterations);if(!account||!equal(candidate,account.hash))return json({error:'Username atau kata laluan tidak betul.'},401);
  let issued=await issue(db,'admin',{...account,...(account.id?{adminId:account.id}:{})});return json({success:true},200,issued.cookie);
 }
 if(['createAdminInvite','revokeAdminInvite','revokeAdmin','setAdminInvitePermission'].includes(b.action)){
  if(!configRow||!identity?.isAdmin||(!identity.isOwner&&(!identity.canInviteAdmins||!['createAdminInvite','revokeAdminInvite'].includes(b.action))))return json({error:'Invitation access required.',code:'adminOwnerOnly'},403);
  config.invites||=[];config.admins||=[];let inviteToken:string|undefined;
  if(b.action==='createAdminInvite'){const pending=config.invites.filter((i:any)=>!i.usedAt&&!i.revoked&&i.expires>Date.now()).length;if(config.admins.filter((a:any)=>a.active).length+pending>=7)return json({error:'Admin limit reached.',code:'adminLimit'},400);inviteToken=randomToken();config.invites=config.invites.filter((i:any)=>!i.usedAt&&!i.revoked&&i.expires>Date.now());config.invites.push({id:crypto.randomUUID(),label:String(b.label||'').trim().slice(0,40),hash:await digest(inviteToken),createdBy:identity.adminId||null,created:Date.now(),expires:Date.now()+86400000})}
  else if(b.action==='revokeAdminInvite'){const inv=config.invites.find((i:any)=>i.id===b.inviteId&&!i.usedAt&&!i.revoked&&(identity.isOwner||i.createdBy===identity.adminId));if(!inv)return json({error:'Invitation unavailable.',code:'invalidAdminInvite'},400);inv.revoked=true}
  else if(b.action==='setAdminInvitePermission'){const child=config.admins.find((a:any)=>a.id===b.adminId&&a.active);if(!child||typeof b.allowed!=='boolean')return json({error:'Invalid administrator.',code:'adminRevokeInvalid'},400);child.canInviteAdmins=b.allowed;if(!b.allowed)for(const inv of config.invites)if(inv.createdBy===child.id&&!inv.usedAt)inv.revoked=true}
  else{const child=config.admins.find((a:any)=>a.id===b.adminId&&a.active);if(!child)return json({error:'This administrator cannot be removed.',code:'adminRevokeInvalid'},400);child.active=false;child.version++;for(const inv of config.invites)if(inv.createdBy===child.id&&!inv.usedAt)inv.revoked=true}
  if(!await db.update({...configRow,data:JSON.stringify(config),revision:configRow.revision+1},configRow))return json({error:'Account settings changed.',code:'conflict'},409);return json({success:true,...(inviteToken?{inviteToken}:{})});
 }
 if(b.action==='logout'){
  let old=await sessionRow(r,db,ADMIN);if(old){old.value.expires=0;await db.update({...old.row,revision:old.row.revision+1,data:JSON.stringify(old.value)},old.row)}return json({success:true},200,cookie(ADMIN,'',0));
 }
 if(b.action==='profile'){
  if(!identity?.guest||!identity.sessionKey)return json({error:'Nama ini untuk sesi penonton tetamu.'},403);let name=String(b.name||'').replace(/[\u0000-\u001f\u007f]/g,'').trim();if(name.length<2||name.length>24)return json({error:'Nama paparan perlu 2–24 aksara.'},400);let row=await db.get(identity.sessionKey);if(!row)return json({error:'Sesi tamat. Muat semula.'},401);let v=JSON.parse(row.data);v.name=name;let ok=await db.update({...row,revision:row.revision+1,data:JSON.stringify(v)},row);return ok?json({success:true}):json({error:'Profil berubah. Cuba semula.'},409);
 }
 if(b.action==='changePassword'){
  if(!identity?.isAdmin||!configRow)return json({error:'Login admin diperlukan.'},403);const current=identity.adminId?(config.admins||[]).find((a:any)=>a.id===identity.adminId&&a.active):config;if(!current)return json({error:'Login admin diperlukan.'},403);
  if(typeof b.currentPassword!=='string'||!equal(await passwordHash(b.currentPassword,current.salt,current.iterations),current.hash))return json({error:'Kata laluan semasa tidak betul.'},401);let username=credentials(b.username||current.username,b.password);if([config,...(config.admins||[])].some((a:any)=>a!==current&&a.username===username))return json({error:'Username unavailable.',code:'usernameTaken'},409);
  let salt=randomToken(),next={...current,username,salt,hash:await passwordHash(b.password,salt),iterations:ITERATIONS,version:current.version+1};if(identity.adminId)config.admins=config.admins.map((a:any)=>a.id===identity.adminId?next:a);else config=next;
  if(!await db.update({...configRow,data:JSON.stringify(config),revision:configRow.revision+1},configRow))return json({error:'Tetapan berubah. Cuba semula.'},409);let issued=await issue(db,'admin',{...next,...(identity.adminId?{adminId:identity.adminId}:{})});return json({success:true},200,issued.cookie);
 }
 return json({error:'Tindakan tidak sah'},400);
 }catch{return json({error:'Permintaan akaun tidak dapat diproses'},400)}}}
