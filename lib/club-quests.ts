import {ShopError} from './club-shop';
const DAY=86400000;
export const questDay=(now=Date.now())=>new Date(now+28800000).toISOString().slice(0,10);
const yesterday=(day:string)=>new Date(Date.parse(day)-DAY).toISOString().slice(0,10);
const weekOf=(day:string)=>{const n=new Date(day).getUTCDay();return new Date(Date.parse(day)-((n+6)%7)*DAY).toISOString().slice(0,10)};
export const dailyGoals=[{id:'training',target:1,gf:100000},{id:'tactics',target:1,gf:100000},{id:'practice',target:1,gf:100000}];
export const weeklyGoals=[{id:'training',target:5,gf:250000},{id:'practice',target:3,gf:250000},{id:'scouting',target:3,gf:250000}];
const fresh=()=>({tickets:0,checkins:0,streak:0});
function current(team:any,now:number){const x=structuredClone(team.clubQuests||fresh()),day=questDay(now),week=weekOf(day);if(x.daily?.key!==day)x.daily={key:day,counts:{},claimed:[],bonus:false};if(x.weekly?.key!==week)x.weekly={key:week,counts:{},claimed:[],bonus:false};return x}
export function questView(team:any,now=Date.now()){const x=current(team,now),day=questDay(now);return {tickets:x.tickets||0,checkins:x.checkins||0,streak:x.lastCheckin===day||x.lastCheckin===yesterday(day)?x.streak||0:0,checkedIn:x.lastCheckin===day,resetAt:Date.parse(day)+DAY-28800000,daily:dailyGoals.map(g=>({...g,count:Math.min(g.target,x.daily.counts[g.id]||0),claimed:x.daily.claimed.includes(g.id)})),weekly:weeklyGoals.map(g=>({...g,count:Math.min(g.target,x.weekly.counts[g.id]||0),claimed:x.weekly.claimed.includes(g.id)})),weeklyResetAt:Date.parse(x.weekly.key)+7*DAY-28800000,dailyBonus:!!x.daily.bonus,weeklyBonus:!!x.weekly.bonus,practice:x.practice||null}}
export function questRecord(team:any,event:string,now=Date.now()){const x=current(team,now),alreadyPracticed=(x.daily.counts.practice||0)>0;for(const [group,goals] of [['daily',dailyGoals],['weekly',weeklyGoals]] as const){const goal=goals.find(g=>g.id===event);if(goal&&!(event==='practice'&&group==='weekly'&&alreadyPracticed))x[group].counts[event]=Math.min(goal.target,(x[group].counts[event]||0)+1)}team.clubQuests=x}
export function questAction(s:any,team:any,b:any,now=Date.now()){
 if(!team||team.id!==b.teamId)throw new ShopError('ownOnly',403);const x=current(team,now),day=questDay(now);team.finance||={balance:30000000};
 if(b.action==='dailyCheckin'){if(x.lastCheckin===day)return;x.streak=x.lastCheckin===yesterday(day)?(x.streak||0)+1:1;x.lastCheckin=day;x.checkins=(x.checkins||0)+1;team.finance.balance+=50000;if(x.streak%7===0){team.finance.balance+=500000;x.tickets=(x.tickets||0)+1}}
 else if(b.action==='claimClubQuest'){const group=b.group==='daily'?'daily':b.group==='weekly'?'weekly':null,goals=group==='daily'?dailyGoals:weeklyGoals,goal=goals.find(g=>g.id===b.quest);if(!group||!goal)throw new ShopError('shopInvalid');if(x[group].claimed.includes(goal.id))return;if((x[group].counts[goal.id]||0)<goal.target)throw new ShopError('questNotReady');x[group].claimed.push(goal.id);team.finance.balance+=goal.gf;if(!x[group].bonus&&goals.every(g=>x[group].claimed.includes(g.id))){x[group].bonus=true;x.tickets=(x.tickets||0)+(group==='daily'?1:2)}}
 else if(b.action==='startClubPractice'){if(s.live&&[s.fixtures[s.live.index].home,s.fixtures[s.live.index].away].includes(team.id))throw new ShopError('clubMatchLocked',403);if(x.practice&&now-x.practice.at<30000)throw new ShopError('scoutCooldown',429);x.practice={token:crypto.randomUUID(),at:now,day,finished:false}}
 else if(b.action==='finishClubPractice'){const p=x.practice;if(!p||p.token!==b.token||p.day!==day||now-p.at<8000||now-p.at>1800000)throw new ShopError('practiceNotReady');if(p.finished)return;p.finished=true;team.clubQuests=x;questRecord(team,'practice',now);return}
 else throw new ShopError('shopInvalid');team.clubQuests=x;
}
