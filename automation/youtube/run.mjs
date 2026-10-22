import {mkdir,mkdtemp,readFile,appendFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {SOURCE,TARGET_CHANNEL,discover,enqueue,hash,metadata,backoff} from './core.mjs';
import {Ledger} from './ledger.mjs';
import {YouTube} from './youtube.mjs';
import {loadEngine} from './engine.mjs';
import {render} from './render.mjs';
export async function json(url,fetcher=fetch){const r=await fetcher(url,{signal:AbortSignal.timeout(30000),redirect:'error'});if(!r.ok)throw Error(`Public GoalForge feed unavailable (${r.status}). Queue retained.`);return r.json();}
export async function scan(engine,fetcher=fetch){
 const directory=await json(SOURCE+'/api/arena?public=1',fetcher);if(!Array.isArray(directory.rooms))throw Error('Invalid competition directory.');const jobs=[],errors=[];
 for(const {room} of directory.rooms){if(!/^[\da-f-]{36}$/i.test(room||''))continue;try{const d=await json(SOURCE+'/api/arena?public=1&room='+encodeURIComponent(room),fetcher);if(!d.state?.removedAt)jobs.push(...discover(room,d.state,engine));}catch{errors.push(room)}}
 return {jobs,errors};
}
export async function processJob(job,{engine,yt,ledger,dir,renderer=render,visibility='public',now=Date.now()}){
 if(job.status==='uploaded'||job.nextAttempt>now)return false;
 job.attempts++;job.status='processing';await ledger.save();
 const file=join(dir,job.id+'.mp4');
 const acknowledge=async receipt=>{const previous={...job};Object.assign(job,{status:'uploaded',videoId:receipt.id,actualVisibility:receipt.visibility,uploadedAt:Date.now()});delete job.snapshot;delete job.session;delete job.lastError;try{await ledger.save()}catch(e){for(const k of Object.keys(job))delete job[k];Object.assign(job,previous);throw e}return true;};
 try{
  if(job.session){
   // Query a previous session before spending time rendering again. Successful
   // uploads with a lost response can be acknowledged without sending bytes.
   let receipt;try{receipt=await yt.status(job.session,job.render.size)}catch(e){if(!e.uncertain)throw e;receipt=await yt.reconcile(job.id);if(!receipt){job.status='needs-review';job.lastError='Expired session could not be reconciled; retained to avoid a duplicate.';job.nextAttempt=now+24*3600000;await ledger.save();return false}}
   if(receipt.done)return await acknowledge(receipt);
  }
  const result=await renderer(job,engine,file);
  if(job.session&&(job.render.hash!==result.hash||job.render.size!==result.size))throw Error('Rendered bytes differ from saved upload session; held rather than corrupting the upload.');
  if(!job.session){job.render=result;job.meta=metadata(job,engine,visibility);job.session=await yt.start(job.meta,result.size);await ledger.save();}
  const receipt=await yt.upload(job.session,file,result.size);
  return await acknowledge(receipt);
 }catch(e){job.status='retry';job.lastError=String(e.message||'Broadcast failed').replace(/https?:\/\/\S+/g,'[redacted URL]').slice(0,240);job.nextAttempt=now+backoff(job.attempts);await ledger.save();return false;}
 finally{await rm(file,{force:true}).catch(()=>{})}
}
export async function main(env=process.env){
 const required=['GITHUB_TOKEN','GITHUB_REPOSITORY','YOUTUBE_CLIENT_ID','YOUTUBE_CLIENT_SECRET','YOUTUBE_REFRESH_TOKEN','HIGHLIGHTS_STATE_KEY'];const missing=required.filter(k=>!env[k]);if(missing.length)throw Error('Automatic uploads not activated. Configure repository secrets: '+missing.join(', '));
 const ledger=new Ledger({repo:env.GITHUB_REPOSITORY,token:env.GITHUB_TOKEN,key:env.HIGHLIGHTS_STATE_KEY}),yt=new YouTube({clientId:env.YOUTUBE_CLIENT_ID,clientSecret:env.YOUTUBE_CLIENT_SECRET,refreshToken:env.YOUTUBE_REFRESH_TOKEN});
 await yt.verifyChannel(); // Always verify the actual token, never trust a handle in a config file.
 const state=await ledger.load(),dir=await mkdtemp(join(tmpdir(),'goalforge-broadcast-'));let sourceErrors=[];
 try{
  const engine=await loadEngine(dir),found=await scan(engine);enqueue(state,found.jobs);sourceErrors=found.errors;
  const health=await json(SOURCE+'/api/health'),pkg=JSON.parse(await readFile('package.json','utf8'));
  if(health.version===pkg.version){let notes;try{const release=JSON.parse(await readFile('automation/youtube/release.json','utf8'));if(release.version===pkg.version)notes=release.notes;}catch{}
   enqueue(state,[{id:hash(['release-v1',TARGET_CHANNEL,pkg.version]),kind:'update',version:pkg.version,notes:notes||`GoalForge ${pkg.version} is now live. Open the game to explore the current version. Versi baharu sudah diterbitkan.`}]);}
  await ledger.save();let uploaded=0;const end=Date.now()+30*60000;
  for(const job of Object.values(state.jobs).sort((a,b)=>a.queuedAt-b.queuedAt)){
   if(Date.now()>end)break;
   if(await processJob(job,{engine,yt,ledger,dir,visibility:env.YOUTUBE_VISIBILITY||'public'}))uploaded++;
  }
  const jobs=Object.values(state.jobs),pending=jobs.filter(j=>j.status!=='uploaded'),summary=`## GoalForge → NelyxGaming\n\nUploaded this run: ${uploaded}\n\nPending/retry: ${pending.length}\n\nSource rooms temporarily unavailable: ${sourceErrors.length}\n\n`+jobs.filter(j=>j.status==='uploaded').slice(-10).map(j=>`- https://www.youtube.com/watch?v=${j.videoId} (${j.actualVisibility})`).join('\n');
  if(env.GITHUB_STEP_SUMMARY)await appendFile(env.GITHUB_STEP_SUMMARY,summary+'\n');console.log(JSON.stringify({uploaded,pending:pending.length,sourceErrors:sourceErrors.length,channel:TARGET_CHANNEL}));
  // Visible failure is preferable to silently pretending everything uploaded.
  if(sourceErrors.length||pending.some(j=>j.lastError))throw Error('Some broadcasts remain queued. See the encrypted ledger and the next scheduled retry.');
 }finally{await rm(dir,{recursive:true,force:true})}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e.message);process.exitCode=1});
