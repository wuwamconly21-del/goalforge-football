import {createClubHandler} from '../../lib/club-import.ts';
import {createManagerProofHandler} from '../../lib/manager-claims.ts';
import {arenaStore} from '../store.mjs';
import {migrationLock,maintenanceResponse} from '../migration-lock.mjs';
import {createArenaHandler} from '../../lib/arena-server.ts';
import {createCommunityHandler} from '../../lib/community-server.ts';
import {createPasswordAccountHandler,resolveSession,resolveManagerSession} from '../../lib/password-auth.ts';
import {createManagerHandler} from '../../lib/manager-server.ts';
import {createBannerHandler} from '../../lib/banner-server.ts';
export default async function handler(request,context={}){
 const db=arenaStore();const lock=await migrationLock(db);if(lock?.active)return maintenanceResponse(lock);
 const url=new URL(request.url),service=url.searchParams.get('service')||url.pathname.split('/').pop();
 if(service==='account')return createPasswordAccountHandler(db,{setupHash:process.env.ARENA_ORGANIZER_SETUP_HASH,clientIp:context.ip||'unknown'})(request);
 if(service==='manager')return createManagerHandler(db,{identity:await resolveManagerSession(request,db),clientIp:context.ip||'unknown'})(request);
 if(service==='club')return createClubHandler(db,{identity:await resolveSession(request,db)})(request);
 if(service==='manager-proof')return createManagerProofHandler(db,{identity:await resolveSession(request,db)})(request);
 if(service==='banner')return createBannerHandler(db)(request);
 const options={identity:await resolveSession(request,db),passwordOnly:true};
 if(service==='community')return createCommunityHandler(db,options)(request);
 return createArenaHandler(db,options)(request);
}
