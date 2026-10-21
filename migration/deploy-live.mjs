// Update-only deployment. It never imports records, freezes Netlify or resets data.
import {readFile,writeFile,unlink,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {deploymentSettings,checkLiveResponses,verifiedRelease} from './deployment-guard.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
const configPath=join(root,'wrangler.ci.json');
try {
  const template=JSON.parse(await readFile('wrangler.jsonc','utf8'));
  const release=JSON.parse(await readFile('migration/live-release.json','utf8'));verifiedRelease(template,release);
  const {config,url}=deploymentSettings(process.env,template);
  const get=async path=>{const response=await fetch(url+path,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Live target check failed: HTTP '+response.status);return response.json()};
  if(config.name!==release.worker||url!==release.url)throw Error('Configured deployment must match the verified release.');
  checkLiveResponses(...await Promise.all([get('/api/arena'),get('/api/account')]));
  if(process.env.GITHUB_SHA){const head=await new Promise((ok,fail)=>{const child=spawn('git',['ls-remote','origin','refs/heads/main'],{stdio:['ignore','pipe','ignore']});let text='';child.stdout.on('data',v=>text+=v);child.on('error',()=>fail(Error('Branch check failed.')));child.on('close',code=>code===0?ok(text.split(/\s/)[0]):fail(Error('Branch check failed.')))});if(head!==process.env.GITHUB_SHA)throw Error('A newer main commit exists.');}
  await writeFile(configPath,JSON.stringify(config,null,2)+'\n',{mode:0o600});
  console.log('Updating verified live GoalForge: '+url);
  await new Promise((ok,fail)=>{
    const child=spawn(process.execPath,[join(root,'node_modules/wrangler/bin/wrangler.js'),'deploy','--config',configPath],{cwd:root,env:process.env,stdio:'inherit'});
    child.on('error',()=>fail(Error('Unable to launch Wrangler.')));
    child.on('close',code=>code===0?ok():fail(Error('Cloudflare deployment failed.')));
  });
  checkLiveResponses(...await Promise.all([get('/api/arena'),get('/api/account')]));
  const pkg=JSON.parse(await readFile('package.json','utf8'));let health;
  for(let i=0;i<6;i++){try{health=await get('/api/health');if(health.version===pkg.version)break}catch{}if(i<5)await new Promise(r=>setTimeout(r,1000))}
  if(health?.version!==pkg.version)throw Error('New application version was not confirmed.');
  const built=await readFile('netlify-dist/index.html','utf8'),asset=built.match(/src="([^"]+\.js)"/)?.[1],home=await fetch(url,{signal:AbortSignal.timeout(30000)});
  if(!asset||!home.ok||!(await home.text()).includes(asset))throw Error('New frontend assets were not confirmed.');
  console.log('Live API and frontend checks passed. Version: '+health.version);
  const audioFiles=(await readdir('netlify/public/audio')).filter(name=>name.endsWith('.mp3'));
  if(audioFiles.length!==10)throw Error('Expected ten broadcast recordings.');
  await Promise.all(audioFiles.map(async name=>{const [response,local]=await Promise.all([fetch(url+'/audio/'+name,{signal:AbortSignal.timeout(30000)}),readFile('netlify/public/audio/'+name)]);if(!response.ok||!response.headers.get('content-type')?.startsWith('audio/'))throw Error('Audio response failed.');if(!local.equals(Buffer.from(await response.arrayBuffer())))throw Error('Audio bytes differ.');}));
  console.log('Live audio checks passed. MP3 files: '+audioFiles.length);
} catch {
  console.error('Deployment stopped. Check migration readiness, repository settings, target availability and deployment permissions.');
  process.exitCode=1;
} finally {await unlink(configPath).catch(()=>{});}
