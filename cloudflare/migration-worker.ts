// Temporary import-only entry point. It is replaced by worker.ts before launch.
// No API route, static site, scheduler or user write is enabled here.
import {cloudStore,GLOBAL_OBJECT} from './store';
import {digest,validRoom} from '../lib/arena-access';
export {ArenaRecords} from './worker';
const canonical=(r:any)=>JSON.stringify({id:r.id,secret:r.secret,data:r.data,revision:r.revision});
async function authorized(request:Request,env:any){const supplied=request.headers.get('Authorization')||'',expected=env.MIGRATION_TOKEN?'Bearer '+env.MIGRATION_TOKEN:'';if(!expected||supplied.length!==expected.length)return false;let diff=0;for(let i=0;i<expected.length;i++)diff|=supplied.charCodeAt(i)^expected.charCodeAt(i);return diff===0}
export default {
 async fetch(request:Request,env:any){const json=(body:any,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});if(!await authorized(request,env))return json({error:'Not found'},404);if(env.MIGRATION_MODE!=='import')return json({error:'Import closed'},403);const url=new URL(request.url),db=cloudStore(env.ARENA);try{
  if(url.pathname==='/status')return json({mode:'import',rooms:await db.listRoomIds!()});
  if(url.pathname==='/import'&&request.method==='POST'){const row:any=await request.json();if(typeof row.id!=='string'||(!validRoom(row.id)&&!row.id.startsWith('__'))||typeof row.data!=='string'||typeof row.secret!=='string'||!Number.isSafeInteger(row.revision)||row.revision<0)return json({error:'Invalid record'},400);const old=await db.get(row.id);if(old){if(canonical(old)!==canonical(row))return json({error:'Target record differs; overwrite refused'},409)}else await db.create(row);return json({id:row.id,revision:row.revision,hash:await digest(canonical(row)),existing:!!old})}
  if(url.pathname==='/verify'){const id=url.searchParams.get('id')||'',row=await db.get(id);return row?json({id:row.id,revision:row.revision,hash:await digest(canonical(row))}):json({error:'Record not found'},404)}
  if(url.pathname==='/inventory'){const roomIds=await db.listRoomIds!(),global=env.ARENA.getByName(GLOBAL_OBJECT),records=await global.list(url.searchParams.get('after')||'',100);return json({rooms:roomIds,records})}
  return json({error:'Not found'},404);
 }catch{return json({error:'Migration operation failed'},500)}},
 async scheduled(){}
};
