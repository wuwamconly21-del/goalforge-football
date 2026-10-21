import type {ArenaStore,RecordRow} from '../lib/arena-server';
import {validRoom} from '../lib/arena-access';
export const GLOBAL_OBJECT='goalforge-global-v1';
export function cloudStore(namespace:any,onError?:(error:any)=>void):ArenaStore {
 const global=()=>namespace.getByName(GLOBAL_OBJECT),object=(id:string)=>validRoom(id)?namespace.getByName('room:'+id):global();
 const rpc=async(fn:()=>any)=>{try{return await fn()}catch(error){onError?.(error);throw error}};
 const reads=new Map<string,Promise<RecordRow|null>>();
 return {
  async get(id:string){if(!reads.has(id))reads.set(id,rpc(()=>object(id).read(id)));return structuredClone(await reads.get(id))},
  async create(row:RecordRow){if(validRoom(row.id))await rpc(()=>global().registerRoom(row.id));await rpc(()=>object(row.id).create(row));reads.delete(row.id)},
  async update(row:RecordRow,old:RecordRow){const ok=await rpc(()=>object(row.id).compareAndSwap(row,old));reads.delete(row.id);return ok},
  listRoomIds:()=>rpc(()=>global().roomIds())
 };
}
