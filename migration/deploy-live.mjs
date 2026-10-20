// Update-only deployment. It never imports records, freezes Netlify or resets data.
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {deploymentSettings,checkLiveResponses} from './deployment-guard.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
const configPath=join(root,'wrangler.ci.json');
try {
  const template=JSON.parse(await readFile('wrangler.jsonc','utf8'));
  const {config,url}=deploymentSettings(process.env,template);
  const get=async path=>{const response=await fetch(url+path,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Live target check failed: HTTP '+response.status);return response.json()};
  checkLiveResponses(...await Promise.all([get('/api/arena'),get('/api/account')]));
  await writeFile(configPath,JSON.stringify(config,null,2)+'\n',{mode:0o600});
  console.log('Updating verified live GoalForge: '+url);
  await new Promise((ok,fail)=>{
    const child=spawn(process.execPath,[join(root,'node_modules/wrangler/bin/wrangler.js'),'deploy','--config',configPath],{cwd:root,env:process.env,stdio:'inherit'});
    child.on('error',()=>fail(Error('Unable to launch Wrangler.')));
    child.on('close',code=>code===0?ok():fail(Error('Cloudflare deployment failed.')));
  });
  checkLiveResponses(...await Promise.all([get('/api/arena'),get('/api/account')]));
  console.log('Live API checks passed.');
} catch {
  console.error('Deployment stopped. Check migration readiness, repository settings, target availability and deployment permissions.');
  process.exitCode=1;
} finally {await unlink(configPath).catch(()=>{});}
