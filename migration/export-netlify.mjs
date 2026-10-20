import {getStore} from '@netlify/blobs';
import {mkdir,writeFile,chmod} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const directory=resolve(process.argv[2]||'.migration-private');
if(!process.env.NETLIFY_AUTH_TOKEN||!process.env.NETLIFY_SITE_ID)throw Error('Authenticated Netlify environment required');
const store=getStore({name:'goalforge-football',siteID:process.env.NETLIFY_SITE_ID,token:process.env.NETLIFY_AUTH_TOKEN,consistency:'strong'}),keys=[];
for await(const page of store.list({paginate:true}))for(const item of page.blobs)keys.push(item.key);
keys.sort();const rows=[];for(let i=0;i<keys.length;i+=6){const batch=await Promise.all(keys.slice(i,i+6).map(async id=>{const entry=await store.getWithMetadata(id,{type:'json',consistency:'strong'});if(!entry)throw Error('Source changed during export');const v=entry.data;if(v.id!==id||typeof v.data!=='string'||typeof v.secret!=='string'||!Number.isSafeInteger(v.revision))throw Error('Invalid source record');return {id:v.id,secret:v.secret,data:v.data,revision:v.revision}}));rows.push(...batch)}
const manifest=rows.map(r=>({id:r.id,revision:r.revision,hash:createHash('sha256').update(JSON.stringify(r)).digest('hex'),bytes:Buffer.byteLength(r.data)}));
await mkdir(directory,{recursive:true,mode:0o700});await chmod(directory,0o700);await writeFile(join(directory,'records.jsonl'),rows.map(r=>JSON.stringify(r)).join('\n')+'\n',{mode:0o600});await writeFile(join(directory,'manifest.json'),JSON.stringify({created:new Date().toISOString(),records:manifest,hash:createHash('sha256').update(JSON.stringify(manifest)).digest('hex')},null,2),{mode:0o600});
console.log(JSON.stringify({records:rows.length,competitions:rows.filter(r=>/^[0-9a-f-]{36}$/i.test(r.id)).length,bytes:manifest.reduce((n,r)=>n+r.bytes,0),largestRecord:Math.max(0,...manifest.map(r=>r.bytes)),directory}));
