import {build} from 'esbuild';
import {writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
export const projectRoot=fileURLToPath(new URL('../../',import.meta.url));
export async function loadEngine(dir){
 await mkdir(dir,{recursive:true});const outfile=resolve(dir,'engine.mjs');
 await build({stdin:{contents:"export {events,footballTeams,score,penalties,lineupAt,defaults} from './lib/sim';export {matchHighlights} from './lib/highlights';export {makePlan,samplePlan} from './lib/motion';export {paintGround,ground} from './lib/pitch-renderer';export {matchWeather} from './lib/weather';export {matchStadium} from './lib/club-development';",resolveDir:projectRoot,loader:'ts'},outfile,bundle:true,format:'esm',platform:'node',logLevel:'silent'});
 return import(pathToFileURL(outfile).href);
}
