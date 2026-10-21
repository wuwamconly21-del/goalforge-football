import React from 'react';
import {events,footballTeams} from '../../lib/sim';
import {shootoutState} from '../../lib/shootout';
import {useLocale} from '../../lib/i18n';
import {Badge} from '../ui';
export default function ShootoutBoard({s,f,m}:any){
 const {t}=useLocale(),teams=footballTeams(s,f),all=events(s,f).filter(e=>e.type==='penaltykick'),visible=all.filter(e=>e.time<=m.time),state=shootoutState(visible),last=visible.at(-1),next=all.find(e=>e.time>m.time),current=last&&m.time-last.time<1.4?last:next||last,round=next?.round||last?.round||1,start=Math.max(0,Math.max(...state.taken)-5);
 return <div className="shootout-board" aria-label={t('penalties')}>
  <header><span className="eyebrow">{t('penalties')}</span><b>{t(round>5?'suddenDeath':'round')} {round}</b></header>
  {teams.map((team:any,side:number)=><div className={'shootout-team '+(current?.side===side?'shootout-current':'')} key={team.id}><Badge team={team} size={27}/><strong>{team.short}</strong><div className="penalty-dots">{Array.from({length:5},(_,i)=>{const number=start+i,kick=visible.filter(e=>e.side===side)[number];return <span key={number} className={kick?(kick.scored?'scored':'missed'):'pending'} aria-label={team.name+' '+(number+1)+' '+t(kick?kick.scored?'scored':'missed':'pending')} title={String(number+1)}>{kick?kick.scored?'✓':'×':number+1}</span>})}</div><b className="shootout-score">{state.goals[side]}</b></div>)}
  <footer aria-live="polite">{state.finished?<strong>{teams[state.winner!].name} · {t('shootoutWinner')}</strong>:<><span>{t(m.status==='shootout'?'firstKick':'penaltyTaker')}</span><strong>{m.status==='shootout'?teams[all[0]?.side||0].name:current?.player}</strong></>}</footer>
 </div>
}
