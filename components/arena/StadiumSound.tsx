import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {StadiumAudio} from '../../lib/stadium-audio';
import {AudioDirector,audioCatalog} from '../../lib/audio-director';
import {musicCue} from '../../lib/broadcast';
import {events} from '../../lib/sim';
import {matchWeather} from '../../lib/weather';
import {useLocale} from '../../lib/i18n';
import {Button} from '../ui';
const SoundContext=createContext<any>({controls:null,kick:()=>{}});
const read=(name:string,fallback:number)=>{try{const v=localStorage.getItem('goalforge-'+name);return v===null?fallback:Math.max(0,Math.min(1,Number(v)||0))}catch{return fallback}};
export function BroadcastAudioProvider({s,f,m,now,children}:any){const {t}=useLocale(),engine=useRef<StadiumAudio|null>(null),director=useRef<AudioDirector|null>(null),[enabled,setEnabled]=useState(false),[volume,setVolume]=useState(()=>read('volume',.45)),[music,setMusic]=useState(()=>read('music',.6)),[effects,setEffects]=useState(()=>read('effects',.75)),[error,setError]=useState(false),seen=useRef({key:'',time:0,status:''}),latest=useRef({s,f,m,now});latest.current={s,f,m,now};
 const apply=()=>{const a=engine.current,d=director.current;if(!a||!d)return;const {s,f,m,now}=latest.current,hidden=document.hidden;a.volume(volume*effects);d.musicLevel=music;d.effectsLevel=effects;if(hidden){d.invalidate();a.ambient(false,'sunny',true);return}d.setCue(musicCue(s,m,now));const active=!!s?.live&&!['ceremony','sponsorBreak','entrance','lineup','countdown','paused','fulltime'].includes(m?.status);d.setCrowd(active);d.levels();a.ambient(active,f?matchWeather(s,f):'sunny');a.crowd.gain.setTargetAtTime(0,a.ctx.currentTime,.2)};
 useEffect(()=>{apply();if(!s||!f||!m)return;const key=s.name+f.home+f.away+f.seed+(s.live?.opened||''),previous=seen.current;seen.current={key,time:m.time,status:m.status};if(!enabled||document.hidden||previous.key!==key||Math.abs(m.time-previous.time)>3)return;
 for(const e of events(s,f).filter(e=>e.time>previous.time&&e.time<=m.time&&m.time-e.time<1.5)){if(e.type==='goal'||e.type==='penaltykick'&&e.scored)director.current?.reaction('goal');else if(['wide','penaltymiss'].includes(e.type)||e.type==='penaltykick'&&!e.scored)director.current?.reaction('disappointed');else if(['save','card'].includes(e.type))director.current?.reaction('shocked');if(['card','offside','foul','penaltyAwarded'].includes(e.type))engine.current?.whistle()}
 if(previous.status!==m.status&&['playing','halftime','fulltime','extratime'].includes(m.status))engine.current?.whistle(m.status==='fulltime');
 },[s,f,m?.time,m?.status,now,enabled,volume,music,effects]);
 useEffect(()=>{const change=()=>{seen.current={key:'',time:0,status:''};if(!engine.current)return;if(document.hidden){director.current?.invalidate();engine.current.ctx.suspend().catch(()=>{})}else engine.current.ctx.resume().then(apply).catch(()=>setError(true))};document.addEventListener('visibilitychange',change);return()=>document.removeEventListener('visibilitychange',change)},[volume,music,effects]);
 useEffect(()=>()=>{director.current?.close();engine.current?.close()},[]);
 const toggle=async()=>{setError(false);if(engine.current){director.current?.close();director.current=null;await engine.current.close();engine.current=null;setEnabled(false);return}try{const a=new StadiumAudio();engine.current=a;const bus=a.ctx.createGain();bus.gain.value=volume;bus.connect(a.ctx.destination);director.current=new AudioDirector(a.ctx,bus,()=>setError(true));await a.enable();setEnabled(true);apply()}catch{director.current?.close();engine.current?.close();engine.current=null;director.current=null;setEnabled(false);setError(true)}};
 const slider=(name:string,value:number,set:(v:number)=>void)=><label><span>{t(name)}</span><input type="range" min="0" max="100" value={Math.round(value*100)} aria-label={t(name)} onChange={e=>{const v=Number(e.target.value)/100;set(v);try{localStorage.setItem('goalforge-'+name,v.toString())}catch{}if(name==='volume'){director.current?.volume(v)}}}/></label>;
 const cue=musicCue(s,m,now),controls=<div className="global-audio sound-controls"><Button icon="sound" variant={enabled?'sound-on':'ghost'} onClick={toggle} aria-pressed={enabled}>{t(enabled?'soundOn':'enableSound')}</Button><details><summary>{t('audioMix')}</summary><div className="audio-mix">{slider('volume',volume,setVolume)}{slider('music',music,setMusic)}{slider('effects',effects,setEffects)}</div></details><span className="sound-note" role={error?'status':undefined}>{error?t('audioLoadError'):enabled&&cue.track?(audioCatalog as any)[cue.track].title:t('soundHint')}</span></div>;
 return <SoundContext.Provider value={{controls,kick:()=>{if(enabled&&!document.hidden)engine.current?.kick()}}}>{children}</SoundContext.Provider>;
}
export function GlobalAudioControls(){return useContext(SoundContext).controls}
export function useStadiumSound(_s?:any,_f?:any,_m?:any){return {controls:null,kick:useContext(SoundContext).kick}}
