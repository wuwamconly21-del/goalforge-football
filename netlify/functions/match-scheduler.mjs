import {arenaStore} from '../store.mjs';
import {migrationLock} from '../migration-lock.mjs';
import {runSchedules} from '../../lib/scheduler.ts';
export default async function handler(){const db=arenaStore();if((await migrationLock(db))?.active)return new Response(null,{status:204});const result=await runSchedules(db);console.log('GoalForge schedule check',JSON.stringify(result));return new Response(null,{status:204})}
export const config={schedule:'* * * * *'};
