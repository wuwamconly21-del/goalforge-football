import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {encrypt,decrypt,discover,enqueue,metadata,TARGET_CHANNEL,hash,segments} from './core.mjs';
import {loadEngine,projectRoot} from './engine.mjs';
import {YouTube} from './youtube.mjs';
import {Ledger} from './ledger.mjs';
import {processJob,scan} from './run.mjs';
import {timeline,painter,render} from './render.mjs';
process.chdir(projectRoot);
const root=await mkdtemp(join(tmpdir(),'goalforge-youtube-test-'));
const engine=await loadEngine(root),teams=engine.defaults().slice(0,2),fixture={home:teams[0].id,away:teams[1].id,seed:5,engine:5,weatherModel:1,mode:'rating',done:true},state={name:'Test Cup',season:2,teams,fixtures:[fixture],history:[],weatherPolicy:'rain',stadium:{name:'Test Ground'},sponsorRequests:[{contact:'private'}],managerClaims:[{proof:'secret'}]};
const job=()=>structuredClone({...discover('11111111-1111-4111-8111-111111111111',state,engine)[0],status:'queued',attempts:0,nextAttempt:0});
test.after(async()=>{await rm(root,{recursive:true,force:true})});
test('discover all confirmed current/archive fixtures; stable IDs, frozen rosters and exact legacy outcomes',()=>{
 const s={...state,fixtures:[fixture,{...fixture,seed:9,done:false}],history:[{...state,season:1,fixtures:[fixture]}]};const jobs=discover('room',s,engine);assert.equal(jobs.length,2);assert.notEqual(jobs[0].id,jobs[1].id);assert.equal(discover('room',s,engine)[0].id,jobs[0].id);assert.deepEqual(engine.events(jobs[1].snapshot,jobs[1].snapshot.fixtures[0]),engine.events(s,fixture));assert(!JSON.stringify(jobs).includes('private'));assert.equal(discover('room',{...s,removedAt:1},engine).length,0);
 const ledger={jobs:{}};assert.equal(enqueue(ledger,jobs),2);assert.equal(enqueue(ledger,jobs),0);assert.equal(Object.keys(ledger.jobs).length,2);
});
test('AES-GCM ledger encrypts sessions/snapshots; wrong key and tampering never reset receipts',()=>{
 const key=randomBytes(32).toString('base64'),state={jobs:{abc:{session:'https://www.googleapis.com/upload/youtube/v3/videos?secret=hello',snapshot:{proof:'never public'}}}};const data=encrypt(state,key);assert(!data.includes('hello'));assert.deepEqual(decrypt(data,key),state);assert.throws(()=>decrypt(data,randomBytes(32).toString('base64')));let d=JSON.parse(data);d.tag=Buffer.alloc(16).toString('base64');assert.throws(()=>decrypt(JSON.stringify(d),key));
});
test('all highlight moments preserved chronologically and descriptions retain marker; no daily cap',()=>{
 const j=job(),moments=segments(j.snapshot,engine),tl=timeline(j,engine).filter(x=>x.type==='moment');assert.equal(tl.length,moments.length);assert(moments.length>0);assert.deepEqual(tl.map(x=>x.moment.id),moments.map(x=>x.id));const meta=metadata(j,engine);assert.equal(meta.status.privacyStatus,'public');assert.equal(meta.status.selfDeclaredMadeForKids,false);assert(meta.snippet.description.includes(j.id));assert(meta.snippet.description.length<=5000);assert(meta.snippet.title.length<=100);
});
test('authorization verifies actual channel and handle before publishing',async()=>{
 let calls=0;const yt=new YouTube({fetcher:async()=>{calls++;return Response.json({items:[{id:'wrong-channel'}]})}});yt.token='test';yt.until=Infinity;await assert.rejects(()=>yt.verifyChannel(),/Wrong YouTube/);assert.equal(calls,1);const good=new YouTube({fetcher:async()=>Response.json({items:[{id:TARGET_CHANNEL}]})});good.token='test';good.until=Infinity;await good.verifyChannel();
});
test('resumable upload queries progress then sends exactly remaining bytes',async()=>{
 const file=join(root,'resume.mp4');await writeFile(file,Buffer.from('abcdefghij'));const seen=[];const yt=new YouTube({fetcher:async(url,options)=>{seen.push(options);return seen.length===1?new Response(null,{status:308,headers:{Range:'bytes=0-3'}}):Response.json({id:'abcdefghijk',snippet:{channelId:TARGET_CHANNEL},status:{privacyStatus:'public'}},{status:201})}});yt.token='test';yt.until=Infinity;const r=await yt.upload('https://www.googleapis.com/upload/youtube/v3/videos?upload_id=test',file,10);assert.equal(r.id,'abcdefghijk');assert.equal(seen[1].headers['Content-Range'],'bytes 4-9/10');assert.equal(seen[1].body.toString(),'efghij');assert.throws(()=>yt.validSession('https://evil.example/steal'));
});
test('completed session recovers lost success response without rendering/uploading again',async()=>{
 const j=job();j.session='saved';j.render={size:10,hash:'x'};let saves=0;const yt={status:async()=>({done:true,id:'abcdefghijk',visibility:'public'})},ledger={save:async()=>{saves++}};await processJob(j,{engine,yt,ledger,dir:root,renderer:()=>{throw Error('must not render')}});assert.equal(j.status,'uploaded');assert.equal(j.videoId,'abcdefghijk');assert(!j.snapshot&&!j.session);assert.equal(saves,2);assert.equal(await processJob(j,{engine,yt,ledger,dir:root}),false);
});
test('failed receipt checkpoint retains original session and snapshot for recovery',async()=>{
 const j=job();j.session='saved';j.render={size:10,hash:'x'};let n=0;const ledger={save:async()=>{if(++n===2)throw Error('checkpoint offline')}};await processJob(j,{engine,yt:{status:async()=>({done:true,id:'abcdefghijk'})},ledger,dir:root});assert.equal(j.status,'retry');assert.equal(j.session,'saved');assert(j.snapshot);assert(j.nextAttempt>Date.now());
});
test('expired uncertain sessions reconcile existing marker or remain queued without duplicate publication',async()=>{
 const j=job();j.session='expired';j.render={size:10};let uploads=0;const yt={status:async()=>{const e=Error('expired');e.uncertain=true;throw e},reconcile:async()=>null,start:async()=>{uploads++}};await processJob(j,{engine,yt,ledger:{save:async()=>{}},dir:root});assert.equal(j.status,'needs-review');assert.equal(uploads,0);assert(j.snapshot);assert(j.nextAttempt>Date.now());
});
test('render/session hash mismatch never appends corrupt bytes and failed jobs remain queued',async()=>{
 const j=job();j.session='saved';j.render={size:10,hash:'old'};let sends=0;await processJob(j,{engine,yt:{status:async()=>({done:false,offset:0}),upload:()=>{sends++}},ledger:{save:async()=>{}},dir:root,renderer:async()=>({size:11,hash:'changed'})});assert.equal(sends,0);assert.equal(j.status,'retry');assert(j.lastError.includes('bytes differ'));assert(j.snapshot);
});
test('session checkpoint happens before sending bytes; successful receipt is durable',async()=>{
 const j=job(),order=[];await processJob(j,{engine,yt:{start:async()=>{order.push('start');return 'session'},upload:async()=>{order.push('upload');return {id:'abcdefghijk',visibility:'public'}}},ledger:{save:async()=>{order.push('save')}},dir:root,renderer:async()=>({size:10,hash:'x'})});assert.deepEqual(order,['save','start','save','upload','save']);assert.equal(j.status,'uploaded');
});
test('room fetch failure preserves other matches for discovery',async()=>{
 const found=await scan(engine,async url=>url.endsWith('public=1')?Response.json({rooms:[{room:'11111111-1111-4111-8111-111111111111'},{room:'22222222-2222-4222-8222-222222222222'}]}):url.includes('222222')?new Response(null,{status:503}):Response.json({state}));assert.equal(found.jobs.length,1);assert.equal(found.errors.length,1);
});
test('corrupt encrypted remote ledger is refused rather than treated as a new empty queue',async()=>{
 const ledger=new Ledger({repo:'test/test',token:'test',key:randomBytes(32).toString('base64'),fetcher:async url=>Response.json(url.includes('/git/ref/')?{object:{sha:'x'}}:{sha:'y',content:Buffer.from('broken').toString('base64')})});await assert.rejects(()=>ledger.load());
});
test('native renderer exports real playable video with all moments, audio and deterministic rerender bytes',async()=>{
 assert.equal(spawnSync('ffmpeg',['-version']).status,0,'FFmpeg is required for export verification');const j=job(),out=join(root,'smoke.mp4'),a=await render(j,engine,out,{fps:2}),bytes=await readFile(out),b=await render(j,engine,out,{fps:2});assert.equal(a.hash,b.hash);assert.equal(a.size,b.size);assert(a.size>10000);assert.equal(a.moments,segments(j.snapshot,engine).length);const probe=spawnSync('ffprobe',['-v','error','-show_streams','-of','json',out],{encoding:'utf8'});assert.equal(probe.status,0);const streams=JSON.parse(probe.stdout).streams;assert(streams.some(x=>x.codec_type==='audio'));assert(streams.some(x=>x.codec_type==='video'&&x.width===1280&&x.height===720));
 const p=await painter(j,engine),m=timeline(j,engine).find(x=>x.type==='moment');p.draw(m,Math.min(4,m.duration),12);await writeFile('.migration-private/youtube-preview.png',p.canvas.toBuffer('image/png'));
});
