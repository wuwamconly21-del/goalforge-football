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
import {createCommunityHandler} from '../lib/community-server';
import {createBannerHandler} from '../lib/banner-server';
import {scheduledChanges,runSchedules} from '../lib/scheduler';

export function nextWake(s:any,now=Date.now()):number|null{return nextTransitionAt(s,now)}

export class ArenaRecords extends DurableObject {
 private records:SqlRecords;
 constructor(ctx:any,env:any){super(ctx,env);this.records=new SqlRecords(ctx.storage)}
 private async arm(row:RecordRow){if(!validRoom(row.id))return;const wake=this.env.MIGRATION_MODE==='live'?nextWake(JSON.parse(row.data)):null,current=await this.ctx.storage.getAlarm();if(wake===null){if(current!==null)await this.ctx.storage.deleteAlarm()}else if(current!==wake)await this.ctx.storage.setAlarm(wake)}
 async read(id:string){const row=this.records.get(id);if(row)await this.arm(row);return row}
 async create(row:RecordRow){this.records.create(row);await this.arm(row)}
 async compareAndSwap(row:RecordRow,old:RecordRow){const ok=this.records.update(row,old);if(ok)await this.arm(row);return ok}
 registerRoom(id:string){if(!validRoom(id))throw Error('Invalid room');this.records.registerRoom(id)}
 roomIds(){return this.records.roomIds()}
 list(after='',limit=100){return this.records.list(after,limit)}
 async alarm(){if(this.env.MIGRATION_MODE!=='live'){await this.ctx.storage.deleteAlarm();return}const meta=this.records.list('',1)[0];if(!meta||!validRoom(meta.id))return;const row=this.records.get(meta.id)!;const s=JSON.parse(row.data);if(scheduledChanges(s))this.records.update({...row,revision:row.revision+1,data:JSON.stringify(s)},row);await this.arm(this.records.get(meta.id)!)}
}
const secure=(response:Response,api=false)=>{const headers=new Headers(response.headers);headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','strict-origin');if(api)headers.set('Cache-Control','no-store');return new Response(response.body,{status:response.status,statusText:response.statusText,headers})};
export async function apiRequest(request:Request,env:any){
 const url=new URL(request.url),db=cloudStore(env.ARENA),service=url.pathname.slice(5),clientIp=request.headers.get('CF-Connecting-IP')||'unknown';
 if(service==='account')return createPasswordAccountHandler(db,{setupHash:env.ARENA_ORGANIZER_SETUP_HASH,clientIp})(request);
 if(service==='manager')return createManagerHandler(db,{identity:await resolveManagerSession(request,db),clientIp})(request);
 if(service==='banner')return createBannerHandler(db)(request);
 const options={identity:await resolveSession(request,db),passwordOnly:true};
 if(service==='monetization')return createMonetizationHandler(db,options.identity,(request as any).cf?.country==='MY')(request);
 if(service==='community')return createCommunityHandler(db,options)(request);
 if(service==='arena')return createArenaHandler(db,options)(request);
 return Response.json({error:'Not found.'},{status:404});
}
export default {
 async fetch(request:Request,env:any){const url=new URL(request.url);try{if(env.MIGRATION_MODE!=='live')return secure(Response.json({error:'GoalForge migration verification is in progress.'},{status:503}),true);if(url.pathname==='/api/health'&&request.method==='GET')return secure(Response.json({application:'GoalForge',version:'1.12.0',mode:'live'}),true);if(url.pathname==='/news/'&&request.method==='GET')return secure(await publicArticle(cloudStore(env.ARENA),url,(request as any).cf?.country||''));if(url.pathname==='/ads.txt'&&request.method==='GET'){const {config}=await monetizationConfig(cloudStore(env.ARENA));return secure(new Response(adsTxt(config),{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}}))}if(url.pathname.startsWith('/api/'))return secure(await apiRequest(request,env),true);const asset=await env.ASSETS.fetch(request);if(asset.headers.get('content-type')?.includes('text/html')){const {config}=await monetizationConfig(cloudStore(env.ARENA));if(/^ca-pub-\d{16}$/.test(config.publisherId))return secure(new HTMLRewriter().on('head',{element(e:any){e.append(`<meta name="google-adsense-account" content="${config.publisherId}">`,{html:true})}}).transform(asset))}return secure(asset)}catch{console.error('GoalForge request failed');return secure(Response.json({error:'Service temporarily unavailable.'},{status:503}),true)}},
 async scheduled(_event:any,env:any,ctx:any){if(env.MIGRATION_MODE==='live')ctx.waitUntil(runSchedules(cloudStore(env.ARENA)))}
};
