import worker from '../cloudflare/worker';
import {cloudStore} from '../cloudflare/store';
export {ArenaRecords} from '../cloudflare/worker';
export default {async fetch(request:Request,env:any){const url=new URL(request.url);if(url.pathname==='/__test/raw'){const row=await cloudStore(env.ARENA).get(url.searchParams.get('room')||'');return Response.json(row?JSON.parse(row.data):null)}return worker.fetch(request,{...env,ASSETS:{fetch:async()=>new Response('<!doctype html><html><head><title>GoalForge test</title></head><body>Application</body></html>',{headers:{'Content-Type':'text/html'}})}})},scheduled:worker.scheduled};
