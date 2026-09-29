
/* === v7 music engines: best-value AI (Lyria), cheap instrumental (Stable Audio), free composer, Suno hand-off === */
const POLLEN_KRW=1670;
const ENGINES={
 'google/lyria-3.5':{label:'Lyria 3.5',cost:()=>.08,note:'추천 · 보컬 곡 곡당 0.08 Pollen(약 ₩130), 최대 약 3분'},
 'google/lyria-3-clip-preview':{label:'Lyria 3 Clip',cost:()=>.04,note:'30초 짧은 곡 · 0.04 Pollen(약 ₩70)',fixed:30},
 'stability-ai/stable-audio-3-medium':{label:'Stable Audio',cost:()=>.042,note:'연주곡 전용 · 곡당 약 0.04 Pollen(약 ₩70)',instrOnly:true},
 'elevenlabs/music-v2':{label:'ElevenLabs Music',cost:d=>d*.0025,note:'고급 · 초당 0.0025 Pollen (3분 0.45 ≈ ₩750)'},
 'elevenlabs/music-v2.5':{label:'ElevenLabs Music v2.5',cost:d=>d*.0025,note:'고급 · 초당 0.0025 Pollen (3분 0.45 ≈ ₩750)'},
 free:{label:'무료 작곡 엔진',cost:()=>0,note:'무료 · 브라우저에서 작곡 · 보컬 대신 악기가 가사 선율을 연주',local:true},
 suno:{label:'Suno',cost:()=>0,note:'무료 플랜 하루 약 10곡 · Suno 사이트에서 직접 만들고 링크를 붙여넣기',local:true}};
function engineOf(m=musicModel()){return ENGINES[m]||ENGINES['google/lyria-3.5']}
function musicCost(m=musicModel(),d=durationValue()){return +engineOf(m).cost(d).toFixed(4)}
function krw(p){return p>0?'약 ₩'+Math.max(10,Math.round(p*POLLEN_KRW/10)*10).toLocaleString('ko-KR'):'무료'}
/* migrate saved style settings from the old ElevenLabs default */
estimate=function(full=true){const m=musicModel();const media=autoMediaOn()&&m!=='suno'&&(agentToken||!engineOf(m).local)?mediaCost(durationValue()):0;return +(musicCost()+(full?.004:0)+media).toFixed(4)};
costsUI=function(){const m=musicModel(),e=engineOf(m),d=e.fixed||durationValue(),c=musicCost(m,d);const media=autoMediaOn()&&m!=='suno'?mediaCost(d):0;
 let t='음악: '+e.label+' · '+(c?c.toFixed(3)+' Pollen ('+krw(c)+')':'무료')+' — '+e.note;if(!isInstr())t+=' · AI 가사 약 0.004 Pollen'+(e.local?'(연결 안 하면 기본 가사로 무료)':'');if(media)t+=' · 이미지·자막 약 '+media.toFixed(3)+' Pollen ('+krw(media)+')';
 if(e.instrOnly&&!isInstr())t+=' · 이 모델은 연주곡만 만들 수 있어 보컬 없이 만듭니다.';if(e.fixed&&durationValue()!==e.fixed)t+=' · 이 모델은 30초로 고정됩니다.';$('#costHint').textContent=t;
 const gm=$('#generateMain');if(gm){const M=MODES[activeMode];gm.textContent=m==='suno'?'Suno용 가사·스타일 준비하기':e.local&&!agentToken?'무료로 '+M.label+(isInstr()?' 연주곡':'')+' 만들기':(e.local?'무료 작곡 · ':'')+(isInstr()||e.instrOnly?M.label+' 연주곡 만들기 ↗':'AI 가사와 '+M.label+' 만들기 ↗')}};
const baseOpenCostReviewV7=openCostReview;
openCostReview=function(kind){const m=musicModel(),e=engineOf(m);baseOpenCostReviewV7(kind);const pg=pendingGeneration;if(!pg||!$('#costReview').open)return;if(e.instrOnly)pg.voice='none';if(e.fixed)pg.duration=e.fixed;
 const d=$('#reviewDetails');d.textContent=d.textContent.replace(/음악 모델: [^\n]*/,'음악 모델: '+e.label+' — '+(musicCost(m,pg.duration)?musicCost(m,pg.duration).toFixed(3)+' Pollen ('+krw(musicCost(m,pg.duration))+')':'무료')).replace(/곡 길이: \d+초/,'곡 길이: '+pg.duration+'초').replace(/보컬: [^\n]*/,e.instrOnly?'보컬: 없음 · 연주곡':(d.textContent.match(/보컬: [^\n]*/)||[''])[0]);
 const amt=Number((d.textContent.match(/예상 사용량: ([\d.]+)/)||[])[1]||0);d.textContent=d.textContent.replace(/(예상 사용량: [\d.]+ Pollen)/,'$1 ('+krw(amt)+')');
 if(e.local)$('#reviewWarning').textContent=m==='suno'?'AI가 가사를 쓰면 약 0.004 Pollen이 듭니다. 음악은 Suno 사이트에서 무료 플랜으로 직접 만듭니다.':'음악은 이 브라우저에서 무료로 작곡합니다. AI 가사를 쓰면 약 0.004 Pollen이 듭니다. 링크 저장은 무료입니다.'};
/* alternative engines hooked into writeMusic */
async function altMusic(job,signal){const m=job.model,e=ENGINES[m];if(e?.instrOnly&&job.voice!=='none'){job.voice='none'}if(e?.fixed)job.duration=e.fixed;if(m!=='free'&&m!=='suno')return false;
 if(m==='suno'){job.media=null;showSuno(job);setTab('music');agentLog('Suno용 가사와 스타일이 준비됐습니다. 음악 탭에서 복사해 Suno에 붙여넣고, 완성된 곡의 링크를 다시 붙여넣으세요.','success');return true}
 const mode=job.mode||current.mode||activeMode,instr=job.voice==='none';setTab('music');agentLog('무료 작곡 엔진이 곡을 만드는 중… 곡 길이의 절반~1배 정도 걸립니다. 이 창을 열어두세요.');
 const r=await FreeComposer.compose({lyrics:instr?'':current.lyrics,title:themeFor(current).title,style:mode,mood:job.mood||$('#mood').value,bpm:job.bpm,duration:job.duration,lead:job.voice,seed:current.id,onProgress:p=>{$('#pipelineText').textContent='무료 작곡 중 '+p+'%'}});
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 const previous=tracks.get(current.id);if(previous)URL.revokeObjectURL(previous.url);const url=URL.createObjectURL(r.blob);
 Object.assign(current,{mode,instrumental:instr,mood:job.mood,voice:job.voice,style:job.style});tracks.set(current.id,{blob:r.blob,url,model:'무료 작곡 엔진',duration:r.duration,lyrics:current.lyrics,title:themeFor(current).title,link:'',mode,instrumental:instr,free:true,cues:instr?null:r.cues});
 current.audioInfo={model:'무료 작곡 엔진',requestedSeconds:job.duration,bytes:r.blob.size,link:'',mode,instrumental:instr,voice:job.voice,mood:job.mood,free:true};showTrack();
 if(agentToken){try{const fd=new FormData();fd.append('file',new File([r.blob],(themeFor(current).title||'song').replace(/[^\p{L}\p{N}_-]+/gu,'-')+'.mp3',{type:'audio/mpeg'}));const up=await fetch('https://media.pollinations.ai/upload',{method:'POST',headers:{Authorization:'Bearer '+agentToken},body:fd});if(!up.ok)throw Error(up.status);const d=await up.json();const link=d.url||('https://media.pollinations.ai/'+d.id);tracks.get(current.id).link=link;current.audioInfo.link=link;saveMusicLink({link,title:themeFor(current).title,mode,instrumental:instr,voice:job.voice,mood:job.mood,duration:Math.round(r.duration),ref:themeFor(current).ref,engine:'free'});showTrack();agentLog('무료로 곡을 만들고 공유 링크도 만들었습니다. ‘공유’ 탭에서 링크를 보내세요.','success')}catch(x){agentLog('곡은 완성됐지만 링크를 만들지 못했습니다. MP3를 내려받아 두세요. ('+String(x.message||x).slice(0,80)+')','error')}}
 else agentLog('무료로 곡을 만들었습니다. 공유 링크를 만들려면 ‘음악 에이전트 연결’(무료)을 한 뒤 다시 만들어 주세요. 지금은 MP3를 내려받을 수 있어요.','success');
 $('#resultStatus').textContent=MODES[mode].label+' · 무료 작곡 완료';toast('무료로 곡을 만들었어요.');return true}
/* offline path (no connection) for free / suno */
async function runLocal(kind){if(agentBusy||mediaBusy)return;const m=musicModel(),keyword=$('#keyword').value.trim()||current.keyword||'쉼';const instr=isInstr();
 if(kind!=='music'||!current.lyrics&&!instr)make(keyword);current.mode=activeMode;
 const job={kind:'music',mode:activeMode,model:m,duration:durationValue(),style:$('#style').value,voice:$('#voice').value,mood:$('#mood').value,bpm:Number($('#tempo').value),lyrics:current.lyrics};
 setBusy(true);try{await altMusic(job,null)}catch(e){agentLog('만들지 못했습니다: '+agentError(e),'error')}finally{setBusy(false)}}
$('#createForm').onsubmit=e=>{e.preventDefault();const m=musicModel();if(engineOf(m).local&&!agentToken)return runLocal('full');openCostReview('full')};
$('#generateTrackBtn').onclick=()=>{const m=musicModel();if(engineOf(m).local&&!agentToken)return runLocal('music');openCostReview('music')};
/* Suno hand-off */
const SUNO_STYLE={ccm:'Korean CCM worship, acoustic guitar, grand piano, soft pads',hymn:'Korean traditional hymn, pipe organ, piano, congregational',worship:'Korean worship band, ambient guitar, piano, building chorus',gospel:'Korean gospel chorus, acoustic guitar strumming, piano, sing-along',choir:'Korean church choir anthem, SATB choir, organ, strings',kids:"Korean children's worship song, bright, acoustic guitar, piano, simple melody",meditation:'Korean meditative worship, soft piano, ambient pads, slow',piano:'Korean worship, expressive solo piano'};
const SUNO_VOICE={female:'warm female vocal',male:'gentle male vocal',duet:'male and female duet',choir:'church choir',kidschoir:"children's choir",none:'instrumental'};
function sunoLyrics(l){return String(l||'').replace(/\[(\d+)\s*절\]/g,'[Verse $1]').replace(/\[후렴\]/g,'[Chorus]').replace(/\[아멘\]/g,'[Outro]').replace(/\[Refrain\]/gi,'[Chorus]')}
function showSuno(job){const mode=job.mode||activeMode,instr=job.voice==='none';const style=[SUNO_STYLE[mode],SUNO_VOICE[job.voice]||'',moodEn(job.mood),job.bpm+' BPM'].filter(Boolean).join(', ').slice(0,200);
 $('#sunoTitle').value=themeFor(current).title;$('#sunoStyle').value=style;$('#sunoLyrics').value=instr?'':sunoLyrics(current.lyrics);$('#sunoInstr').hidden=!instr;$('#sunoBox').hidden=false;$('#sunoBox').dataset.mode=mode;$('#sunoBox').dataset.voice=job.voice;$('#sunoBox').dataset.mood=job.mood||''}
$('#copySunoStyle').onclick=()=>copyText($('#sunoStyle').value,'스타일을');$('#copySunoLyrics').onclick=()=>copyText($('#sunoLyrics').value,'가사를');$('#copySunoTitle').onclick=()=>copyText($('#sunoTitle').value,'제목을');
$('#saveSunoLink').onclick=()=>{const v=$('#sunoLinkInput').value.trim();if(!/^https:\/\/(www\.)?suno\.com\/(song|s)\/[A-Za-z0-9_-]{4,}/.test(v))return toast('Suno 곡 링크(https://suno.com/song/… 또는 suno.com/s/…)를 붙여넣어 주세요.');const b=$('#sunoBox').dataset;
 saveMusicLink({link:v,title:$('#sunoTitle').value||themeFor(current).title,mode:b.mode||activeMode,instrumental:b.voice==='none',voice:b.voice,mood:b.mood,ref:themeFor(current).ref,provider:'suno'});current.audioInfo={...(current.audioInfo||{}),link:v,model:'Suno'};$('#sunoLinkInput').value='';toast('Suno 곡 링크를 내 음악 링크에 저장했어요.');setTab('publish')};
/* share list: accept Suno links */
function saveMusicLink(e){const ok=/^https:\/\/media\.pollinations\.ai\//.test(e.link||'')||/^https:\/\/(www\.)?suno\.com\//.test(e.link||'');if(!ok)return;if(/suno\.com/.test(e.link))e.provider='suno';musicLinks=musicLinks.filter(x=>x.link!==e.link);musicLinks.unshift({id:Date.now().toString(36),created:new Date().toISOString(),...e});persistLinks();linkStatus.set(e.link,'ok');renderShare()}
async function checkLinks(){for(const e of musicLinks.slice(0,40)){if(e.provider==='suno'||/suno\.com/.test(e.link)){linkStatus.set(e.link,'ok');continue}if(linkStatus.get(e.link)==='ok'&&!e.sample)continue;try{const r=await fetch(e.link+'/metadata',{cache:'no-store'});linkStatus.set(e.link,r.ok?'ok':'gone')}catch(x){linkStatus.set(e.link,'unknown')}}renderShare()}
const basePlayLinkV7=playLink;playLink=function(url){if(/suno\.com/.test(url)){window.open(url,'_blank','noopener');return}return basePlayLinkV7(url)};
$('#musicModel').addEventListener('change',()=>{costsUI();const e=engineOf();toast(e.label+' · '+e.note)});
['#songDuration','#imageModel','#autoMedia','#imageLook'].forEach(s=>{const el=$(s);if(el){const prev=el.onchange;el.onchange=e=>{if(prev&&prev!==costsUI)try{prev(e)}catch(x){}costsUI()}}});document.querySelectorAll('[data-voice],[data-mode]').forEach(b=>b.addEventListener('click',()=>setTimeout(costsUI,0)));
costsUI();renderShare();

