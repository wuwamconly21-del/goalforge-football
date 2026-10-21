import {scoutingView} from './scouting';
// Every transfer changes one competition record with the store's revision guard.
export const STARTING_BUDGET=30_000_000,MAX_RESERVES=7;
export class MarketError extends Error{constructor(public code:string){super(code)}}
const fail=(code:string):never=>{throw new MarketError(code)};
export const playerValue=(p:any)=>Math.round((350000+Math.pow(Math.max(0,p.rating-55),2)*11000)/50000)*50000;
export function ensureMarket(s:any){
 const season=s.season||1;
 s.market||={open:true,season,agents:[],listings:[],history:[],lockedTeams:[]};
 const market=s.market;market.lockedTeams||=[];
 if(market.season!==season||!market.agents.length){
  const first=['Adam','Rafael','Ibrahim','Hugo','Daniel','Amir','Leo','Kenji','Mateo','Ismail','Noah','Arif'];
  const last=['Rahman','Silva','Hassan','Costa','Azmi','Tanaka','Martin','Santos','Idris','Moreau','Lim','Alves'];
  // Stable stock across requests; a depleted market only refreshes next season.
  if(market.season!==season||!market.stockCreated){market.agents=first.map((name,i)=>({id:`scout-${season}-${i}`,name:`${name} ${last[(i+season)%last.length]}`,position:['GK','DEF','MID','FWD'][i%4],naturalPosition:['GK','DEF','MID','FWD'][i%4],rating:66+(i*7+season*3)%23}));market.stockCreated=true}
  market.season=season;
 }
 for(const team of s.teams){team.finance||={balance:STARTING_BUDGET};team.reserves||=[];for(const part of ['players','bench','reserves'])team[part].forEach((p:any,i:number)=>{p.id||=`${team.id}-${part}-${i}`;p.naturalPosition||=p.position})}
 market.listings=market.listings.filter((l:any)=>s.teams.some((t:any)=>t.id===l.seller&&[...t.bench,...t.reserves].some((p:any)=>p.id===l.playerId)));
 return market;
}
export const teamInMatch=(s:any,id:string)=>!!s.live&&[s.fixtures[s.live.index].home,s.fixtures[s.live.index].away].includes(id);
export function marketView(s:any,team:any){const market=ensureMarket(s);return {scouting:scoutingView(team),open:market.open!==false,balance:team?.finance.balance??0,locked:!!team&&teamInMatch(s,team.id),rosterLocked:!!team&&market.lockedTeams.includes(team.id),agents:market.agents.map((p:any)=>({...p,price:playerValue(p)})),listings:market.listings.map((l:any)=>{const seller=s.teams.find((v:any)=>v.id===l.seller),player=[...seller.bench,...seller.reserves].find((p:any)=>p.id===l.playerId);return {...l,player,sellerName:seller.name,sellerShort:seller.short,sellerBusy:teamInMatch(s,seller.id)}}),history:market.history.slice(0,40)}}
export function transferAction(s:any,own:any,b:any){
 if(!own||b.teamId!==own.id)fail('ownOnly');
 const market=ensureMarket(s);
 if(teamInMatch(s,own.id))fail('marketMatchLocked');
 const lock=(id:string)=>{if(!market.lockedTeams.includes(id))market.lockedTeams.push(id)};
 if(b.action==='lineupSwap'){
  const part=['bench','reserves'].includes(b.part)?b.part:null,index=Number(b.slot),source=part&&own[part].findIndex((p:any)=>p.id===b.playerId);
  if(!part||source===false||source===null||source<0||!Number.isInteger(index)||index<0||index>10)fail('marketUnavailable');
  if(market.listings.some((l:any)=>l.playerId===b.playerId))fail('cancelBeforeLineup');
  const player=own[part][source],old=own.players[index];if((index===0)!==(player.naturalPosition==='GK'))fail('keeperRequired');
  own.players[index]={...player,position:old.position};own[part][source]={...old,position:old.naturalPosition};lock(own.id);return;
 }
 if(b.action==='cancelListing'){const listing=market.listings.find((l:any)=>l.id===b.listingId&&l.seller===own.id);if(!listing)fail('marketUnavailable');market.listings=market.listings.filter((l:any)=>l.id!==listing.id);return}
 if(market.open===false)fail('marketClosed');
 if(b.action==='listPlayer'){
  const player=[...own.bench,...own.reserves].find((p:any)=>p.id===b.playerId),price=Number(b.price);
  if(!player)fail('sellReservesOnly');if(!Number.isSafeInteger(price)||price<250000||price>50000000)fail('invalidPrice');
  if(market.listings.some((l:any)=>l.playerId===player.id))fail('alreadyListed');
  market.listings.push({id:crypto.randomUUID(),seller:own.id,playerId:player.id,price,created:Date.now()});lock(own.id);return;
 }
 if(b.action!=='buyPlayer')fail('marketUnavailable');
 if(own.reserves.length>=MAX_RESERVES)fail('reservesFull');
 let player:any,price:number,seller:any=null,listing:any=null;
 if(b.listingId){listing=market.listings.find((l:any)=>l.id===b.listingId);if(!listing)fail('marketUnavailable');if(listing.seller===own.id)fail('cannotBuyOwn');seller=s.teams.find((t:any)=>t.id===listing.seller);if(!seller||teamInMatch(s,seller.id))fail('marketMatchLocked');player=[...seller.bench,...seller.reserves].find((p:any)=>p.id===listing.playerId);price=listing.price}
 else{player=market.agents.find((p:any)=>p.id===b.playerId);if(!player)fail('marketUnavailable');price=playerValue(player)}
 if(!player)fail('marketUnavailable');if(own.finance.balance<price)fail('insufficientBudget');
 // Prices and ownership are resolved entirely on the server, never from the client.
 own.finance.balance-=price;own.reserves.push({...player,position:player.naturalPosition||player.position});lock(own.id);
 if(seller){seller.finance.balance+=price;for(const part of ['bench','reserves'])seller[part]=seller[part].filter((p:any)=>p.id!==player.id);market.listings=market.listings.filter((l:any)=>l.id!==listing.id);lock(seller.id)}else market.agents=market.agents.filter((p:any)=>p.id!==player.id);
 market.history.unshift({id:crypto.randomUUID(),player:player.name,playerId:player.id,rating:player.rating,from:seller?.name||null,to:own.name,price,season:s.season,at:Date.now()});market.history=market.history.slice(0,200);
}
