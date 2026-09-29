/* === v9: edit every part of a song, autosave, continue on another device, app settings (config.js) === */
(function(){
const q=s=>document.querySelector(s);
const APPB=window.APP_BASE||location.href.split('#')[0];
const isWeb=/^https?:$/.test(location.protocol);
const hhmm=()=>{const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* 0. keep the public link of every generated image so it can move to another device */
const _fetch=window.fetch;
window.fetch=async function(input,init){const r=await _fetch.apply(this,arguments);
 try{const u=typeof input==='string'?input:(input&&input.url)||'';if(/gen\.pollinations\.ai\/image\//.test(u)){const link=((r.headers.get('link')||'').match(/<(https:\/\/media\.pollinations\.ai\/[^>]+)>/)||[])[1];if(link){const ob=r.blob.bind(r);r.blob=async()=>{const b=await ob();try{b._link=link}catch(e){}return b}}}}catch(e){}
 return r};

/* 1. styles */
const st=document.createElement('style');st.textContent=`
.edit-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:4px 0 14px}
.edit-bar button{padding:8px 12px;font-size:14px;border-radius:10px}
.edit-bar .save-state{font-size:12.5px;color:var(--muted);margin-left:auto}
.edit-bar button[aria-pressed="true"]{background:var(--green);color:#fff;border-color:var(--green)}
body.editing [data-editable]{outline:2px dashed #c9a86a;outline-offset:4px;border-radius:6px;background:rgba(255,248,230,.65);cursor:text;min-height:1.4em}
body.editing [data-editable]:focus{outline:2px solid var(--green);background:#fff}
.edit-hint{display:none;font-size:13px;color:#8a6a2c;background:#fff6e2;border-radius:10px;padding:8px 12px;margin:0 0 12px}
body.editing .edit-hint{display:block}
#syncDialog{max-width:520px;width:calc(100% - 28px)}
#syncDialog .sync-link{display:flex;gap:8px;margin:10px 0}
#syncDialog .sync-link input{flex:1;min-width:0}
#syncDialog .sync-actions{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
#syncDialog .sync-actions>*{flex:1 1 150px}
#editApp{max-width:560px;width:calc(100% - 28px)}
#editApp ol{padding-left:20px;line-height:1.8}
#editApp a.primary,#editApp a.outline{display:inline-block;margin:4px 0;padding:9px 14px;border-radius:10px;text-decoration:none}
@media (max-width:520px){.edit-bar .save-state{width:100%;margin-left:0}}`;
document.head.append(st);

/* 2. edits layer on top of the generated text */
const FIELDS=[['#songTitle','title','제목'],['#interpretation','interpretation','말씀 풀이'],['#practice','practice','오늘의 작은 실천'],['#prayer','prayer','기도'],['#narration','narration','묵상 내레이션']];
const baseTheme=themeFor;
themeFor=function(c){const t=baseTheme(c);const e=c&&c.edits;if(!e)return t;const o={...t};if(e.title)o.title=e.title;if(e.interpretation!=null){o.context='';o.meaning=e.interpretation}if(e.practice!=null)o.practice=e.practice;if(e.prayer!=null)o.prayer=e.prayer;return o};
function applyEdits(){const e=current&&current.edits;if(!e)return;for(const [sel,key] of FIELDS){if(e[key]!=null){const el=q(sel);if(el&&document.activeElement!==el)el.textContent=e[key]}}}
const baseRender=render;render=function(preview){baseRender(preview);applyEdits();setEditable(editing);if(!preview)maybeSave()};

let editing=false;
function setEditable(on){for(const [sel,key,label] of FIELDS){const el=q(sel);if(!el)continue;if(on){el.dataset.editable=key;try{el.contentEditable='plaintext-only';if(el.contentEditable!=='plaintext-only')el.contentEditable='true'}catch(x){el.contentEditable='true'}el.setAttribute('aria-label',label+' 편집');el.spellcheck=false}else{delete el.dataset.editable;el.removeAttribute('contenteditable');el.removeAttribute('aria-label')}}}
function onFieldInput(ev){const el=ev.target.closest('[data-editable]');if(!el||!current)return;const key=el.dataset.editable;current.edits=current.edits||{};let v=el.innerText.replace(/\u00a0/g,' ');if(key==='title')v=v.replace(/\s*\n\s*/g,' ').trim().slice(0,80);current.edits[key]=v;if(key==='title'){try{const m=mediaFor();if(m.video)m.videoStale=true}catch(x){}}scheduleSave()}
document.addEventListener('input',onFieldInput,true);
document.addEventListener('paste',ev=>{const el=ev.target.closest&&ev.target.closest('[data-editable]');if(!el||el.contentEditable==='plaintext-only')return;ev.preventDefault();const text=(ev.clipboardData||window.clipboardData).getData('text');document.execCommand('insertText',false,text)},true);
document.addEventListener('keydown',ev=>{const el=ev.target.closest&&ev.target.closest('[data-editable="title"]');if(el&&ev.key==='Enter'){ev.preventDefault();el.blur()}},true);
document.addEventListener('focusout',ev=>{const el=ev.target.closest&&ev.target.closest('[data-editable="title"]');if(el){try{renderMedia();renderShare()}catch(x){}}},true);

/* lyrics, motions and share text */
q('#lyricsEditor')?.addEventListener('input',()=>{if(!current)return;current.lyrics=q('#lyricsEditor').value;scheduleSave()});
q('#motionList')?.addEventListener('input',()=>scheduleSave());
q('#shareText')?.addEventListener('input',()=>{if(!current)return;current.shareText=q('#shareText').value;scheduleSave()});
if(typeof renderShare==='function'){const b=renderShare;renderShare=function(){b();const el=q('#shareText');if(el&&current&&current.shareText&&document.activeElement!==el&&!q('#shareNow').hidden)el.value=current.shareText}}

/* 3. edit bar + autosave */
const head=q('.resulthead');
const bar=document.createElement('div');bar.className='edit-bar';
bar.innerHTML='<button type="button" class="outline" id="editToggle" aria-pressed="false">내용 고치기</button><button type="button" class="outline" id="sendDevice">다른 기기에서 이어서 편집</button><button type="button" class="outline" id="exportFile">파일로 내보내기</button><button type="button" class="outline" id="importFile">파일 가져오기</button><input type="file" id="importInput" accept=".json,application/json" hidden><span class="save-state" id="saveState" role="status" aria-live="polite"></span>';
const hint=document.createElement('p');hint.className='edit-hint';hint.textContent='점선 상자를 눌러 제목·말씀 풀이·실천·기도·내레이션을 바로 고치세요. 가사는 ‘찬양 가사’, 율동은 ‘율동’, 소개글은 ‘공유’ 탭에서 고칩니다. 고친 내용은 자동으로 저장돼요.';
head.after(bar,hint);
q('#editToggle').onclick=()=>{editing=!editing;document.body.classList.toggle('editing',editing);q('#editToggle').setAttribute('aria-pressed',String(editing));q('#editToggle').textContent=editing?'고치기 끝내기':'내용 고치기';setEditable(editing);if(editing){if(typeof setTab==='function')setTab('word');setTimeout(()=>q('#songTitle')?.focus(),50);toast('점선 상자를 눌러 고치세요. 자동 저장됩니다.')}else{flushSave();const tab=typeof activeTab!=='undefined'?activeTab:'';try{render();if(tab&&typeof setTab==='function')setTab(tab)}catch(x){}toast('고친 내용을 저장하고 소개글·썸네일 문구에 반영했어요.')}};

let saveTimer=null;
function setState(s){const el=q('#saveState');if(el)el.textContent=s}
function scheduleSave(){clearTimeout(saveTimer);setState('저장 중…');saveTimer=setTimeout(silentSave,700)}
function flushSave(){if(saveTimer){clearTimeout(saveTimer);silentSave()}}
function worthSaving(){return current&&(current.aiData||current.audioInfo||current.edits||tracks.has(current.id)||(current.lyrics&&history.some(x=>x.id===current.id)))}
function maybeSave(){if(worthSaving()){clearTimeout(saveTimer);saveTimer=setTimeout(silentSave,900)}}
function silentSave(){saveTimer=null;if(!current)return;const ed=q('#lyricsEditor');if(ed)current.lyrics=ed.value;current.mediaLinks=serializeMedia();current.updated=new Date().toISOString();
 const ix=history.findIndex(x=>x.id===current.id);const saved=JSON.parse(JSON.stringify(current));if(ix>=0)history[ix]=saved;else history.unshift(saved);history=history.slice(0,30);
 if(persist()){updateCount();setState('자동 저장됨 · '+hhmm()+(storageAvailable?'':' (이 창에만)'))}else setState('저장 공간 부족 · 파일로 내보내기를 이용하세요')}
window.addEventListener('pagehide',flushSave);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushSave()});
if(typeof showTrack==='function'){const b=showTrack;showTrack=function(){b();maybeSave()}}
if(typeof renderMedia==='function'){const b=renderMedia;renderMedia=function(){b();if(!mediaBusy)maybeSave()}}
if(typeof renderMotions==='function'){const b=renderMotions;renderMotions=function(){b()}}

/* 4. serialise / restore music, images, motions, subtitles */
function serializeMedia(){const out={};const t=tracks.get(current.id),prev=current.mediaLinks||{};
 if(t)out.track={link:t.link||current.audioInfo?.link||'',model:t.model,duration:t.duration,lyrics:t.lyrics,title:t.title,mode:t.mode,instrumental:!!t.instrumental,cues:t.cues||null,free:!!t.free};else if(prev.track)out.track=prev.track;
 const m=mediaStore.get(current.id);
 if(m&&(m.images?.length||m.motions?.length||m.cues)){out.media={look:m.look,imageModel:m.imageModel,mode:m.mode,instrumental:!!m.instrumental,mood:m.mood,plan:m.plan||null,planNote:m.planNote||'',motions:m.motions||[],cues:m.cues||null,cueSource:m.cueSource||'',heard:m.heard||'',yt:m.yt||null,videoLink:m.videoLink||current.mediaInfo?.videoLink||'',
  images:(m.images||[]).map(it=>{const o={};for(const k of Object.keys(it))if(!['blob','url','bitmap'].includes(k))o[k]=it[k];o.link=it.link||(it.blob&&it.blob._link)||'';return o}),
  thumbLink:(m.thumb&&m.thumb.bg&&m.thumb.bg._link)||m.thumbLink||''}}
 else if(prev.media)out.media=prev.media;
 return out}
async function getBlob(url){const r=await fetch(url);if(!r.ok)throw Error(r.status);return r.blob()}
async function restoreMedia(c){const ml=c&&c.mediaLinks;if(!ml)return;const id=c.id;const here=()=>current&&current.id===id;
 const jobs=[];
 if(ml.track&&ml.track.link&&!tracks.has(id))jobs.push((async()=>{try{const b=await getBlob(ml.track.link);const blob=new Blob([b],{type:'audio/mpeg'});tracks.set(id,{...ml.track,blob,url:URL.createObjectURL(blob)});if(here())showTrack()}catch(e){}})());
 const has=mediaStore.get(id);
 if(ml.media&&!(has&&has.images&&has.images.some(x=>x.status==='ok'))){const m=mediaFor(id);Object.assign(m,{look:ml.media.look,imageModel:ml.media.imageModel,mode:ml.media.mode,instrumental:ml.media.instrumental,mood:ml.media.mood,plan:ml.media.plan,planNote:ml.media.planNote,motions:ml.media.motions||[],cues:ml.media.cues,cueSource:ml.media.cueSource,heard:ml.media.heard,yt:ml.media.yt,videoLink:ml.media.videoLink||'',thumbLink:ml.media.thumbLink||'',video:null,thumb:null});
  m.images=(ml.media.images||[]).map(x=>({...x,status:x.link?'busy':'err',err:x.link?'':'이 장면은 다시 만들어야 해요'}));
  if(here()){try{renderMotions();renderMedia()}catch(e){}}
  for(const it of m.images){if(!it.link)continue;jobs.push((async()=>{try{const b=await getBlob(it.link);b._link=it.link;it.blob=b;it.url=URL.createObjectURL(b);it.status='ok';it.err=''}catch(e){it.status='err';it.err='보관 기간(30일)이 끝났거나 불러오지 못했어요'}if(here())try{renderMediaGrid()}catch(x){}})())}
  if(m.thumbLink)jobs.push((async()=>{try{const bg=await getBlob(m.thumbLink);bg._link=m.thumbLink;m.thumb={status:'ok',bg,...await thumbFrom(bg,themeFor(c),m.look||'illust')}}catch(e){}})())}
 await Promise.all(jobs);if(here()){try{showTrack();renderMotions();renderMedia();renderShare()}catch(e){}}}
window.restoreMedia=restoreMedia;

/* library: show edited titles and bring back music/images when opening */
function patchLibrary(){const rows=[...document.querySelectorAll('#historyList .historyitem')];rows.forEach((row,i)=>{const c=history[i];if(!c)return;const name=row.querySelector('strong');if(name)name.textContent=themeFor(c).title;const open=row.querySelector('.openitem');if(open&&!open.dataset.v9){open.dataset.v9='1';open.addEventListener('click',()=>{setTimeout(()=>{applyEdits();restoreMedia(current);try{showTrack();renderMedia()}catch(e){}},0)})}})}
const lb=q('#libraryBtn');if(lb){lb.onclick=()=>{library();patchLibrary();addLibImport()}}
function addLibImport(){const sub=q('#library .sub');if(sub&&!q('#libImport')){const b=document.createElement('button');b.type='button';b.className='outline';b.id='libImport';b.textContent='파일 가져오기';b.style.marginLeft='8px';b.onclick=()=>q('#importInput').click();sub.append(' ',b)}}

/* 5. send to another device */
async function uploadBlob(blob,name){const fd=new FormData();fd.append('file',new File([blob],name,{type:blob.type||'application/octet-stream'}));const r=await fetch('https://media.pollinations.ai/upload',{method:'POST',headers:{Authorization:'Bearer '+agentToken},body:fd});if(!r.ok)throw Error('업로드 실패 ('+r.status+')');const d=await r.json();return{id:d.id,url:d.url||('https://media.pollinations.ai/'+d.id)}}
async function ensureLinks(){if(!agentToken)return;const t=tracks.get(current.id);if(t&&!t.link&&t.blob){try{const u=await uploadBlob(t.blob,'song.mp3');t.link=u.url;current.audioInfo={...(current.audioInfo||{}),link:u.url}}catch(e){}}
 const m=mediaStore.get(current.id);if(!m)return;for(const it of m.images||[]){if(it.status==='ok'&&it.blob&&!it.link&&!it.blob._link){try{const u=await uploadBlob(it.blob,'scene.jpg');it.link=u.url;it.blob._link=u.url}catch(e){}}}
 if(m.thumb&&m.thumb.bg&&!m.thumb.bg._link&&!m.thumbLink){try{const u=await uploadBlob(m.thumb.bg,'thumb.jpg');m.thumb.bg._link=u.url;m.thumbLink=u.url}catch(e){}}}
function bundle(){silentSave();return{app:'word-rest',v:1,savedAt:new Date().toISOString(),project:JSON.parse(JSON.stringify(current)),links:(typeof musicLinks!=='undefined'?musicLinks.filter(x=>x.link===(current.audioInfo&&current.audioInfo.link)):[])}}
function b64u(bytes){let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unb64u(s){s=s.replace(/-/g,'+').replace(/_/g,'/');const bin=atob(s);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u}
async function packText(txt){const raw=new TextEncoder().encode(txt);if(typeof CompressionStream==='undefined')return 'u'+b64u(raw);const cs=new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'));return 'z'+b64u(new Uint8Array(await new Response(cs).arrayBuffer()))}
async function unpackText(s){const kind=s[0],bytes=unb64u(s.slice(1));if(kind==='u')return new TextDecoder().decode(bytes);const ds=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));return new Response(ds).text()}

const dlg=document.createElement('dialog');dlg.id='syncDialog';
dlg.innerHTML='<div class="dialoghead"><h2>다른 기기에서 이어서 편집</h2><button class="outline" type="button" id="syncClose">닫기</button></div><p class="sub" id="syncLead">휴대폰이나 다른 컴퓨터에서 이 링크를 열면 지금 곡을 그대로 이어서 고칠 수 있어요.</p><div class="sync-link"><input class="input" id="syncLink" readonly aria-label="이어서 편집 링크"><button class="outline" type="button" id="syncCopy">복사</button></div><div class="sync-actions"><button class="primary" type="button" id="syncShare">카카오톡·문자로 보내기</button><a class="outline download-link" id="syncOpen" target="_blank" rel="noopener">이 기기에서 열어보기 ↗</a></div><p class="localnote" id="syncNote"></p>';
document.body.append(dlg);
q('#syncClose').onclick=()=>dlg.close();
q('#syncCopy').onclick=()=>copyPlain(q('#syncLink').value);
q('#syncShare').onclick=()=>{const u=q('#syncLink').value;if(navigator.share)navigator.share({title:themeFor(current).title+' · 이어서 편집',url:u}).catch(()=>copyPlain(u));else copyPlain(u)};

q('#sendDevice').onclick=async()=>{if(!current)return;const btn=q('#sendDevice');if(btn.disabled)return;btn.disabled=true;const old=btn.textContent;btn.textContent='링크 만드는 중…';
 try{await ensureLinks();const b=bundle();const json=JSON.stringify(b);let url='',note='';
  if(agentToken){const u=await uploadBlob(new Blob([json],{type:'application/json'}),'word-rest-project.json');url=APPB+'#edit='+encodeURIComponent(u.id);note='링크는 30일 동안 열려요(무료). 가사·묵상·율동·소개글·음악·장면 이미지가 함께 옮겨집니다. 영상은 받는 기기에서 ‘영상 만들기 (무료)’로 다시 만들어요. 링크를 아는 사람은 이 원고를 볼 수 있으니 필요한 사람에게만 보내세요.'}
  else{const packed=await packText(json);if(packed.length>30000){toast('음악 에이전트를 연결하면 짧은 이어서 편집 링크를 만들 수 있어요. 지금은 파일로 내보냅니다.');exportFile();return}url=APPB+'#editdata='+packed;note='원고가 링크 안에 담겨 있어요. 음악·이미지는 링크가 있을 때만 옮겨집니다. 음악 에이전트를 연결하면 더 짧은 링크를 만들 수 있어요.'}
  q('#syncLink').value=url;q('#syncOpen').href=url;q('#syncNote').textContent=note;dlg.showModal()}
 catch(e){toast('링크를 만들지 못했어요: '+String(e.message||e).slice(0,80)+' · 파일로 내보내기를 이용하세요.')}
 finally{btn.disabled=false;btn.textContent=old}};

function exportFile(){if(!current)return;const b=bundle();const blob=new Blob([JSON.stringify(b,null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=('말씀에쉬다-'+themeFor(current).title).replace(/[<>:"/\\|?*\n\r]/g,'').slice(0,70)+'.json';document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000);toast('프로젝트 파일을 내려받았어요. 다른 기기에서 ‘파일 가져오기’로 열 수 있어요.')}
q('#exportFile').onclick=exportFile;
q('#importFile').onclick=()=>q('#importInput').click();
q('#importInput').onchange=async e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;try{const b=JSON.parse(await f.text());await importBundle(b,'파일')}catch(x){toast('이 파일을 열 수 없어요. 말씀에 쉬다에서 내보낸 .json 파일인지 확인하세요.')}};

async function importBundle(b,from){if(!b||b.app!=='word-rest'||!b.project||!b.project.id||typeof b.project.lyrics!=='string')throw Error('형식이 맞지 않아요');
 const p=b.project;const t=themeFor(p).title;const exist=history.find(x=>x.id===p.id);
 const msg=exist?'이 기기에 ‘'+t+'’ 곡이 이미 있어요. 받은 최신 내용으로 바꿔서 이어서 편집할까요?':'‘'+t+'’ 곡을 이 기기에서 이어서 편집할까요?';
 if(!confirm(msg))return false;
 if(typeof library==='function'&&q('#library')?.open)q('#library').close();
 current=p;if(q('#keyword'))q('#keyword').value=p.keyword||'';if(p.style&&q('#style'))q('#style').value=p.style;if(p.voice&&q('#voice'))q('#voice').value=p.voice;if(p.bpm&&q('#tempo')){q('#tempo').value=p.bpm;q('#bpmLabel').textContent=p.bpm}
 if(Array.isArray(b.links)&&typeof saveMusicLink==='function')for(const l of b.links){if(!musicLinks.some(x=>x.link===l.link))saveMusicLink(l)}
 tracks.delete(p.id);mediaStore.delete(p.id);
 render();silentSave();toast('‘'+t+'’을(를) 불러왔어요. 음악과 이미지를 가져오는 중…');
 await restoreMedia(current);silentSave();toast('이어서 편집할 준비가 됐어요. ‘내용 고치기’로 고쳐보세요.');return true}
window.importBundle=importBundle;

function clearHash(){try{window.history.replaceState(null,'',location.href.split('#')[0])}catch(x){}}
async function readEditHash(){const h=location.hash.replace(/^#/,'');let b=null;
 try{if(h.startsWith('edit=')){const id=decodeURIComponent(h.slice(5));if(!/^[\w-]{6,100}$/.test(id))return;toast('이어서 편집할 곡을 불러오는 중…');const r=await fetch('https://media.pollinations.ai/'+id,{cache:'no-store'});if(!r.ok)throw Error(r.status===404?'링크 보관 기간(30일)이 끝났어요':'불러오지 못했어요 ('+r.status+')');b=await r.json()}
  else if(h.startsWith('editdata=')){b=JSON.parse(await unpackText(h.slice(9)))}
  else return;
  clearHash();
  await importBundle(b,'링크')}
 catch(e){clearHash();toast('이어서 편집 링크를 열지 못했어요: '+String(e.message||e).slice(0,80))}}
window.addEventListener('hashchange',readEditHash);
setTimeout(readEditHash,300);

/* 6. app settings from config.js + "앱 고치기" */
const C=window.APP_CONFIG||null;
if(C){try{
 const setText=(sel,v)=>{const el=q(sel);if(el&&v!=null&&v!=='')el.textContent=v};
 const brand=q('.brand');if(brand&&C.brand){const tn=[...brand.childNodes].filter(n=>n.nodeType===3).pop();if(tn)tn.textContent=C.brand}
 setText('.edition',C.edition);setText('.eyebrow',C.eyebrow);setText('.artcaption',C.artCaption);
 const h1=q('.hero h1');if(h1&&(C.heroLine1||C.heroLine2))h1.innerHTML=esc(C.heroLine1||'')+'<br><em>'+esc(C.heroLine2||'')+'</em>';
 const hp=q('.hero p');if(hp&&C.heroText)hp.innerHTML=esc(C.heroText).replace(/\n/g,'<br>');
 if(C.keywordPlaceholder&&q('#keyword'))q('#keyword').placeholder=C.keywordPlaceholder;
 const fs=q('footer span');if(fs&&C.footerText)fs.innerHTML=esc(C.footerText).replace(/\n/g,'<br>');
 if(C.pageTitle)document.title=C.pageTitle;
 const r=document.documentElement.style;if(C.mainColor)r.setProperty('--green',C.mainColor);if(C.accentColor)r.setProperty('--gold',C.accentColor);if(C.backgroundColor)r.setProperty('--bg',C.backgroundColor);if(C.textColor)r.setProperty('--ink',C.textColor);
 if(C.customCSS){const s=document.createElement('style');s.textContent=C.customCSS;document.head.append(s)}
 if(typeof shareTextFor==='function'&&(C.shareSignature||C.shareNote)){const b=shareTextFor;shareTextFor=function(e){let s=b(e);if(C.shareSignature)s=s.replace('말씀에 쉬다 · 말씀이 찬양이 되는 순간',C.shareSignature);if(C.shareNote)s=s.replace(/성경에서 영감을 받은 창작 곡이며[^\n]*/,C.shareNote);return s};try{renderShare()}catch(x){}}
}catch(e){console.warn('config',e)}}

const REPO='https://github.com/silkim1220-source/word-rest';
const ed=document.createElement('dialog');ed.id='editApp';
ed.innerHTML='<div class="dialoghead"><h2>앱 고치기</h2><button class="outline" type="button" data-close="editApp">닫기</button></div>'+
'<p class="sub">어느 브라우저·기기에서든 GitHub에 로그인해서 고칠 수 있어요. 저장(Commit)하면 1~2분 뒤 이 주소에 반영됩니다.</p>'+
'<h3 class="sectiontitle">1. 화면 글자·색 바꾸기 (쉬움)</h3><ol><li>아래 버튼으로 <b>config.js</b> 편집 화면을 여세요.</li><li>따옴표 안의 글자나 색 코드만 바꾸세요.</li><li>오른쪽 위 <b>Commit changes</b> → 다시 <b>Commit changes</b>.</li><li>1~2분 뒤 앱을 새로고침하세요.</li></ol><a class="primary" href="'+REPO+'/edit/main/config.js" target="_blank" rel="noopener">config.js 고치기 ↗</a>'+
'<h3 class="sectiontitle">2. 화면 구성·기능 고치기</h3><ol><li><b>index.html</b>: 화면에 보이는 문구·버튼·안내문</li><li><b>app.css</b>: 디자인(글꼴 크기·여백·색)</li><li><b>app-01.js ~ app-09.js, web.js, edit.js</b>: 기능 코드 (고치기 전에 꼭 백업하세요)</li></ol><a class="outline" href="'+REPO+'/edit/main/index.html" target="_blank" rel="noopener">index.html 고치기 ↗</a> <a class="outline" href="https://github.dev/silkim1220-source/word-rest" target="_blank" rel="noopener">전체 편집기 열기 (PC) ↗</a>'+
'<h3 class="sectiontitle">되돌리기</h3><p class="localnote">잘못 고쳤다면 저장소의 <a href="'+REPO+'/commits/main" target="_blank" rel="noopener">변경 기록</a>에서 이전 버전을 확인할 수 있어요. 어려우면 Aside에게 “앱 되돌려줘”라고 말해 주세요.</p>';
document.body.append(ed);
ed.querySelector('[data-close]').onclick=()=>ed.close();
const foot=q('footer');if(foot&&isWeb){const b=document.createElement('button');b.type='button';b.id='editAppBtn';b.textContent='앱 고치기';b.onclick=()=>ed.showModal();foot.append(b)}

/* first paint */
try{applyEdits()}catch(e){}
})();
