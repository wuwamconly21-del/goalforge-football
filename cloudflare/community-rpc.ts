import type {PresenceMemory} from '../lib/traffic-policy';
import {validRoom} from '../lib/arena-access';
import {createCommunityHandler} from '../lib/community-server';
import {resolveSession} from '../lib/password-auth';
import type {ArenaStore,RecordRow} from '../lib/arena-server';
import {GLOBAL_OBJECT} from './store';
export type CommunityCall={url:string,method:string,headers:[string,string][],body?:string};
export type CommunityReply={status:number,headers:[string,string][],body:string};
const quotaError=(e:any)=>/Exceeded allowed volume of requests in Durable Objects free tier/.test(e?.message||'');
const serialize=async(r:Response):Promise<CommunityReply>=>({status:r.status,headers:[...r.headers],body:await r.text()});
const quota=()=>Response.json({error:'Cloudflare storage request quota reached.',code:'storageQuota'},{status:503});
// Execute auth + community reads/CAS inside the existing global object. Only the
// tournament validation crosses into its room object. No records change location.
export async function runCommunity(call:CommunityCall,local:{get:(id:string)=>RecordRow|null,create:(r:RecordRow)=>any,update:(r:RecordRow,old:RecordRow)=>boolean},namespace:any,presence?:PresenceMemory):Promise<CommunityReply>{
 if(!['GET','POST'].includes(call.method))return serialize(Response.json({error:'Method not allowed.'},{status:405}));
 if(typeof call.url!=='string'||new URL(call.url).pathname!=='/api/community'||(call.body||'').length>4000)return serialize(Response.json({error:'Invalid community request.'},{status:400}));
 let blocked=false;const readRooms=new Map<string,Promise<RecordRow|null>>(),guard=async(fn:()=>any)=>{try{return await fn()}catch(e){blocked||=quotaError(e);throw e}};
 const db:ArenaStore={async get(id){return guard(async()=>{if(!validRoom(id))return structuredClone(local.get(id));if(!readRooms.has(id))readRooms.set(id,namespace.getByName('room:'+id).read(id));return structuredClone(await readRooms.get(id))})},async create(row){if(validRoom(row.id))throw Error('Community cannot create tournaments.');await guard(()=>local.create(row))},async update(row,old){if(validRoom(row.id))throw Error('Community cannot update tournaments.');return guard(()=>local.update(row,old))}};
 try{const request=new Request(call.url,{method:call.method,headers:call.headers,...(call.method==='POST'?{body:call.body||''}:{})}),identity=await resolveSession(request,db),response=await createCommunityHandler(db,{identity,passwordOnly:true},presence)(request);return serialize(blocked?quota():response)}catch(e){if(quotaError(e)||blocked)return serialize(quota());return serialize(Response.json({error:'Community unavailable.'},{status:503}))}
}
export async function communityRequest(request:Request,namespace:any){if(!['GET','POST'].includes(request.method))return Response.json({error:'Method not allowed.'},{status:405});const body=request.method==='POST'?await request.text():undefined;if((body||'').length>4000)return Response.json({error:'Request too large.'},{status:413});const headers:[string,string][]=[];for(const key of ['cookie','origin','authorization','content-type']){const value=request.headers.get(key);if(value)headers.push([key,value])}const reply:CommunityReply=await namespace.getByName(GLOBAL_OBJECT).community({url:request.url,method:request.method,headers,body});return new Response(reply.body,{status:reply.status,headers:reply.headers})}
