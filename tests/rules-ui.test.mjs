import assert from 'node:assert/strict';import {build} from 'esbuild';import {mkdtempSync,rmSync,mkdirSync} from 'node:fs';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
import {load,cleanup} from './load.mjs';
mkdirSync('.migration-private',{recursive:true});const dir=mkdtempSync(join(process.cwd(),'.migration-private/rules-ui-'));
try{
 await build({entryPoints:['tests/rules-ui-entry.tsx'],outfile:join(dir,'render.mjs'),bundle:true,format:'esm',platform:'node',external:['react','react-dom/server'],logLevel:'silent'});
 const {render}=await import(pathToFileURL(join(dir,'render.mjs'))),{events}=await load('sim'),{presetTeams}=await load('competitions');
 const s={teams:presetTeams('my'),knockoutRule:'penalties'},f={home:s.teams[0].id,away:s.teams[1].id,mode:'rating',engine:4,knockout:true,tiebreak:'penalties',seed:1};
 while(!events({...s},f).some(e=>e.type==='penaltykick'))f.seed++;
 const kicks=events({...s},f).filter(e=>e.type==='penaltykick'),before=render('shootout',{s,f,m:{time:kicks[0].time-1,status:'penalties'}});
 assert.equal((before.match(/class="pending"/g)||[]).length,10);assert(!before.includes('class="scored"'));assert(!before.includes('class="missed"'));assert(!before.includes('Wins the shoot-out'));
 const first=render('shootout',{s,f,m:{time:kicks[0].time+.1,status:'penalties'}});assert.equal((first.match(/class="(?:scored|missed)"/g)||[]).length,1,'only completed kicks are revealed');
 const final=render('shootout',{s,f,m:{time:kicks.at(-1).time+1,status:'penalties'}},'ms');assert(final.includes('Menang penentuan penalti'));
 const viewer=render('rules',{s,admin:false,act:()=>{}});assert(viewer.includes('disabled=""'));assert(!viewer.includes('type="submit"'));
 const admin=render('rules',{s,admin:true,act:()=>{}});assert(admin.includes('type="submit"'));
 globalThis.location=new URL('https://goal.test/');const access=render('admin',{close:()=>{},notify:()=>{}},'ms');assert(access.includes('https://goal.test/?admin=1'));assert(!access.includes('?invite='),'no shared public invitation token');
 console.log('PASS: shoot-out UI hides future kicks, translates the winner, separates viewer settings and exposes the admin sign-in link without invitation secrets.');
}finally{cleanup();rmSync(dir,{recursive:true,force:true})}
