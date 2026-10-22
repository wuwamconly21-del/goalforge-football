// Run locally on the user's computer, never inside a public workflow log.
// No passwords, access tokens or refresh tokens are printed.
import {createServer} from 'node:http';
import {randomBytes,createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {TARGET_CHANNEL} from './core.mjs';
import {YouTube} from './youtube.mjs';
const repo='wuwamconly21-del/goalforge-football';
async function main(){
 const path=process.argv[2];if(!path)throw Error('Usage: node automation/youtube/authorize.mjs /path/to/downloaded-desktop-client.json [--initial-setup]');
 const client=JSON.parse(await readFile(path,'utf8')).installed;if(!client?.client_id||!client?.client_secret)throw Error('Use a Google OAuth Desktop app client JSON, not a service account or web client.');
 if(spawnSync('gh',['auth','status'],{stdio:'ignore'}).status!==0)throw Error('Install GitHub CLI and run gh auth login first.');
 const verifier=randomBytes(48).toString('base64url'),state=randomBytes(32).toString('hex');let done;
 const result=new Promise((resolve,reject)=>{done={resolve,reject}}),server=createServer(async(req,res)=>{
  try{const url=new URL(req.url,'http://127.0.0.1');if(url.pathname!=='/oauth/callback'){res.writeHead(404);res.end();return}if(url.searchParams.get('state')!==state)throw Error('Authorization state mismatch.');if(url.searchParams.has('error'))throw Error('Google authorization was declined.');const code=url.searchParams.get('code');if(!code)throw Error('Missing authorization code.');
   const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({code,client_id:client.client_id,client_secret:client.client_secret,redirect_uri:redirect,grant_type:'authorization_code',code_verifier:verifier}),signal:AbortSignal.timeout(30000)});const data=await r.json();if(!r.ok||!data.refresh_token)throw Error('Google did not issue an offline refresh token. Retry consent with the correct channel.');
   const yt=new YouTube({clientId:client.client_id,clientSecret:client.client_secret,refreshToken:data.refresh_token});await yt.verifyChannel();res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end('NelyxGaming verified. Return to the terminal to finish saving GitHub secrets.');done.resolve(data.refresh_token);
  }catch(e){res.writeHead(400,{'Content-Type':'text/plain'});res.end('Authorization did not complete. Check the terminal.');done.reject(e)}
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const redirect=`http://127.0.0.1:${server.address().port}/oauth/callback`,url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 for(const [k,v] of Object.entries({client_id:client.client_id,redirect_uri:redirect,response_type:'code',scope:'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',access_type:'offline',prompt:'consent',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}))url.searchParams.set(k,v);
 console.log('Open this Google authorization link on THIS computer. Choose NelyxGaming:\n'+url.href);
 const timeout=setTimeout(()=>done.reject(Error('Authorization timed out after ten minutes.')),600000);let refresh;
 try{refresh=await result}finally{clearTimeout(timeout);server.close()}
 function secret(name,value){const r=spawnSync('gh',['secret','set',name,'--repo',repo],{input:value,encoding:'utf8',stdio:['pipe','ignore','ignore']});if(r.status!==0)throw Error(`Could not save ${name}. Run authorization again; no secret was printed.`);}
 // Rotation of OAuth credentials deliberately does not replace the ledger key.
 // Losing that key loses resumable receipts, so keep a private local backup.
 if(process.argv.includes('--initial-setup')){
  let key;try{key=(await readFile('.migration-private/youtube-state-key','utf8')).trim()}catch{key=randomBytes(32).toString('base64');await mkdir('.migration-private',{recursive:true});await writeFile('.migration-private/youtube-state-key',key,{mode:0o600})}
  const existing=spawnSync('gh',['secret','list','--repo',repo,'--json','name'],{encoding:'utf8'});if(existing.status!==0)throw Error('Could not inspect existing secret names.');if(JSON.parse(existing.stdout).some(v=>v.name==='HIGHLIGHTS_STATE_KEY'))throw Error('A ledger key already exists. Repeat without --initial-setup; never overwrite it.');secret('HIGHLIGHTS_STATE_KEY',key);
 }
 secret('YOUTUBE_CLIENT_ID',client.client_id);secret('YOUTUBE_CLIENT_SECRET',client.client_secret);secret('YOUTUBE_REFRESH_TOKEN',refresh);
 console.log('Verified NelyxGaming '+TARGET_CHANNEL+'. Upload credentials saved as repository secrets.');
 const dispatch=spawnSync('gh',['workflow','run','youtube-highlights.yml','--repo',repo],{stdio:'ignore'});console.log(dispatch.status===0?'Automatic highlight workflow started. Check GitHub Actions for the video receipts.':'Secrets saved. Start GoalForge automatic YouTube highlights from GitHub Actions.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
