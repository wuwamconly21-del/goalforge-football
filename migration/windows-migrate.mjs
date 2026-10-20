import {access, mkdir, readFile, writeFile, copyFile, rename, chmod} from 'node:fs/promises';
import {resolve, join, delimiter} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {randomBytes, createHash} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
import {cutover} from './cutover.mjs';

class MigrationError extends Error {}
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
process.chdir(root);
const siteID='fca09e0c-d134-4b45-b1f1-43f95eb55e33';
const source='https://goalforge-football-live.netlify.app';
const privateDir=join(root,'.migration-private','windows');
const statePath=join(privateDir,'state.json');
const wrangler=join(root,'node_modules','wrangler','bin','wrangler.js');
let netlify, env={...process.env,NETLIFY_SITE_ID:siteID,NETLIFY_AGENT:'codex'};
let state={phase:'new'}, token, originalConfig, originalToml;
const note=message=>console.log('\n'+message);
const exists=async path=>{try{await access(path);return true}catch{return false}};
const readJSON=async path=>JSON.parse(await readFile(path,'utf8'));
const savePhase=async phase=>{state.phase=phase;await writeFile(statePath,JSON.stringify(state,null,2),{mode:0o600})};

// Credentials are passed in process environment or stdin, never command arguments.
function run(script,args=[],{input,capture=false,commandEnv=env}={}) {
  return new Promise((ok,fail)=>{
    const child=spawn(process.execPath,[script,...args],{cwd:root,env:commandEnv,
      stdio:[input===undefined?'inherit':'pipe',capture?'pipe':'inherit',capture?'pipe':'inherit']});
    let output='';
    if(capture){child.stdout.on('data',v=>output+=v);child.stderr.on('data',()=>{});}
    if(input!==undefined){child.stdin.on('error',()=>{});child.stdin.end(input);}
    child.on('error',()=>fail(MigrationError('Program tidak dapat dibuka. Semak pemasangan Node.js.')));
    child.on('close',code=>code===0?ok(output):fail(MigrationError('Langkah gagal: '+script.split(/[\\/]/).at(-1)+' (exit '+code+').')));
  });
}
const cf=(args,options)=>run(wrangler,args,options);
const script=(name,args=[])=>run(join(root,'migration',name),args,{capture:true});
async function getJSON(url,options={}) {
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw MigrationError('Permintaan gagal (HTTP '+response.status+').');
  return response.json();
}
function validTarget(value,name){
  const u=new URL(value);
  if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash||
      !u.hostname.startsWith(name+'.')||!u.hostname.endsWith('.workers.dev'))throw MigrationError('Alamat Workers tidak sah.');
  return u.origin;
}
async function login() {
  if(Number(process.versions.node.split('.')[0])<24)throw MigrationError('Node.js 24 diperlukan.');
  // npm exec supplies its isolated package location through PATH on both OSes.
  for(const bin of (process.env.PATH||'').split(delimiter)){
    const base=resolve(bin,'..');
    const candidate=join(base,'netlify-cli','bin','run.js');
    if(await exists(candidate)){netlify=candidate;break;}
  }
  if(!netlify)throw MigrationError('Buka START-MIGRATION-WINDOWS.cmd, bukan fail JavaScript ini.');
  const configModule=resolve(netlify,'../../../@netlify/dev-utils/dist/main.js');
  const {getGlobalConfigStore}=await import(pathToFileURL(configModule).href);
  const readToken=async()=>{const cfg=await getGlobalConfigStore();return cfg.get(`users.${cfg.get('userId')}.auth.token`)};
  let auth=await readToken();
  if(!auth){note('Log masuk Netlify pada pelayar laptop.');await run(netlify,['login']);auth=await readToken();}
  if(!auth)throw MigrationError('Log masuk Netlify belum lengkap.');
  env.NETLIFY_AUTH_TOKEN=auth;
  // Validate access to this exact site before changing either provider.
  const {getStore}=await import('@netlify/blobs');
  const db=getStore({name:'goalforge-football',siteID,token:auth,consistency:'strong'});
  await db.getWithMetadata('__password_admin',{type:'json',consistency:'strong'}).then(r=>{if(!r)throw MigrationError('Rekod admin tidak dijumpai. Semak akaun Netlify.')});
  let who;
  try{who=JSON.parse(await cf(['whoami','--json'],{capture:true}));}catch{who={loggedIn:false};}
  if(!who.loggedIn){note('Log masuk Cloudflare pada pelayar laptop.');await cf(['login']);who=JSON.parse(await cf(['whoami','--json'],{capture:true}));}
  const accounts=who.accounts||[];
  if(!who.loggedIn||!accounts.length)throw MigrationError('Log masuk Cloudflare belum lengkap.');
  let choice=0;
  if(accounts.length>1){
    accounts.forEach((a,i)=>console.log(`${i+1}. ${a.name} (${a.id})`));
    const prompt=createInterface({input:process.stdin,output:process.stdout});
    try{choice=Number(await prompt.question('Pilih akaun Cloudflare (nombor): '))-1;}finally{prompt.close();}
    if(!Number.isInteger(choice)||!accounts[choice])throw MigrationError('Pilihan akaun tidak sah.');
  }
  return accounts[choice].id;
}
async function safeSource() {
  const lock=JSON.parse(await script('netlify-lock.mjs',['status']));
  if(lock.active)throw MigrationError('Netlify masih dikunci oleh migrasi terdahulu. Semak .migration-private/windows/state.json sebelum sambung.');
  const directory=await getJSON(source+'/api/arena');
  if(!Array.isArray(directory.rooms))throw MigrationError('Direktori pertandingan tidak sah.');
  if(directory.rooms.some(r=>r.live&&r.status!=='fulltime'))throw MigrationError('Tunggu semua perlawanan tamat dahulu. Kemudian buka pelancar semula.');
}
async function prepare() {
  const account=await login();
  await safeSource();
  originalConfig=await readFile(join(root,'wrangler.jsonc'),'utf8');
  originalToml=await readFile(join(root,'netlify.toml'),'utf8');
  await writeFile(join(privateDir,'wrangler.before.jsonc'),originalConfig,{mode:0o600});
  await writeFile(join(privateDir,'netlify.before.toml'),originalToml,{mode:0o600});
  state.name='goalforge-football-'+randomBytes(4).toString('hex');
  const config=JSON.parse(originalConfig);
  config.name=state.name;config.account_id=account;
  config.main='cloudflare/migration-worker.ts';config.vars.MIGRATION_MODE='import';
  await writeFile(join(root,'wrangler.jsonc'),JSON.stringify(config,null,2)+'\n');
  await savePhase('preparing-target');
  note('Menyediakan Workers baharu. Netlify masih aktif.');
  const deployment=await cf(['deploy'],{capture:true});
  const url=deployment.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/gi)?.find(u=>u.includes(state.name+'.'));
  if(!url)throw MigrationError('Alamat workers.dev tidak dijumpai. Aktifkan workers.dev pada akaun Cloudflare dahulu.');
  state.target=validTarget(url,state.name);
  token=randomBytes(32).toString('hex');
  await writeFile(join(privateDir,'import-token.txt'),token,{mode:0o600});
  await cf(['secret','put','MIGRATION_TOKEN'],{input:token+'\n',capture:true});
  env.GOALFORGE_MIGRATION_URL=state.target;env.GOALFORGE_MIGRATION_TOKEN=token;
  const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
  const status=await getJSON(state.target+'/status',{headers});
  if(status.mode!=='import'||status.rooms.length)throw MigrationError('Workers sasaran bukan ruang import kosong.');
  const probe={id:'__migration_probe',secret:'',data:JSON.stringify({test:true}),revision:0};
  const imported=await getJSON(state.target+'/import',{method:'POST',headers,body:JSON.stringify(probe)});
  const checked=await getJSON(state.target+'/verify?id=__migration_probe',{headers});
  const hash=createHash('sha256').update(JSON.stringify(probe)).digest('hex');
  if(imported.hash!==hash||checked.hash!==hash)throw MigrationError('Ujian simpanan Cloudflare gagal.');
  await script('export-netlify.mjs',[join(privateDir,'preflight')]);
  await safeSource();
  await savePhase('target-ready');
}
async function snapshot() {
  note('Membuat dua salinan data dan membandingkan checksum...');
  const final=join(privateDir,'final'),check=join(privateDir,'final-check');
  await script('export-netlify.mjs',[final]);
  await script('export-netlify.mjs',[check]);
  const a=await readJSON(join(final,'manifest.json')),b=await readJSON(join(check,'manifest.json'));
  if(a.hash!==b.hash)throw MigrationError('Data sumber masih berubah. Migrasi dibatalkan.');
  state.records=a.records.length;
  state.rooms=a.records.filter(r=>/^[0-9a-f-]{36}$/i.test(r.id)).map(r=>r.id).sort();
  await savePhase('snapshot-verified');
}
async function activate() {
  note('Semua checksum sepadan. Mengaktifkan GoalForge di Cloudflare...');
  const cfg=await readJSON(join(root,'wrangler.jsonc'));
  cfg.main='cloudflare/worker.ts';cfg.vars.MIGRATION_MODE='live';
  await writeFile(join(root,'wrangler.jsonc'),JSON.stringify(cfg,null,2)+'\n');
  await cf(['deploy'],{capture:true});
}
async function verifyLive() {
  const [directory,account]=await Promise.all([getJSON(state.target+'/api/arena'),getJSON(state.target+'/api/account')]);
  if(!Array.isArray(directory.rooms)||!account.organizerConfigured)throw MigrationError('Semakan laman Cloudflare gagal. Netlify kekal dikunci untuk elak dua salinan berubah.');
  // The public directory intentionally returns only the newest 40 rooms.
  const expected=state.rooms;
  if(expected.length<=40&&JSON.stringify(directory.rooms.map(r=>r.room).sort())!==JSON.stringify(expected))throw MigrationError('Senarai pertandingan Cloudflare tidak sepadan.');
  const html=await fetch(state.target,{signal:AbortSignal.timeout(30000)});
  if(!html.ok||!(await html.text()).includes('id="root"'))throw MigrationError('Halaman Cloudflare belum tersedia.');
}
async function redirect() {
  // Keep API routes on the guarded source; old open tabs receive maintenance.
  // Only browser page navigation moves to Cloudflare, preserving :splat/query.
  const needle='  to = "/index.html"\n  status = 200';
  if(!originalToml.includes(needle))throw MigrationError('Konfigurasi redirect Netlify berubah.');
  const toml=originalToml.replace(needle,`  to = "${state.target}/:splat"\n  status = 302\n  force = true`);
  await writeFile(join(root,'netlify.toml'),toml);
  await mkdir(join(root,'.netlify'),{recursive:true});
  await writeFile(join(root,'.netlify','state.json'),JSON.stringify({siteId:siteID}));
  // Do not continue spending scheduled executions on the archived source.
  const scheduler=join(root,'netlify','functions','match-scheduler.mjs');
  const backup=join(privateDir,'match-scheduler.mjs');
  if(await exists(scheduler))await rename(scheduler,backup);
  try{
    await run(netlify,['deploy','--no-build','--dir','netlify-dist','--functions','netlify/functions','--prod','--skip-functions-cache','--message','GoalForge verified Cloudflare migration','--json'],{capture:true});
  }finally{if(await exists(backup))await rename(backup,scheduler);}
  const response=await fetch(source,{redirect:'manual',signal:AbortSignal.timeout(30000)});
  if(response.status!==302||new URL(response.headers.get('location')||'',source).origin!==state.target)throw MigrationError('Cloudflare aktif tetapi redirect Netlify belum disahkan.');
  await cf(['secret','delete','MIGRATION_TOKEN'],{capture:true,input:'y\n'});
  await writeFile(join(privateDir,'import-token.txt'),'REMOVED AFTER CUTOVER\n',{mode:0o600});
}
async function main() {
  await mkdir(privateDir,{recursive:true,mode:0o700});await chmod(privateDir,0o700);
  if(await exists(statePath)){
    const previous=await readJSON(statePath);
    if(previous.phase==='complete'){note('Migrasi sudah selesai: '+previous.target);return;}
    if(['activation-attempted','cloudflare-live','source-lock-check-required'].includes(previous.phase)){
      note('Migrasi terdahulu perlu disemak. Fasa: '+previous.phase+'\nSasaran: '+(previous.target||'belum diketahui'));
      throw MigrationError('Jangan buka semula penulisan Netlify sehingga status Cloudflare disahkan. Kongsi fasa dan URL sahaja untuk bantuan.');
    }
  }
  note('Login hanya pada pelayar sendiri. Tiada token perlu dihantar dalam chat.\nNetlify akan masuk maintenance sekitar 1-3 minit selepas Cloudflare bersedia.');
  await cutover({prepare,savePhase,
    freeze:async()=>{await savePhase('freezing');note('Mengunci perubahan Netlify buat sementara...');await script('netlify-lock.mjs',['freeze',state.target]);},
    drain:async()=>{for(let seconds=60;seconds>0;seconds-=10){console.log(`Menunggu permintaan lama selesai: ${seconds}s`);await new Promise(r=>setTimeout(r,10000));}},
    snapshot,
    importAndVerify:async()=>{note('Mengimport dan menyemak setiap rekod...');await script('import-cloudflare.mjs',[join(privateDir,'final')]);await savePhase('import-verified');},
    activate,verifyLive,redirect,
    unfreeze:async()=>{await script('netlify-lock.mjs',['unfreeze']);note('Netlify telah dibuka semula. Migrasi belum diaktifkan.');}
  });
  note('SELESAI: '+state.target+'\nSemua '+state.records+' rekod disemak. Login admin menggunakan kata laluan sedia ada.');
  note('Simpan folder .migration-private sebagai backup peribadi. Jangan kongsi kandungannya.');
}
main().catch(error=>{
  // SDK exceptions can include request headers. Never print raw exceptions.
  if(error instanceof MigrationError)console.error('\n'+error.message);
  console.error('\nMigrasi berhenti pada fasa: '+state.phase);
  if(state.target)console.error('Sasaran Cloudflare: '+state.target);
  console.error('Jika fasa source-restored, laman Netlify telah dibuka semula.');
  console.error('Jika activation-attempted atau cloudflare-live, jangan buka semula Netlify; semak sasaran dahulu.');
  console.error('Semak login, sambungan internet dan kebenaran akaun. Kongsi fasa terakhir sahaja untuk bantuan.');
  process.exitCode=1;
});
