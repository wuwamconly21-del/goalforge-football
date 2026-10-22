import {encrypt,decrypt,TARGET_CHANNEL} from './core.mjs';
const BRANCH='goalforge-broadcast-state',FILE='broadcast-state.enc.json';
export class Ledger {
 constructor({repo,token,key,fetcher=fetch}){if(!/^[\w.-]+\/[\w.-]+$/.test(repo||''))throw Error('Invalid GitHub repository.');this.base=`https://api.github.com/repos/${repo}`;this.token=token;this.key=key;this.fetcher=fetcher;this.sha=null;}
 async api(path,options={}){const r=await this.fetcher(this.base+path,{...options,headers:{Accept:'application/vnd.github+json','Content-Type':'application/json',Authorization:`Bearer ${this.token}`,'X-GitHub-Api-Version':'2022-11-28',...options.headers},signal:AbortSignal.timeout(30000)});if(!r.ok){const error=Error(`Ledger request failed (${r.status}).`);error.status=r.status;throw error}return r.status===204?null:r.json();}
 async load(){
  let branch;try{branch=await this.api(`/git/ref/heads/${BRANCH}`)}catch(e){if(e.status!==404)throw e;const main=await this.api('/git/ref/heads/main');await this.api('/git/refs',{method:'POST',body:JSON.stringify({ref:`refs/heads/${BRANCH}`,sha:main.object.sha})});}
  try{let file=await this.api(`/contents/${FILE}?ref=${BRANCH}`);this.sha=file.sha;if(!file.content)file=await this.api(`/git/blobs/${file.sha}`);this.state=decrypt(Buffer.from(file.content,'base64').toString(),this.key);if(this.state.channel!==TARGET_CHANNEL)throw Error('Ledger belongs to another channel.');}
  catch(e){if(e.status!==404)throw e;this.state={version:1,channel:TARGET_CHANNEL,jobs:{}}}
  return this.state;
 }
 async save(){
  const text=encrypt(this.state,this.key);if(Buffer.byteLength(text)>20*1024*1024)throw Error('Broadcast ledger needs maintenance; existing queue is retained.');
  const result=await this.api(`/contents/${FILE}`,{method:'PUT',body:JSON.stringify({branch:BRANCH,message:'Checkpoint automatic GoalForge broadcasts',...(this.sha?{sha:this.sha}:{}),content:Buffer.from(text).toString('base64')})});this.sha=result.content.sha;
 }
}
