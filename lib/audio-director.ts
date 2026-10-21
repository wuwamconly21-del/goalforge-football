export const audioCatalog={
 home:{file:'home-calm.mp3',title:'Tenang Sebelum Ribut',loop:true},
 opening:{file:'mahawangsa-opening.mp3',title:'Mahawangsa Cup Musim Kedua',loop:false},
 break:{file:'sponsor-break.mp3',title:'Rehat penaja',loop:true},
 warmup:{file:'arena-pulse.mp3',title:'Arena Pulse',loop:true},
 halftime:{file:'wira-arena.mp3',title:'Wira Arena',loop:true},
 fulltime:{file:'majulah-wira.mp3',title:'Majulah Wira Arena',loop:true},
 goal:{file:'goal-ole.mp3',title:'Olé',loop:false},
 crowd:{file:'crowd-cheer.mp3',title:'Crowd',loop:true},
 disappointed:{file:'crowd-disappointed.mp3',title:'Crowd reaction',loop:false},
 shocked:{file:'crowd-shocked.mp3',title:'Crowd reaction',loop:false}
};
type Track=keyof typeof audioCatalog;
type Channel={source:AudioBufferSourceNode,gain:GainNode,end?:number};
// All recordings share the AudioContext unlocked by the listener's sound button.
// Requests are cancelled logically on phase changes; no stale track can start later.
export class AudioDirector{
 private cache=new Map<Track,Promise<AudioBuffer>>();private channels=new Map<string,Channel>();private generation=new Map<string,number>();private cue='';private crowd=false;private closed=false;private duckUntil=0;
 musicLevel=.6;effectsLevel=.75;
 volume(value:number){this.output.gain.setTargetAtTime(value,this.ctx.currentTime,.1)}
 constructor(private ctx:AudioContext,private output:GainNode,private failed:()=>void=()=>{}){}
 private buffer(track:Track){let pending=this.cache.get(track);if(!pending){pending=fetch('/audio/'+audioCatalog[track].file).then(r=>{if(!r.ok)throw Error('audio');return r.arrayBuffer()}).then(b=>this.ctx.decodeAudioData(b));this.cache.set(track,pending);pending.catch(()=>this.cache.delete(track));while(this.cache.size>4){const first=this.cache.keys().next().value!;this.cache.delete(first)}}return pending}
 private stop(channel:string){this.generation.set(channel,(this.generation.get(channel)||0)+1);const old=this.channels.get(channel);if(!old)return;this.channels.delete(channel);const at=this.ctx.currentTime;old.gain.gain.cancelScheduledValues(at);old.gain.gain.setTargetAtTime(0,at,.12);try{old.source.stop(at+.65)}catch{}}
 private async play(channel:string,track:Track,age=0,limit=0){this.stop(channel);const gen=this.generation.get(channel),requested=this.ctx.currentTime;try{const buffer=await this.buffer(track);if(this.closed||this.generation.get(channel)!==gen)return;const source=this.ctx.createBufferSource(),gain=this.ctx.createGain(),info=audioCatalog[track],elapsed=age+this.ctx.currentTime-requested;if(!info.loop&&elapsed>=buffer.duration||limit&&elapsed>=limit)return;source.buffer=buffer;source.loop=info.loop;source.connect(gain).connect(this.output);gain.gain.value=0;this.channels.set(channel,{source,gain,end:limit?this.ctx.currentTime+limit-elapsed:undefined});source.onended=()=>{source.disconnect();gain.disconnect();if(this.channels.get(channel)?.source===source)this.channels.delete(channel)};source.start(0,elapsed%buffer.duration);if(limit){const end=this.ctx.currentTime+Math.max(.1,limit-elapsed);source.stop(end)}this.levels();}catch{if(!this.closed&&this.generation.get(channel)===gen)this.failed()}}
 setCue(cue:{track:string,key:string,age:number}){if(this.closed||cue.key===this.cue)return;this.cue=cue.key;if(['home','opening','break','warmup'].includes(cue.track)){this.stop('goal');this.stop('reaction');this.duckUntil=0}if(cue.track)this.play('music',cue.track as Track,cue.age);else this.stop('music')}
 setCrowd(active:boolean){if(this.closed||active===this.crowd)return;this.crowd=active;if(active)this.play('crowd','crowd');else this.stop('crowd')}
 reaction(track:'goal'|'disappointed'|'shocked'){if(this.closed)return;if(track==='goal'){this.duckUntil=this.ctx.currentTime+10;this.play('goal','goal',0,10);this.stop('reaction')}else this.play('reaction',track,0,4);this.levels()}
 levels(){const at=this.ctx.currentTime,duck=at<this.duckUntil;for(const [key,c] of this.channels){const level=key==='music'?this.musicLevel*(duck?.2:1):key==='crowd'?this.effectsLevel*(duck?.2:.25):key==='goal'?this.musicLevel*.85:this.effectsLevel*.65;c.gain.gain.setTargetAtTime(level*(c.end?Math.max(0,Math.min(1,(c.end-at)/.6)):1),at,.15)}}
 invalidate(){this.cue='';this.crowd=false;this.duckUntil=0;for(const key of ['music','crowd','goal','reaction'])this.stop(key)}
 close(){this.closed=true;this.invalidate();this.cache.clear()}
}
