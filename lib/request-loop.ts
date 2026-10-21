// One timer and one in-flight request per loop. Hidden tabs stop traffic; errors
// back off and quota exhaustion waits five minutes rather than hammering storage.
export function startRequestLoop(task:()=>Promise<{ok:boolean,quota?:boolean}>,interval:number,host:any={setTimeout,clearTimeout,document}){
 let stopped=false,timer:any=null,running=false,failures=0,wakePending=false;const hidden=()=>!!host.document?.hidden;
 const schedule=(ms:number)=>{host.clearTimeout(timer);if(!stopped)timer=host.setTimeout(tick,ms)};
 async function tick(){if(stopped)return;if(running){wakePending=true;return}if(hidden()){schedule(interval);return}running=true;let result:any;try{result=await task()}catch{result={ok:false}}finally{running=false}if(stopped)return;failures=result?.ok?0:failures+1;const delay=result?.quota?300000:result?.ok?interval:Math.min(120000,Math.max(15000,interval)*2**Math.min(failures-1,3));if(wakePending){wakePending=false;schedule(delay)}else schedule(delay)}
 const wake=()=>{if(!hidden()&&!stopped){if(running)wakePending=true;else{host.clearTimeout(timer);void tick()}}};host.document?.addEventListener('visibilitychange',wake);void tick();return {wake,stop(){stopped=true;host.clearTimeout(timer);host.document?.removeEventListener('visibilitychange',wake)}};
}
