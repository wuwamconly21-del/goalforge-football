import worker from '../cloudflare/worker';
import {cloudStore} from '../cloudflare/store';
export {ArenaRecords} from '../cloudflare/worker';
export default {async fetch(request:Request,env:any){const url=new URL(request.url);if(url.pathname==='/__test/raw'){const row=await cloudStore(env.ARENA).get(url.searchParams.get('room')||'');return Response.json(row?JSON.parse(row.data):null)}return worker.fetch(request,env)},scheduled:worker.scheduled};
