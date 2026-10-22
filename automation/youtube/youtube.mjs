import {open} from 'node:fs/promises';
import {TARGET_CHANNEL,TARGET_HANDLE} from './core.mjs';
const API='https://www.googleapis.com/youtube/v3/';
export class YouTube {
 constructor({clientId,clientSecret,refreshToken,fetcher=fetch}){Object.assign(this,{clientId,clientSecret,refreshToken,fetcher,token:null,until:0});}
 async access(){if(this.token&&this.until>Date.now())return this.token;const r=await this.fetcher('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:this.clientId,client_secret:this.clientSecret,refresh_token:this.refreshToken,grant_type:'refresh_token'}),signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`YouTube authorization failed (${r.status}); reconnect the channel.`);const d=await r.json();if(!d.access_token)throw Error('Missing YouTube access token.');this.token=d.access_token;this.until=Date.now()+Math.max(0,(d.expires_in||3600)-120)*1000;return this.token;}
 async request(url,options={}){const token=await this.access();return this.fetcher(url,{...options,headers:{Authorization:`Bearer ${token}`,...options.headers},redirect:'error',signal:AbortSignal.timeout(120000)});}
 async verifyChannel(){
  const r=await this.request(API+'channels?part=id,snippet&mine=true');if(!r.ok)throw Error(`Cannot verify YouTube channel (${r.status}).`);const d=await r.json();if(d.items?.length!==1||d.items[0].id!==TARGET_CHANNEL)throw Error('Wrong YouTube authorization: expected NelyxGaming. No uploads performed.');
  const h=await this.request(API+'channels?part=id&forHandle='+encodeURIComponent(TARGET_HANDLE));if(!h.ok||(await h.json()).items?.[0]?.id!==TARGET_CHANNEL)throw Error('NelyxGaming handle/channel mismatch. No uploads performed.');
 }
 validSession(url){const u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='www.googleapis.com'||u.username||u.password||!u.pathname.startsWith('/upload/youtube/'))throw Error('Invalid YouTube upload session.');return u.href;}
 async start(meta,size){const r=await this.request('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',{method:'POST',headers:{'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Length':String(size),'X-Upload-Content-Type':'video/mp4'},body:JSON.stringify(meta)});if(!r.ok)throw Error(`YouTube session creation failed (${r.status}).`);return this.validSession(r.headers.get('location'));}
 async status(session,size){const r=await this.request(this.validSession(session),{method:'PUT',headers:{'Content-Length':'0','Content-Range':`bytes */${size}`}});return this.result(r,size);}
 async result(r,size){
  if(r.ok){const v=await r.json();if(!/^[\w-]{11}$/.test(v.id||''))throw Error('YouTube returned no video ID.');if(v.snippet?.channelId&&v.snippet.channelId!==TARGET_CHANNEL)throw Error('Upload response channel mismatch.');return {done:true,id:v.id,visibility:v.status?.privacyStatus||'unknown'};}
  if(r.status===308){const range=r.headers.get('range'),m=range?.match(/^bytes=0-(\d+)$/);if(range&&!m)throw Error('Invalid resumable range.');const offset=m?Number(m[1])+1:0;if(offset<0||offset>size)throw Error('Resumable range outside file.');return {done:false,offset};}
  if(r.status===404||r.status===410){const e=Error('Upload session expired or uncertain; held for reconciliation to avoid duplicate video.');e.uncertain=true;throw e}
  throw Error(`YouTube upload paused (${r.status}); saved session will be retried.`);
 }
 async upload(session,path,size,onProgress=async()=>{}){
  let result=await this.status(session,size);if(result.done)return result;
  const file=await open(path,'r');try{while(result.offset<size){const offset=result.offset,bytes=Math.min(8*1024*1024,size-offset),buffer=Buffer.alloc(bytes);const read=await file.read(buffer,0,bytes,offset);if(read.bytesRead!==bytes)throw Error('Rendered file changed during upload.');const r=await this.request(this.validSession(session),{method:'PUT',headers:{'Content-Type':'video/mp4','Content-Length':String(bytes),'Content-Range':`bytes ${offset}-${offset+bytes-1}/${size}`},body:buffer});const next=await this.result(r,size);if(next.done)return next;if(next.offset<=offset)throw Error('YouTube made no upload progress.');result=next;await onProgress(result.offset)}throw Error('Awaiting final upload receipt.');}finally{await file.close()}
 }
 // An expired session is never blindly replaced: a completed request may have
 // lost its response. Search the channel's actual uploads for our unique marker.
 async reconcile(id){
  const r=await this.request(API+'channels?part=contentDetails&mine=true');if(!r.ok)throw Error('Reconciliation could not read channel.');const list=(await r.json()).items?.[0]?.contentDetails?.relatedPlaylists?.uploads;if(!list)throw Error('Missing channel upload playlist.');
  let page='';for(let n=0;n<20;n++){const p=await this.request(API+'playlistItems?part=contentDetails&maxResults=50&playlistId='+encodeURIComponent(list)+(page?'&pageToken='+encodeURIComponent(page):''));if(!p.ok)throw Error('Reconciliation could not read uploads.');const d=await p.json(),ids=(d.items||[]).map(v=>v.contentDetails.videoId);if(ids.length){const v=await this.request(API+'videos?part=snippet,status&id='+ids.join(','));if(!v.ok)throw Error('Reconciliation could not read video receipts.');const found=(await v.json()).items?.find(v=>v.snippet?.channelId===TARGET_CHANNEL&&v.snippet.description?.includes(`GoalForge broadcast ID: ${id}`));if(found)return {done:true,id:found.id,visibility:found.status.privacyStatus};}page=d.nextPageToken;if(!page)break;}return null;
 }
}
