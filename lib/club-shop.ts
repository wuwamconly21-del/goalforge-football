// Server-owned fixed catalogue. Premium currency never buys player packs or ratings.
export const gemBundles=[{id:'g100',gems:100,cents:500},{id:'g250',gems:250,cents:1000},{id:'g600',gems:600,cents:2000}];
export const premiumItems=[{id:'aurora',slot:'theme',cost:100},{id:'royal',slot:'theme',cost:100},{id:'crimson',slot:'theme',cost:100},{id:'halo',slot:'roof',cost:150}];
export const stadiumItems=[{id:'checker',slot:'pitch',cost:200000},{id:'canopy',slot:'roof',cost:250000},{id:'warm',slot:'lights',cost:150000},{id:'chevron',slot:'tifo',cost:100000}];
export const stadiumDefaults={theme:'classic',roof:'open',pitch:'stripes',lights:'white',tifo:'none',seatColor:'#527a83'};
export const stadiumOwned=(team:any)=>team.stadiumInventory||[];
export class ShopError extends Error{constructor(public code:string,public status=400){super(code)}}
const fail=(code:string,status=400):never=>{throw new ShopError(code,status)};
export function stadiumAction(s:any,team:any,b:any,premium:string[]=[],now=Date.now(),rng=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296){
 if(!team||team.id!==b.teamId)fail('ownOnly',403);if(s.live&&[s.fixtures[s.live.index].home,s.fixtures[s.live.index].away].includes(team.id))fail('clubMatchLocked',403);
 const owned=new Set<string>(stadiumOwned(team));
 if(b.action==='stadiumItem'){const item=stadiumItems.find(i=>i.id===b.item);if(!item)fail('shopInvalid');if(!owned.has(item.id)){if(team.finance.balance<item.cost)fail('insufficientBudget');team.finance.balance-=item.cost;owned.add(item.id)}team.stadiumInventory=[...owned];return}
 if(b.action==='stadiumPack'){const available=stadiumItems.filter(i=>!owned.has(i.id));if(!available.length)fail('stadiumComplete');const today=new Date(now).toISOString().slice(0,10),x=team.stadiumDiscovery||{},used=x.day===today?x.used||0:0;if(used>=5)fail('scoutDailyLimit',429);if(x.at&&now-x.at<5000)fail('scoutCooldown',429);const free=x.freeDay!==today,cost=free?0:200000;if(team.finance.balance<cost)fail('insufficientBudget');const item=available[Math.floor(rng()*available.length)];team.finance.balance-=cost;team.stadiumInventory=[...owned,item.id];team.stadiumDiscovery={day:today,used:used+1,freeDay:free?today:x.freeDay,at:now,last:item.id};return}
 if(b.action!=='stadiumDesign')fail('shopInvalid');const design:any={};for(const [slot,fallback] of Object.entries(stadiumDefaults)){if(slot==='seatColor')continue;const id=b.design?.[slot]||fallback;if(id!==fallback&&!stadiumItems.some(i=>i.id===id&&i.slot===slot&&owned.has(id))&&!premiumItems.some(i=>i.id===id&&i.slot===slot&&premium.includes(id)))fail('shopNotOwned',403);design[slot]=id}const color=b.design?.seatColor||stadiumDefaults.seatColor;if(!/^#[0-9a-f]{6}$/i.test(color))fail('shopInvalid');design.seatColor=color;team.clubStadium={...(team.clubStadium||{name:team.name+' Arena',capacity:30000,location:s.competition?.country||'GoalForge'}),design};
}
