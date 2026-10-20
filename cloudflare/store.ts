import type {ArenaStore,RecordRow} from '../lib/arena-server';
import {validRoom} from '../lib/arena-access';
export const GLOBAL_OBJECT='goalforge-global-v1';
export function cloudStore(namespace:any):ArenaStore {
 const global=()=>namespace.getByName(GLOBAL_OBJECT),object=(id:string)=>validRoom(id)?namespace.getByName('room:'+id):global();
 return {
  get:(id:string)=>object(id).read(id),
  async create(row:RecordRow){if(validRoom(row.id))await global().registerRoom(row.id);await object(row.id).create(row)},
  update:(row:RecordRow,old:RecordRow)=>object(row.id).compareAndSwap(row,old),
  listRoomIds:()=>global().roomIds()
 };
}
