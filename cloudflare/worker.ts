import {PresenceMemory,sweepDue} from '../lib/traffic-policy';
import {createPremiumHandler} from '../lib/premium-server';
import {runCommunity,communityRequest,type CommunityCall} from './community-rpc';
import {createClubHandler} from '../lib/club-import';
import {createManagerProofHandler} from '../lib/manager-claims';
import {nextTransitionAt} from '../lib/match-flow';
import {publicArticle} from '../lib/public-article';
import {createMonetizationHandler,monetizationConfig,adsTxt} from '../lib/monetization-server';
import {DurableObject} from 'cloudflare:workers';
import {SqlRecords} from './sql-records';
import {cloudStore} from './store';
import {validRoom} from '../lib/arena-access';
import type {RecordRow} from '../lib/arena-server';
import {createArenaHandler} from '../lib/arena-server';
import {createPasswordAccountHandler,resolveSession,resolveManagerSession} from '../lib/password-auth';
import {createManagerHandler} from '../lib/manager-server';
import {createBannerHandler} from '../lib/banner-server';
import {scheduledChanges,runSchedules} from '../lib/scheduler';

export function nextWake(s:any,now=Date.now()):number|null{return nextTransitionAt(s,now)}

export class ArenaRecords extends DurableObject {
 private records:SqlRecords;
 private armedRevision=-1;
 private presence=new PresenceMemory();
 constructor(ctx:any,env:any){super(ctx,env);this.records=new SqlRecords(ctx.storage)}
 private async arm(row:RecordRow){if(!validRoom(row.id))return;const wake=this.env.MIGRATION_MODE==='live'?nextWake(JSON.parse(row.data)):null,current=await this.ctx.storage.getAlarm();if(wake===null){if(current!==null)await this.ctx.storage.deleteAlarm()}else if(current!==wake)await this.ctx.storage.setAlarm(wake);this.armedRevision=row.revision}
 async read(id:string){const row=this.records.get(id);if(row&&this.armedRevision!==row.revision)await this.arm(row);return row}
 async create(row:RecordRow){this.records.create(row);await this.arm(row)}
 async compareAndSwap(row:RecordRow,old:RecordRow){const ok=this.records.update(row,old);if(ok)await this.arm(row);return ok}
 registerRoom(id:string){if(!validRoom(id))throw Error('Invalid room');this.records.registerRoom(id)}
 async community(call:CommunityCall){if(this.env.MIGRATION_MODE!=='live')return {status:503,headers:[],body:'{}'};return runCommunity(call,this.records,this.env.ARENA,this.presence)}
 roomIds(){return this.records.roomIds()}
 list(after='',limit=100){return this.records.list(after,limit)}
 async alarm(){if(this.env.MIGRATION_MODE!=='live'){await this.ctx.storage.deleteAlarm();return}const meta=this.records.list('',1)[0];if(!meta||!validRoom(meta.id))return;const row=this.records.get(meta.id)!;const s=JSON.parse(row.data);if(scheduledChanges(s))this.records.update({...row,revision:row.revision+1,data:JSON.stringify(s)},row);await this.arm(this.records.get(meta.id)!)}
}
const secure=(response:Response,api=false)=>{const headers=new Headers(response.headers);headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','strict-origin');if(api)headers.set('Cache-Control','no-store');return new Response(response.body,{status:response.status,statusText:response.statusText,headers})};
export async function apiRequest(request:Request,env:any){
 let quota=false;const url=new URL(request.url),db=cloudStore(env.ARENA,error=>{if(/Exceeded allowed volume of requests in Durable Objects free tier/.test(error?.message||''))quota=true}),service=url.pathname.slice(5),clientIp=request.headers.get('CF-Connecting-IP')||'unknown';
 async function route(){
 if(service==='premium/webhook')return createPremiumHandler(db,null,env)(request);
 if(service==='premium/callback')return createPremiumHandler(db,null,env)(request);
 if(service==='premium')return createPremiumHandler(db,await resolveManagerSession(request,db),env)(request);
 if(service==='community')return communityRequest(request,env.ARENA);
 if(service==='arena'&&request.method==='GET'&&url.searchParams.get('public')==='1')return createArenaHandler(db,{publicOnly:true,passwordOnly:true})(request);
 if(service==='account')return createPasswordAccountHandler(db,{setupHash:env.ARENA_ORGANIZER_SETUP_HASH,clientIp})(request);
 if(service==='manager')return createManagerHandler(db,{identity:await resolveManagerSession(request,db),clientIp})(request);
 if(service==='club')return createClubHandler(db,{identity:await resolveSession(request,db)})(request);
 if(service==='manager-proof')return createManagerProofHandler(db,{identity:await resolveSession(request,db)})(request);
 if(service==='banner')return createBannerHandler(db)(request);
 const options={identity:await resolveSession(request,db),passwordOnly:true};
 if(service==='monetization')return createMonetizationHandler(db,options.identity,(request as any).cf?.country==='MY')(request);
 if(service==='arena')return createArenaHandler(db,options)(request);
 return Response.json({error:'Not found.'},{status:404});
 }const response=await route();return quota?Response.json({error:'Cloudflare storage request quota reached.',code:'storageQuota'},{status:503}):response;
}
export default {
 async fetch(request:Request,env:any){const url=new URL(request.url);try{if(env.MIGRATION_MODE!=='live')return secure(Response.json({error:'GoalForge migration verification is in progress.'},{status:503}),true);if(url.pathname==='/api/health'&&request.method==='GET')return secure(Response.json({application:'GoalForge',version:'1.19.0',mode:'live'}),true);if(url.pathname==='/news/'&&request.method==='GET')return secure(await publicArticle(cloudStore(env.ARENA),url,(request as any).cf?.country||''));if(url.pathname==='/ads.txt'&&request.method==='GET'){const {config}=await monetizationConfig(cloudStore(env.ARENA));return secure(new Response(adsTxt(config),{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}}))}if(url.pathname.startsWith('/api/')){const shared=url.pathname==='/api/arena'&&request.method==='GET'&&url.searchParams.get('public')==='1'&&!url.searchParams.has('token'),cache=globalThis.caches?.default,key=new Request(url.origin+url.pathname+'?public=1'+(url.searchParams.get('room')?'&room='+encodeURIComponent(url.searchParams.get('room')!):''));if(shared&&cache){const hit=await cache.match(key);if(hit){const data=await hit.json() as any;data.serverNow=Date.now();return secure(Response.json(data),true)}}const response=await apiRequest(request,env);if(response.status>=400&&/Exceeded allowed volume of requests in Durable Objects free tier/.test(await response.clone().text()))return secure(Response.json({error:'Cloudflare storage request quota reached.',code:'storageQuota'},{status:503}),true);if(shared&&cache&&response.ok){const body=await response.clone().text();await cache.put(key,new Response(body,{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age='+(url.searchParams.get('room')?'4':'20')}}))}return secure(response,true)}const asset=await env.ASSETS.fetch(request);if(asset.headers.get('content-type')?.includes('text/html')){let config:any={};try{({config}=await monetizationConfig(cloudStore(env.ARENA)))}catch{/* Optional verification must not take down the static app. */}if(/^ca-pub-\d{16}$/.test(config.publisherId))return secure(new HTMLRewriter().on('head',{element(e:any){e.append(`<meta name="google-adsense-account" content="${config.publisherId}">`,{html:true})}}).transform(asset))}return secure(asset)}catch(error:any){if(/Exceeded allowed volume of requests in Durable Objects free tier/.test(error?.message||''))return secure(Response.json({error:'Cloudflare storage request quota reached.',code:'storageQuota'},{status:503}),true);console.error('GoalForge request failed');return secure(Response.json({error:'Service temporarily unavailable.'},{status:503}),true)}},
 async scheduled(_event:any,env:any,ctx:any){if(env.MIGRATION_MODE==='live'&&sweepDue(_event))ctx.waitUntil(runSchedules(cloudStore(env.ARENA)))}
};
