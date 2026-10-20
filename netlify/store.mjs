import {getStore} from '@netlify/blobs';
export function arenaStore(){
 const store=getStore({name:'goalforge-football',consistency:'strong'});
 const writable=async()=>{const row=await store.get('__migration_lock',{type:'json',consistency:'strong'});if(row&&JSON.parse(row.data).active)throw Error('Migration in progress; writes are temporarily paused')};
 return {
  async listRoomIds(){const ids=[];for await(const page of store.list({paginate:true})){for(const blob of page.blobs)if(/^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(blob.key))ids.push(blob.key)}return ids},
  async get(id){let entry=await store.getWithMetadata(id,{type:'json',consistency:'strong'});return entry?{...entry.data,etag:entry.etag}:null},
  async create(row){await writable();const {etag,...value}=row;let result=await store.setJSON(row.id,value,{onlyIfNew:true});if(!result.modified)throw Error('Record already exists')},
  async update(row,previous){await writable();const {etag,...value}=row;let result=await store.setJSON(row.id,value,{onlyIfMatch:previous.etag});return !!result.modified}
 };
}
