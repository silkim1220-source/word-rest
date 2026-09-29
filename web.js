/* === v8 web app: works in any browser, share links open a listen page, installable (PWA) === */
(function(){
const HOSTED_URL='https://silkim1220-source.github.io/word-rest/';
const isWeb=/^https?:$/.test(location.protocol);
const APP_BASE=isWeb?location.origin+location.pathname.replace(/index\.html$/,''):HOSTED_URL;
window.APP_BASE=APP_BASE;

/* service worker + install */
if(isWeb&&'serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))}
let installEvt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;const b=document.getElementById('installBtn');if(b)b.hidden=false});
function addInstallButton(){const nav=document.querySelector('.navright');if(!nav||document.getElementById('installBtn'))return;const b=document.createElement('button');b.id='installBtn';b.className='outline';b.type='button';b.textContent='앱 설치';
 const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;const ios=/iPhone|iPad|iPod/.test(navigator.userAgent);
 b.hidden=standalone||!(isWeb&&ios);
 b.onclick=()=>{if(installEvt){installEvt.prompt();installEvt.userChoice.finally(()=>{installEvt=null;b.hidden=true})}else if(ios)toast('Safari 아래쪽 공유 버튼(□↑) → ‘홈 화면에 추가’를 누르면 앱처럼 열려요.');else if(!isWeb)window.open(HOSTED_URL,'_blank','noopener')};
 nav.prepend(b)}
addInstallButton();

/* listen links: app URL + #listen=... so anyone opens a proper player page */
function entryFor(link){return (typeof musicLinks!=='undefined'&&musicLinks.find(x=>x.link===link))||(typeof currentShareEntry==='function'&&currentShareEntry()?.link===link?currentShareEntry():null)}
function listenUrl(e){if(!e||!e.link)return '';if(/suno\.com/.test(e.link))return e.link;
 const p=new URLSearchParams();p.set('listen',e.link);if(e.title)p.set('t',e.title);if(e.ref)p.set('r',e.ref);try{p.set('s',styleName(e))}catch(x){}
 return APP_BASE+'#'+p.toString()}
window.listenUrl=listenUrl;
function toListen(url){if(!url||/#listen=/.test(url)||!/media\.pollinations\.ai/.test(url))return url;return listenUrl(entryFor(url)||{link:url})}
if(typeof copyPlain==='function'){const base=copyPlain;copyPlain=function(s){return base(toListen(s))}}
if(typeof shareLink==='function'){const base=shareLink;shareLink=function(url,title){return base(toListen(url),title)}}
if(typeof shareTextFor==='function'){const base=shareTextFor;shareTextFor=function(e){const s=base(e);if(!e||!e.link)return s;return s.replace('▶ 듣기: '+e.link,'▶ 듣기: '+toListen(e.link))}}
if(typeof renderShare==='function'){const base=renderShare;renderShare=function(){base();const cur=typeof currentShareEntry==='function'&&currentShareEntry();if(cur){const u=toListen(cur.link);const i=document.getElementById('pubMusicLink');if(i)i.value=u;const a=document.getElementById('pubOpenMusic');if(a)a.href=u}
  document.querySelectorAll('#linkLibrary a.download-link').forEach(a=>{a.href=toListen(a.getAttribute('href'))})};try{renderShare()}catch(x){}}

/* listen page */
const css=document.createElement('style');css.textContent=`
.listen-wrap{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto;background:rgba(20,40,34,.35);backdrop-filter:blur(3px)}
.listen-card{width:min(460px,100%);background:rgba(255,254,250,.96);border-radius:22px;box-shadow:0 18px 50px rgba(0,0,0,.25);padding:28px 24px 22px;text-align:center;color:#233d35}
.listen-card .brand-s{font-size:13px;letter-spacing:.14em;color:#8a7240;margin:0 0 14px}
.listen-card h1{font-size:clamp(24px,6vw,32px);line-height:1.3;margin:0 0 6px;word-break:keep-all}
.listen-card .meta{color:#6b766e;font-size:15px;margin:0 0 20px}
.listen-play{width:92px;height:92px;border-radius:50%;background:#285548;color:#fff;font-size:34px;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 8px 22px rgba(40,85,72,.35);margin-bottom:14px}
.listen-play:disabled{opacity:.6}
.listen-card audio{width:100%;margin:6px 0 10px}
.listen-status{min-height:1.4em;font-size:14px;color:#6b766e;margin:4px 0 12px}
.listen-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.listen-row>*{flex:1 1 140px;padding:12px 14px;border-radius:12px;font-size:15px;text-decoration:none;text-align:center}
.listen-row .primary{background:#285548;color:#fff}.listen-row .outline{border:1px solid #cfd4c6;color:#285548;background:#fff}
.listen-note{font-size:12.5px;color:#7b857e;margin:16px 0 0;line-height:1.6}
@media (max-width:380px){.listen-card{padding:22px 16px 18px}.listen-play{width:80px;height:80px}}`;
document.head.append(css);

function readListen(){const h=location.hash.replace(/^#/,'');if(!h.startsWith('listen='))return null;const p=new URLSearchParams(h);const link=p.get('listen')||'';
 if(!/^https:\/\/(media\.pollinations\.ai|gen\.pollinations\.ai)\//.test(link))return null;return{link,title:p.get('t')||'말씀 찬양',ref:p.get('r')||'',style:p.get('s')||''}}

let blobUrl='';
function showListen(){const d=readListen();const old=document.getElementById('listenPage');if(old)old.remove();if(!d)return;
 document.title=d.title+' · 말씀에 쉬다';
 const w=document.createElement('div');w.className='listen-wrap';w.id='listenPage';w.setAttribute('role','dialog');w.setAttribute('aria-label',d.title+' 듣기');
 const c=document.createElement('div');c.className='listen-card';
 const bs=document.createElement('p');bs.className='brand-s';bs.textContent='말씀에 쉬다 · 찬양 듣기';
 const h=document.createElement('h1');h.textContent=d.title;
 const m=document.createElement('p');m.className='meta';m.textContent=[d.style,d.ref].filter(Boolean).join(' · ');
 const btn=document.createElement('button');btn.type='button';btn.className='listen-play';btn.textContent='▶';btn.setAttribute('aria-label','재생');
 const au=document.createElement('audio');au.controls=true;au.preload='metadata';au.src=d.link;au.setAttribute('playsinline','');
 const st=document.createElement('p');st.className='listen-status';st.setAttribute('aria-live','polite');
 const row=document.createElement('div');row.className='listen-row';
 const dl=document.createElement('a');dl.className='outline';dl.textContent='파일로 받기';dl.href=d.link;dl.target='_blank';dl.rel='noopener noreferrer';
 const cp=document.createElement('button');cp.type='button';cp.className='outline';cp.textContent='링크 복사';cp.onclick=()=>copyPlain(location.href);
 const mk=document.createElement('button');mk.type='button';mk.className='primary';mk.textContent='나도 찬양 만들기';mk.onclick=()=>{au.pause();try{window.history.replaceState(null,'',location.href.split('#')[0])}catch(x){}w.remove();document.title='말씀에 쉬다 · 말씀이 찬양이 되는 순간 · 찬양 음악 앱'};
 row.append(cp,dl,mk);
 const note=document.createElement('p');note.className='listen-note';note.textContent='성경에서 영감을 받은 창작 곡이며 AI 음악 모델로 만들었습니다. 로그인 없이 바로 들을 수 있어요.';
 let triedBlob=false;
 async function blobFallback(){if(triedBlob)return false;triedBlob=true;st.textContent='곡을 불러오는 중이에요…';btn.disabled=true;
  try{const r=await fetch(d.link);if(!r.ok)throw new Error(r.status);const b=await r.blob();if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=URL.createObjectURL(b.type?b:new Blob([b],{type:'audio/mpeg'}));au.src=blobUrl;st.textContent='';btn.disabled=false;return true}
  catch(e){btn.disabled=false;st.textContent='이 곡은 보관 기간(30일)이 끝났거나 지금 열 수 없어요.';return false}}
 au.addEventListener('error',()=>{if(!triedBlob)blobFallback()});
 au.addEventListener('play',()=>{btn.textContent='❚❚';btn.setAttribute('aria-label','일시정지');st.textContent=''});
 au.addEventListener('pause',()=>{btn.textContent='▶';btn.setAttribute('aria-label','재생')});
 btn.onclick=async()=>{if(!au.paused){au.pause();return}try{await au.play()}catch(e){if(await blobFallback())au.play().catch(()=>{st.textContent='한 번 더 눌러 주세요.'})}};
 c.append(bs,h,m,btn,au,st,row,note);w.append(c);document.body.append(w);btn.focus({preventScroll:true})}
window.addEventListener('hashchange',showListen);
showListen();

/* music agent: keep the approved connection on this device until it expires or the user disconnects */
const AG_KEY='word-rest-agent-v1';
function saveAgent(){try{if(typeof agentToken==='undefined')return;if(agentToken)localStorage.setItem(AG_KEY,JSON.stringify({t:agentToken,at:Date.now()}));else localStorage.removeItem(AG_KEY)}catch(e){}}
if(typeof accountUI==='function'){const base=accountUI;accountUI=function(){base();saveAgent();const connected=typeof agentToken!=='undefined'&&!!agentToken;const h=document.getElementById('authHelp');if(h&&connected)h.textContent='연결되었습니다. 이 기기(이 브라우저)에 연결이 저장되어 다음에 열어도 바로 음악을 만들 수 있어요. 승인한 유효기간이 끝나면 다시 연결하세요.';const d=document.getElementById('disconnectBtn');if(d)d.textContent='이 기기의 연결 해제'}}
(async function restoreAgent(){if(typeof agentToken==='undefined')return;let saved=null;try{saved=JSON.parse(localStorage.getItem(AG_KEY)||'null')}catch(e){}if(!saved||!saved.t||agentToken)return;
 agentToken=saved.t;accountUI();
 try{const r=await fetch(AGENT_API+'/account/key',{headers:{Authorization:'Bearer '+agentToken}});if(r.status===401||r.status===403){agentToken='';agentBalance=null;accountUI();toast('음악 에이전트 승인 기간이 끝났어요. 다시 연결해 주세요.');return}}catch(e){}
 try{await readAgentBalance()}catch(e){}accountUI();try{agentLog('음악 에이전트가 연결되어 있어요. 단어를 넣고 AI 가사와 곡 만들기를 눌러주세요.','success')}catch(e){}})();
/* Lyria models reject the duration field: describe the length in the prompt instead */
if(typeof apiCall==='function'){const baseApi=apiCall;apiCall=function(p,body,signal){if(body&&typeof body==='object'&&/lyria/i.test(body.model||'')&&'duration' in body){const d=Number(body.duration)||0;body={...body};delete body.duration;if(d&&typeof body.input==='string'&&!/approximately\s+\d+\s*seconds/i.test(body.input)){const mm=Math.floor(d/60),ss=d%60;body.input='Song length: approximately '+d+' seconds ('+(mm?mm+' min ':'')+(ss?ss+' s':'').trim()+'). Structure the arrangement to fit this length.\n'+body.input}}return baseApi(p,body,signal)}}
/* after approving on a phone, coming back to this tab resumes the connection check right away */
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&typeof deviceState!=='undefined'&&deviceState&&typeof pollDevice==='function'){clearTimeout(deviceTimer);pollDevice()}});
const note=[...document.querySelectorAll('#authDialog .auth-small')].find(p=>/메모리에만/.test(p.textContent));if(note)note.textContent='개인 비밀 API 키를 앱에 넣지 않습니다. 승인받은 임시 토큰은 이 기기의 브라우저에만 저장되고, 연결 해제를 누르면 지워집니다. 생성에는 Pollinations 크레딧이 사용됩니다.';
})();
