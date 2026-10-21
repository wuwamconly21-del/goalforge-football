// Shoot-out totals never enter the match score or league goal difference.
export function shootoutState(kicks:any[]){
 const goals=[0,0],taken=[0,0];
 for(const kick of kicks){taken[kick.side]++;goals[kick.side]+=Number(kick.scored)}
 const early=taken[0]<=5&&taken[1]<=5&&(goals[0]>goals[1]+5-taken[1]||goals[1]>goals[0]+5-taken[0]);
 const sudden=taken[0]>=5&&taken[0]===taken[1]&&goals[0]!==goals[1];
 return {goals,taken,finished:early||sudden,winner:early||sudden?(goals[0]>goals[1]?0:1):null,suddenDeath:Math.max(...taken)>5};
}
export function equalShootoutPlayers(lineups:any[][],sentOff:Set<number>[]){
 const lists=lineups.map((players,side)=>players.map((p,i)=>p&&!sentOff[side].has(i)?i:-1).filter(i=>i>=0));
 const count=Math.min(...lists.map(list=>list.length));
 if(!count)throw Error('No eligible shoot-out players.');
 // Retain the goalkeeper when reducing to the same number of eligible players.
 return lists.map((list,side)=>list.filter(i=>i!==0).sort((a,b)=>(lineups[side][b].rating||0)-(lineups[side][a].rating||0)||a-b).slice(0,count-Number(list.includes(0))).concat(list.includes(0)?[0]:[]));
}
export function createShootout(eligible:number[][],start:number,firstSide:number,outcome:(side:number,player:number,round:number)=>boolean,lineups:any[][]){
 const kicks:any[]=[];
 for(let index=0;index<2000;index++){
  const side=(firstSide+index)%2,round=Math.floor(index/2),p=eligible[side][round%eligible[side].length];
  kicks.push({type:'penaltykick',time:start+index*3,side,pIndex:p,player:lineups[side][p].name,scored:outcome(side,p,round),round:round+1,firstSide,x:side===0?.95:.05,y:.5});
  if(shootoutState(kicks).finished)return kicks;
 }
 throw Error('Shoot-out did not resolve; no winner was invented.');
}
