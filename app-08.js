
/* === Free in-browser worship composer: no account, no credits. Instruments play the melody of the lyrics. === */
const FreeComposer=(()=>{
const SR=44100,MAJ=[0,2,4,5,7,9,11];
const tick=()=>new Promise(r=>{const c=new MessageChannel();c.port1.onmessage=()=>r();c.port2.postMessage(0)});
function rng(seedStr){let h=1779033703^String(seedStr).length;for(const ch of String(seedStr)){h=Math.imul(h^ch.charCodeAt(0),3432918353);h=h<<13|h>>>19}return()=>{h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);h^=h>>>16;return(h>>>0)/4294967296}}
const hz=m=>440*Math.pow(2,(m-69)/12);
const KEYS={grace:65,moving:62,calm:60,majestic:63,joyful:67,prayer:57,hopeful:64};
const PROG={ccm:{v:[0,4,5,3],c:[3,0,4,5],b:[5,3,0,4]},hymn:{v:[0,3,0,4],c:[3,0,4,0],b:[5,1,4,0]},worship:{v:[5,3,0,4],c:[0,4,5,3],b:[3,0,4,5]},gospel:{v:[0,5,3,4],c:[0,3,4,0],b:[5,1,4,4]},choir:{v:[0,3,4,0],c:[5,3,4,0],b:[1,4,0,5]},kids:{v:[0,3,4,0],c:[0,5,3,4],b:[3,4,0,0]},meditation:{v:[0,3,5,3],c:[3,4,0,0],b:[5,3,1,4]},piano:{v:[0,5,3,4],c:[3,4,2,5],b:[1,4,0,0]}};
const ARR={ccm:{piano:1,guitar:'pick',pad:1,bass:1,drums:'soft',lead:'piano',verb:.26},hymn:{piano:'block',organ:1,strings:1,bass:1,lead:'organ',verb:.34},worship:{piano:1,guitar:'strum',pad:1,bass:1,drums:'build',lead:'piano',verb:.3},gospel:{piano:'block',guitar:'strum',bass:1,drums:'shaker',lead:'flute',verb:.22},choir:{organ:1,strings:1,choirPad:1,bass:1,lead:'choir',verb:.38},kids:{piano:1,guitar:'pick',bass:1,drums:'shaker',lead:'bell',verb:.2},meditation:{piano:'sparse',pad:1,strings:1,lead:'flute',verb:.36},piano:{piano:'flow',lead:'piano',verb:.28}};
const ENERGY={grace:.75,moving:.85,calm:.55,majestic:1,joyful:1,prayer:.5,hopeful:.9};
function chordNotes(root,deg){return[0,2,4].map(k=>root+MAJ[(deg+k)%7]+12*Math.floor((deg+k)/7))}
/* ---------- sample caches (precomputed buffers) ---------- */
function makePiano(ctx,m,cache){if(cache.has('p'+m))return cache.get('p'+m);const f=hz(m),len=Math.min(5,1.6+220/f),n=Math.floor(len*SR),L=new Float32Array(n),R=new Float32Array(n);const B=.00035,bright=Math.max(.35,1-(m-48)/60);
 for(let p=1;p<=10;p++){const fp=p*f*Math.sqrt(1+B*p*p);if(fp>12000)break;const amp=Math.pow(p,-1.25)*(p===1?1:bright),t60=Math.max(.35,(3.8-(m-40)*.03)/Math.pow(p,.55)),k=6.9/t60;const dm=Math.exp(-k/SR);for(const [arr,det,ph] of [[L,1,0],[R,1.0012,.7]]){const w=2*Math.PI*fp*det/SR,c2=2*Math.cos(w);let s1=Math.sin(ph*p),s0=Math.sin(ph*p-w),e=amp;for(let i=0;i<n;i++){arr[i]+=e*s1;const s2=c2*s1-s0;s0=s1;s1=s2;e*=dm;if(e<1e-5)break}}}
 const atk=Math.floor(.004*SR);for(let i=0;i<n;i++){const a=i<atk?i/atk:1,rel=i>n-2000?(n-i)/2000:1;L[i]*=a*rel*.28;R[i]*=a*rel*.28}for(let i=0;i<Math.floor(.012*SR);i++){const nz=(Math.random()*2-1)*.05*Math.exp(-i/120);L[i]+=nz;R[i]+=nz}
 const b=ctx.createBuffer(2,n,SR);b.copyToChannel(L,0);b.copyToChannel(R,1);cache.set('p'+m,b);return b}
function makeGuitar(ctx,m,cache){if(cache.has('g'+m))return cache.get('g'+m);const f=hz(m),n=Math.floor(3.2*SR),out=new Float32Array(n),N=Math.max(2,Math.round(SR/f)),buf=new Float32Array(N);let seed=m*9301;const r=()=>{seed=(seed*9301+49297)%233280;return seed/233280*2-1};for(let i=0;i<N;i++)buf[i]=r()*.6+(i<N/2?.25:-.25);
 let idx=0,prev=0;const decay=.996-Math.max(0,(m-52))*.0004;for(let i=0;i<n;i++){const cur=buf[idx],nx=buf[(idx+1)%N];const v=decay*.5*(cur+nx);buf[idx]=v*.98+prev*.02;prev=v;out[i]=cur;idx=(idx+1)%N}
 let lp=0;for(let i=0;i<n;i++){lp+= .45*(out[i]-lp);out[i]=lp*.42*(i>n-3000?(n-i)/3000:1)}const b=ctx.createBuffer(1,n,SR);b.copyToChannel(out,0);cache.set('g'+m,b);return b}
function makeBell(ctx,m,cache){if(cache.has('b'+m))return cache.get('b'+m);const f=hz(m),n=Math.floor(2.4*SR),o=new Float32Array(n);for(let i=0;i<n;i++){const t=i/SR,env=Math.exp(-t*2.6);o[i]=.3*env*Math.sin(2*Math.PI*f*t+2.2*Math.exp(-t*6)*Math.sin(2*Math.PI*f*3.5*t))+.08*Math.exp(-t*7)*Math.sin(2*Math.PI*f*4.2*t)}const b=ctx.createBuffer(1,n,SR);b.copyToChannel(o,0);cache.set('b'+m,b);return b}
function makeNoise(ctx,sec){const n=Math.floor(sec*SR),b=ctx.createBuffer(1,n,SR),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;return b}
function makeIR(ctx,sec){const n=Math.floor(sec*SR),b=ctx.createBuffer(2,n,SR);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++){const t=i/n;d[i]=(Math.random()*2-1)*Math.pow(1-t,3.2)*(i<SR*.012?i/(SR*.012):1)}}return b}
/* ---------- players (per-note: source + envelope only; filters/pan shared per instrument) ---------- */
function playBuf(ctx,buf,t,gain,dest,dur=null){const s=ctx.createBufferSource();s.buffer=buf;const g=ctx.createGain();g.gain.setValueAtTime(gain,t);if(dur){g.gain.setValueAtTime(gain,t+dur);g.gain.exponentialRampToValueAtTime(.0008,t+dur+.35);s.stop(t+dur+.4)}s.connect(g).connect(dest);s.start(t)}
function oscVoice(ctx,{type='sawtooth',wave=null,freq,t,dur,gain,dest,attack=.3,release=.6,detune=[-7,7],lfo=null}){const g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+attack);g.gain.setValueAtTime(gain,t+Math.max(attack,dur-release*.2));g.gain.linearRampToValueAtTime(0,t+dur+release);g.connect(dest);
 for(const d of detune){const o=ctx.createOscillator();if(wave)o.setPeriodicWave(wave);else o.type=type;o.frequency.value=freq;o.detune.value=d;if(lfo)lfo.connect(o.detune);o.connect(g);o.start(t);o.stop(t+dur+release+.05)}}
function makeBus(ctx,{to,pan=0,lp=null,hp=null,bp=null,formants=null,gain=1}){const input=ctx.createGain();input.gain.value=gain;let node=input;
 if(formants){const sum=ctx.createGain();for(const [f,q,a] of formants){const b=ctx.createBiquadFilter();b.type='bandpass';b.frequency.value=f;b.Q.value=q;const ga=ctx.createGain();ga.gain.value=a;input.connect(b).connect(ga).connect(sum)}node=sum}
 for(const [type,v] of [['lowpass',lp],['highpass',hp],['bandpass',bp]]){if(v){const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=Array.isArray(v)?v[0]:v;f.Q.value=Array.isArray(v)?v[1]:.5;node.connect(f);node=f}}
 const p=ctx.createStereoPanner();p.pan.value=pan;node.connect(p).connect(to);return input}
function makeLfo(ctx,cents,rate=5.2){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=rate;g.gain.value=cents;o.connect(g);o.start(0);return g}
/* ---------- form & melody ---------- */
function parseSections(lyrics){const secs=[];let cur=null;for(const raw of String(lyrics||'').split('\n')){const s=raw.trim();if(!s)continue;const m=s.match(/^\[(.+)\]$/);if(m){cur={name:m[1],lines:[]};secs.push(cur);continue}if(!cur){cur={name:'Verse',lines:[]};secs.push(cur)}cur.lines.push(s)}return secs.filter(x=>x.lines.length).map(x=>({...x,kind:/chorus|후렴|refrain|coda|아멘/i.test(x.name)?'c':/bridge|브리지/i.test(x.name)?'b':'v'}))}
function syl(line){return Array.from(line.replace(/[^\p{L}\p{N}]/gu,'')).length}
function rhythm(n,beats,r){if(n<=0)return[];let u=n<=beats-1?1:n<=(beats-1)*2?.5:.25;const out=Array(n).fill(u);let left=beats-1-n*u;if(u===1&&left>=1&&n>2){out[n-1]+=Math.min(2,left);left-=Math.min(2,left)}else if(left>0)out[n-1]+=Math.min(left,2);if(u===.5&&n>=4){for(let i=1;i<n-1&&left<0;i++);for(let i=0;i<n-2;i+=4){if(r()<.35&&out[i]===.5&&out[i+1]===.5){out[i]=.75;out[i+1]=.25}}}return out}
function melodyFor(line,kind,root,chordSeq,beatsPerChord,r,lastOfSection,range){const n=Math.max(1,syl(line)),durs=rhythm(n,beatsPerChord*chordSeq.length,r);const base=root+(kind==='c'?7:kind==='b'?5:0),notes=[];let pos=0,cur=base+(kind==='c'?5:2);const scale=[];for(let o=-1;o<3;o++)for(const d of MAJ)scale.push(root+12*o+d);
 for(let i=0;i<n;i++){const chord=chordSeq[Math.min(chordSeq.length-1,Math.floor(pos/beatsPerChord))];const tones=[0,2,4].map(k=>MAJ[(chord+k)%7]);const strong=Math.abs(pos-Math.round(pos))<1e-6&&Math.round(pos)%2===0;
  let cands=scale.filter(p=>Math.abs(p-cur)<=(strong?5:3)&&p>=base-3&&p<=base+range);if(strong||i===n-1){const ct=cands.filter(p=>tones.includes(((p-root)%12+12)%12));if(ct.length)cands=ct}if(i===n-1&&lastOfSection){const tn=cands.filter(p=>((p-root)%12+12)%12===0);if(tn.length)cands=tn}
  if(!cands.length)cands=[cur];const dir=i<n*.55?1:-1;cands.sort((a,b)=>Math.abs(a-(cur+dir*2))-Math.abs(b-(cur+dir*2)));const pick=cands[Math.min(cands.length-1,Math.floor(r()*Math.min(3,cands.length)))];notes.push({p:pick,at:pos,d:durs[i]});cur=pick;pos+=durs[i]}return notes}
/* ---------- main compose ---------- */
async function compose({lyrics='',title='',style='ccm',mood='calm',bpm=80,duration=60,lead='female',seed='x',onProgress=()=>{}}){
 const arr=ARR[style]||ARR.ccm,prog=PROG[style]||PROG.ccm,energy=ENERGY[String(mood).split(',')[0]]||.75;const moods=String(mood).split(',');const root=KEYS[moods[0]]||62,r=rng(seed+title+style+mood);
 const spb=60/bpm,barSec=spb*4,totalBars=Math.max(8,Math.floor(duration/barSec));const dur=totalBars*barSec+2.5;
 const secs=parseSections(lyrics);const instrumental=!secs.length;
 /* build bar plan: [{chord, kind, lyric?}] */
 const plan=[],cues=[];const push=(deg,kind,part)=>plan.push({deg,kind,part});
 for(const d of [0,4])push(d,'i','intro');
 const lineBars=2;let li=0;
 const fillSection=(sec,lastPass)=>{const pr=sec.kind==='c'?prog.c:sec.kind==='b'?prog.b:prog.v;sec.lines.forEach((ln,k)=>{const ci=(k*lineBars)%4;const seq=[pr[ci],pr[ci+1]];plan.push({deg:seq[0],kind:sec.kind,part:'sing',line:ln,seq,last:k===sec.lines.length-1});plan.push({deg:seq[1],kind:sec.kind,part:'sing2'})})};
 const body=totalBars-4;
 if(!instrumental){let used=0,pass=0;const order=[...secs];const chorus=secs.filter(s=>s.kind==='c');
  while(used<body){const queue=pass===0?order:(chorus.length?chorus:order);let progress=false;for(const s of queue){const need=s.lines.length*lineBars;if(used+need>body){const fit=Math.floor((body-used)/lineBars);if(fit>0){fillSection({...s,lines:s.lines.slice(0,fit)});used+=fit*lineBars}break}fillSection(s);used+=need;progress=true;if(used>=body)break}
   if(used<body&&used+4<=body){for(const d of prog.b.slice(0,4)){if(used>=body)break;push(d,'b','inter');used++}}if(!progress&&pass>0)break;pass++;if(pass>6)break}
  while(plan.length<totalBars-2)push(prog.v[plan.length%4],'v','inter')}
 else{const parts=['v','v','c','c','b','c'];let pi=0;while(plan.length<totalBars-2){const kind=parts[Math.min(pi,parts.length-1)]==='b'&&pi>=parts.length?'c':parts[pi%parts.length];const pr=kind==='c'?prog.c:kind==='b'?prog.b:prog.v;for(let k=0;k<4&&plan.length<totalBars-2;k+=2){const fake='가'.repeat(4+Math.floor(r()*4));plan.push({deg:pr[k],kind,part:'sing',line:fake,seq:[pr[k],pr[k+1]],last:k===2,silentCue:true});if(plan.length<totalBars-2)plan.push({deg:pr[k+1],kind,part:'sing2'})}pi++}}
 push(3,'o','outro');push(0,'o','outro');
 /* audio graph */
const cache=new Map();const CH=8,TAIL=4.5;const total=Math.ceil(dur*SR);const outL=new Float32Array(total),outR=new Float32Array(total);const IR=makeIR(new OfflineAudioContext(2,SR,SR),arr.verb>.3?2.8:2.2);
 for(let from=0;from<plan.length;from+=CH){const to=Math.min(plan.length,from+CH);const off=from===0?.25:0,startT=from===0?0:.25+from*barSec;const ctx=new OfflineAudioContext(2,Math.ceil(((to-from)*barSec+off+TAIL)*SR),SR);
 const master=ctx.createGain();master.gain.value=.9;master.connect(ctx.destination);
 const dry=ctx.createGain();dry.connect(master);const verb=ctx.createConvolver();verb.buffer=IR;const wet=ctx.createGain();wet.gain.value=arr.verb;verb.connect(wet).connect(master);
 const bus=ctx.createGain();bus.connect(dry);bus.connect(verb);
 const warm=ctx.createBiquadFilter();warm.type='lowshelf';warm.frequency.value=250;warm.gain.value=2;warm.connect(bus);
 const organWave=ctx.createPeriodicWave(new Float32Array([0,1,.55,.35,.3,0,.18,0,.12]),new Float32Array(9));
 const noise=makeNoise(ctx,1);const vib=makeLfo(ctx,11),vibS=makeLfo(ctx,7,4.6);
 const B={piano:makeBus(ctx,{to:warm,pan:.12}),guitar:makeBus(ctx,{to:warm,pan:-.35}),padL:makeBus(ctx,{to:bus,pan:-.45,lp:1400}),padR:makeBus(ctx,{to:bus,pan:.45,lp:1400}),strings:makeBus(ctx,{to:bus,lp:2600}),organ:makeBus(ctx,{to:bus,lp:5000}),choirPad:makeBus(ctx,{to:bus,formants:[[800,6,1],[1150,7,.6],[2900,9,.25]]}),bass:makeBus(ctx,{to:dry,lp:600}),kick:makeBus(ctx,{to:dry}),snare:makeBus(ctx,{to:bus,bp:[1900,.9]}),hat:makeBus(ctx,{to:bus,hp:[7000,.7]}),
  leadPiano:makeBus(ctx,{to:warm}),leadBell:makeBus(ctx,{to:bus}),leadOrgan:makeBus(ctx,{to:bus,lp:6000}),leadChoir:makeBus(ctx,{to:bus,formants:[[750,6,1],[1200,7,.55],[2800,9,.22]]}),leadCello:makeBus(ctx,{to:bus,lp:1800}),leadFlute:makeBus(ctx,{to:bus,lp:4000}),duet:makeBus(ctx,{to:bus,lp:1600,pan:-.15})};
 const leadKind=lead==='kidschoir'?'bell':lead==='choir'?'choir':lead==='male'?(arr.lead==='piano'?'piano':'cello'):arr.lead;
 for(let bi=from;bi<to;bi++){const b=plan[bi],tb=off+(bi-from)*barSec,tAbs=.25+bi*barSec;const deg=b.deg,cn=chordNotes(root,deg);const section=b.kind;const lvl=(section==='i'||section==='o'?.55:section==='v'?.75:section==='b'?.8:1)*(.55+.45*energy);
  const bassRoot=root-24+MAJ[deg%7];
  if(arr.piano){const pm=arr.piano;const voicing=cn.map(n=>n-12+(n-12<root-8?12:0));
   if(pm==='block'){for(const beat of [0,2]){for(const n of voicing)playBuf(ctx,makePiano(ctx,n,cache),tb+beat*spb,.32*lvl,B.piano)}playBuf(ctx,makePiano(ctx,bassRoot+12,cache),tb,.42*lvl,B.piano)}
   else if(pm==='sparse'){playBuf(ctx,makePiano(ctx,bassRoot+12,cache),tb,.35*lvl,B.piano);voicing.forEach((n,k)=>playBuf(ctx,makePiano(ctx,n+12,cache),tb+(1+k*.66)*spb,.22*lvl,B.piano))}
   else if(pm==='flow'){const pat=[bassRoot+12,bassRoot+19,cn[0],cn[1],cn[2],cn[1],cn[0],bassRoot+19];pat.forEach((n,k)=>playBuf(ctx,makePiano(ctx,n,cache),tb+k*spb/2,(k===0?.5:.3)*lvl,B.piano))}
   else{const pat=[bassRoot+12,voicing[0],voicing[1],voicing[2],voicing[1],voicing[0],voicing[2],voicing[1]];pat.forEach((n,k)=>playBuf(ctx,makePiano(ctx,n,cache),tb+k*spb/2,(k===0?.42:.24)*lvl*(section==='c'?1:.85),B.piano))}}
  if(arr.guitar&&section!=='i'){const gn=[bassRoot+12,cn[0],cn[1],cn[2],cn[0]+12];if(arr.guitar==='pick'){[0,2,1,3,2,4,3,2].forEach((k,j)=>playBuf(ctx,makeGuitar(ctx,gn[k],cache),tb+j*spb/2,.34*lvl,B.guitar))}else{for(let beat=0;beat<4;beat++){const down=beat%2===0;const acc=down?1:.7;(down?gn:[...gn].reverse()).forEach((n,k)=>playBuf(ctx,makeGuitar(ctx,n,cache),tb+beat*spb+k*.012,.2*acc*lvl,B.guitar))}}}
  const long=barSec;
  if(arr.pad&&section!=='i')cn.forEach((n,k)=>oscVoice(ctx,{freq:hz(n-12),t:tb,dur:long,gain:.028*lvl,dest:k%2?B.padR:B.padL,attack:.9,release:1.2,detune:[-9,9]}));
  if(arr.strings&&section!=='i')[cn[0]-12,cn[1],cn[2]].forEach(n=>oscVoice(ctx,{freq:hz(n),t:tb,dur:long,gain:.022*lvl,dest:B.strings,attack:.6,release:.9,detune:[-6,5,12],lfo:vibS}));
  if(arr.organ)[bassRoot+12,cn[0],cn[1],cn[2]].forEach(n=>oscVoice(ctx,{wave:organWave,freq:hz(n),t:tb,dur:long,gain:.05*lvl,dest:B.organ,attack:.05,release:.3,detune:[0,4]}));
  if(arr.choirPad&&section!=='i')[cn[0]-12,cn[1],cn[2],cn[0]+12].forEach(n=>oscVoice(ctx,{freq:hz(n),t:tb,dur:long,gain:.06*lvl,dest:B.choirPad,attack:.5,release:.9,detune:[-8,8],lfo:vibS}));
  if(arr.bass&&section!=='i'){const hits=arr.drums==='shaker'?[0,1.5,2]:[0,2];hits.forEach(h=>oscVoice(ctx,{type:'triangle',freq:hz(bassRoot+(h===2&&section==='c'?7:0)),t:tb+h*spb,dur:spb*(h===1.5?.45:1.5),gain:.16*lvl,dest:B.bass,attack:.01,release:.15,detune:[0]}))}
  const drumOn=arr.drums&&(section==='c'||(section==='b'&&energy>.8))&&energy>=.7;
  if(drumOn){const kick=t=>{const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(42,t+.18);g.gain.setValueAtTime(.55*lvl,t);g.gain.exponentialRampToValueAtTime(.001,t+.35);o.connect(g).connect(B.kick);o.start(t);o.stop(t+.4)};
   const nz=(t,dest,dec,gain)=>{const s=ctx.createBufferSource();s.buffer=noise;const g=ctx.createGain();g.gain.setValueAtTime(gain*lvl,t);g.gain.exponentialRampToValueAtTime(.001,t+dec);s.connect(g).connect(dest);s.start(t,Math.random()*.5);s.stop(t+dec+.02)};
   if(arr.drums==='shaker'){for(let k=0;k<8;k++)nz(tb+k*spb/2,B.hat,.07,k%2?.06:.09)}else{kick(tb);kick(tb+2*spb);if(arr.drums==='build'&&section==='c')kick(tb+2.5*spb);nz(tb+spb,B.snare,.18,.16);nz(tb+3*spb,B.snare,.18,.16);for(let k=0;k<8;k++)nz(tb+k*spb/2,B.hat,.04,.035)}}
  if(b.part==='sing'){const mel=melodyFor(b.line,b.kind,root,b.seq,4,rng(b.line+b.kind+seed),b.last,b.kind==='c'?12:9);const lineEnd=tb+mel.reduce((a,n)=>Math.max(a,n.at+n.d),0)*spb;
   if(!b.silentCue)cues.push({start:Math.max(0,tAbs-.25),end:tAbs+Math.min(lineEnd-tb+.6,2*barSec-.05),text:b.line});
   for(const n of mel){const t=tb+n.at*spb,d=Math.max(.18,n.d*spb*.95);const lk=leadKind;const oct=lk==='cello'?-12:lk==='bell'?12:0;const p=n.p+oct;
    if(lk==='piano')playBuf(ctx,makePiano(ctx,p+12,cache),t,.55*(b.kind==='c'?1:.85),B.leadPiano,Math.max(d,.5));
    else if(lk==='bell')playBuf(ctx,makeBell(ctx,p,cache),t,.42,B.leadBell);
    else if(lk==='organ')oscVoice(ctx,{wave:organWave,freq:hz(p+12),t,dur:d,gain:.07,dest:B.leadOrgan,attack:.02,release:.12,detune:[0,3]});
    else if(lk==='choir')oscVoice(ctx,{freq:hz(p),t,dur:d,gain:.11,dest:B.leadChoir,attack:.08,release:.25,detune:[-6,6],lfo:vib});
    else if(lk==='cello')oscVoice(ctx,{freq:hz(p),t,dur:d,gain:.07,dest:B.leadCello,attack:.08,release:.25,detune:[-4,4],lfo:vib});
    else oscVoice(ctx,{type:'sine',freq:hz(p+12),t,dur:d,gain:.12,dest:B.leadFlute,attack:.05,release:.2,detune:[0,3],lfo:vib});
    if(lead==='duet'&&b.kind==='c')oscVoice(ctx,{freq:hz(p-12+4),t,dur:d,gain:.05,dest:B.duet,attack:.08,release:.2,detune:[-4,4],lfo:vib})}}
  if(b.part==='outro'&&bi===plan.length-1){cn.forEach(n=>playBuf(ctx,makePiano(ctx,n,cache),tb+barSec*.02,.3,B.piano))}
  }
  const part=await ctx.startRendering();const s0=Math.round(startT*SR),pl=part.getChannelData(0),pr=part.getChannelData(1);for(let i=0;i<pl.length&&s0+i<total;i++){outL[s0+i]+=pl[i];outR[s0+i]+=pr[i]}onProgress(Math.round(to/plan.length*70));await tick()}
 for(let k=0;k<cues.length-1;k++)cues[k].end=Math.min(cues[k].end,cues[k+1].start-.05);const rendered={duration:dur,getChannelData:c=>c?outR:outL};
 /* normalize + fade */
 const chs=[rendered.getChannelData(0),rendered.getChannelData(1)];let peak=0;for(const c of chs)for(let i=0;i<c.length;i+=2){const a=Math.abs(c[i]);if(a>peak)peak=a}const g=peak>0?.95/peak:1;const fadeN=Math.floor(2*SR);const sat=x=>Math.tanh(x*1.35)/Math.tanh(1.35);for(const c of chs){for(let i=0;i<c.length;i++)c[i]=sat(c[i]*g)*.94;for(let i=0;i<fadeN;i++)c[c.length-1-i]*=i/fadeN}
 const mp3=await encodeMp3(chs,SR,p=>onProgress(70+Math.round(p*.3)));onProgress(100);
 return{blob:mp3,duration:rendered.duration,cues,sample:rendered,key:root}}
async function encodeMp3([L,R],sr,onP){const enc=new lamejs.Mp3Encoder(2,sr,160);const block=1152,out=[];const toI16=(src,s,e)=>{const a=new Int16Array(e-s);for(let i=s;i<e;i++){const v=Math.max(-1,Math.min(1,src[i]));a[i-s]=v<0?v*32768:v*32767}return a};
 for(let i=0;i<L.length;i+=block*40){const end=Math.min(L.length,i+block*40);for(let j=i;j<end;j+=block){const e=Math.min(end,j+block);const buf=enc.encodeBuffer(toI16(L,j,e),toI16(R,j,e));if(buf.length)out.push(new Uint8Array(buf))}onP(i/L.length*100);await tick()}
 const f=enc.flush();if(f.length)out.push(new Uint8Array(f));return new Blob(out,{type:'audio/mpeg'})}
return{compose}})();

