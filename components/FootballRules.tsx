import React,{useEffect,useState} from 'react';
import {useLocale} from '../lib/i18n';
import {Button,Field,Icon} from './ui';
export default function FootballRules({s,admin,act}:any){
 const {t}=useLocale(),[rule,setRule]=useState(s.knockoutRule||'extraTime'),[busy,setBusy]=useState(false);
 useEffect(()=>setRule(s.knockoutRule||'extraTime'),[s.knockoutRule]);
 return <section className="panel football-rules"><div className="section-title"><div><span className="eyebrow">GOALFORGE</span><h1>{t('footballRules')}</h1></div><Icon name="ball" size={30}/></div>
  <p className="helper">{t('rulesModelHelp')}</p><div className="rule-cards">{['drawRuleHelp','penaltyRuleHelp','shootoutRuleHelp','disciplineRuleHelp','substitutionRuleHelp','restartRuleHelp'].map((key,i)=><article key={key}><span className="number-tag">0{i+1}</span><p>{t(key)}</p></article>)}</div>
  <form onSubmit={async e=>{e.preventDefault();setBusy(true);try{await act('footballRules',{knockoutRule:rule})}finally{setBusy(false)}}}><Field label={t('playoffRule')}><select disabled={!admin||busy} value={rule} onChange={e=>setRule(e.target.value)}><option value="extraTime">{t('extraTimePenalties')}</option><option value="penalties">{t('directPenalties')}</option></select></Field><p className="helper">{t('futureMatchesOnly')}</p>{admin&&<Button type="submit" variant="coral" disabled={busy||rule===(s.knockoutRule||'extraTime')}>{t('save')}</Button>}</form>
 </section>
}
