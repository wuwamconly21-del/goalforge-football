export async function migrationLock(db){const row=await db.get('__migration_lock');return row?JSON.parse(row.data):null}
export const maintenanceResponse=lock=>Response.json({error:'GoalForge is moving to Cloudflare. Please retry shortly.',...(lock.target?{migrationTarget:lock.target}:{})},{status:503,headers:{'Cache-Control':'no-store','Retry-After':'60'}});
