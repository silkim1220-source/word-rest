
/* === v6 music share links: anyone with the link can listen; saved list on this device === */
const LINK_KEY='word-rest-music-links-v1';
const SEED_LINKS=[
 {"id":"seed-ccm","link":"https://media.pollinations.ai/f5e4d2168b29adf33c69fe9843128c0ba39b310d00ba7579a006149acf1da8d6","title":"소망의 빛","mode":"ccm","instrumental":false,"voice":"female","mood":"hopeful","duration":30,"ref":"로마서 15:13","created":"2026-09-29T06:26:29.385Z","sample":true},
 {id:'seed-hymn',link:'https://media.pollinations.ai/9469c873961b346d249614bdc01a0d549bbecf63f3396ef26841a027e1138b96',title:'은혜를 기억하는 감사',mode:'hymn',instrumental:false,voice:'choir',mood:'grace',duration:30,ref:'시편 103:1~5',created:'2026-09-29T06:06:53.163Z',sample:true},
 {id:'seed-piano',link:'https://media.pollinations.ai/cd7da527ff71ea5423edf8d8e1b2f8cd0dfbd918907c4041f1270800a8929314',title:'온유한 쉼을 배우며',mode:'piano',instrumental:true,voice:'none',mood:'calm',duration:30,ref:'마태복음 11:28~30',created:'2026-09-29T05:52:00.000Z',sample:true}];
function loadLinks(){try{const v=storageAvailable&&JSON.parse(localStorage.getItem(LINK_KEY)||'null');if(Array.isArray(v))return v}catch(e){}return SEED_LINKS.slice()}
let musicLinks=loadLinks();const linkStatus=new Map();
function persistLinks(){try{if(storageAvailable)localStorage.setItem(LINK_KEY,JSON.stringify(musicLinks.slice(0,200)))}catch(e){toast('브라우저 저장 공간이 부족해 링크 목록을 저장하지 못했습니다. 링크를 따로 복사해 두세요.')}}
function saveMusicLink(e){if(!/^https:\/\/media\.pollinations\.ai\//.test(e.link||''))return;musicLinks=musicLinks.filter(x=>x.link!==e.link);musicLinks.unshift({id:Date.now().toString(36),created:new Date().toISOString(),...e});persistLinks();linkStatus.set(e.link,'ok');renderShare()}
function styleName(e){return (MODES[e.mode]?.label||'찬양')+(e.instrumental?' 연주곡':'')}
function shareTextFor(e){if(!e)return '';return [e.title,styleName(e)+(e.ref?' · '+e.ref:'')+(e.voice&&!e.instrumental?' · '+(VOICE_LABEL[e.voice]||''):''),'','▶ 듣기: '+e.link,'','말씀에 쉬다 · 말씀이 찬양이 되는 순간','성경에서 영감을 받은 창작 곡이며 AI 음악 모델로 만들었습니다. 링크를 누르면 로그인 없이 바로 들을 수 있어요.'].join('\n')}
function currentShareEntry(){const t=tracks.get(current.id);const link=t?.link||current.audioInfo?.link||'';if(!link)return null;return musicLinks.find(x=>x.link===link)||{link,title:themeFor(current).title,mode:current.mode||activeMode,instrumental:!!current.instrumental,voice:current.voice,mood:current.mood,ref:themeFor(current).ref}}
function fmtDate(s){const d=new Date(s);return isNaN(d)?'':(d.getMonth()+1)+'월 '+d.getDate()+'일 '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
function daysLeft(e){const d=30-Math.floor((Date.now()-new Date(e.created))/86400000);return d}
async function checkLinks(){for(const e of musicLinks.slice(0,40)){if(linkStatus.get(e.link)==='ok'&&!e.sample)continue;try{const r=await fetch(e.link+'/metadata',{cache:'no-store'});linkStatus.set(e.link,r.ok?'ok':'gone')}catch(x){linkStatus.set(e.link,'unknown')}}renderShare()}
const libAudio=new Audio();libAudio.preload='none';let libPlaying='';
libAudio.onended=()=>{libPlaying='';renderShare()};libAudio.onerror=()=>{if(libPlaying){toast('이 기기에서 링크를 재생하지 못했습니다. ‘열기’로 브라우저에서 들어보세요.');libPlaying='';renderShare()}};
function playLink(url){if(libPlaying===url){libAudio.pause();libPlaying='';renderShare();return}libAudio.src=url;libAudio.play().then(()=>{libPlaying=url;renderShare()},()=>toast('재생하지 못했습니다. ‘열기’를 눌러 들어보세요.'))}
function renderShare(){if(!$('#shareNow'))return;const cur=currentShareEntry();$('#shareNow').hidden=!cur;$('#shareNowEmpty').hidden=!!cur;
 if(cur){$('#shareNowTitle').textContent=cur.title;$('#shareNowMeta').textContent=styleName(cur)+(cur.ref?' · '+cur.ref:'');$('#pubMusicLink').value=cur.link;if(document.activeElement!==$('#shareText'))$('#shareText').value=shareTextFor(cur);$('#pubOpenMusic').href=cur.link}
 const list=$('#linkLibrary');$('#linkCount').textContent=musicLinks.length+'곡';
 list.replaceChildren(...musicLinks.map(e=>{const li=document.createElement('li');li.className='lib-item';const st=linkStatus.get(e.link);const left=daysLeft(e);
  const head=document.createElement('div');head.className='lib-head';const play=document.createElement('button');play.type='button';play.className='lib-play';play.textContent=libPlaying===e.link?'❚❚':'▶';play.setAttribute('aria-label',(libPlaying===e.link?'일시정지: ':'재생: ')+e.title);play.onclick=()=>playLink(e.link);
  const info=document.createElement('div');const b=document.createElement('b');b.textContent=e.title+(e.sample?' (예시)':'')+((e.provider==='suno'||/suno\.com/.test(e.link))?' · Suno':e.engine==='free'?' · 무료 작곡':'');const meta=document.createElement('small');meta.textContent=styleName(e)+(e.ref?' · '+e.ref:'')+' · '+fmtDate(e.created);info.append(b,meta);
  const badge=document.createElement('span');badge.className='lib-badge '+(st==='gone'?'gone':st==='ok'?'ok':'');badge.textContent=st==='gone'?'만료됨':st==='ok'?'누구나 재생 가능':'확인 전';head.append(play,info,badge);
  const act=document.createElement('div');act.className='lib-actions';const mk=(label,fn,cls='outline')=>{const x=document.createElement('button');x.type='button';x.className=cls;x.textContent=label;x.onclick=fn;return x};
  const open=document.createElement('a');open.className='outline download-link';open.href=e.link;open.target='_blank';open.rel='noopener noreferrer';open.textContent='열기 ↗';
  act.append(mk('링크 복사',()=>copyPlain(e.link)),mk('소개글+링크 복사',()=>copyText(shareTextFor(e),'소개글과 링크를')),mk('공유',()=>shareLink(e.link,e.title+' · 말씀에 쉬다'),'primary'),open,mk('목록에서 빼기',()=>{if(!confirm('이 기기의 목록에서만 뺍니다. 링크 자체는 30일 동안 계속 열립니다.'))return;musicLinks=musicLinks.filter(x=>x.link!==e.link);persistLinks();renderShare()},'outline lib-remove'));
  const note=document.createElement('p');note.className='localnote';note.textContent=(e.provider==='suno'||/suno\.com/.test(e.link))?'Suno에 보관 · 링크가 있으면 누구나 들을 수 있어요 (Link Only)':st==='gone'?'보관 기간이 끝나 더 이상 열리지 않습니다.':left>15?'약 '+left+'일 보관 · 15일이 지난 뒤 누군가 들으면 30일 연장':'보관 기간이 곧 끝날 수 있어요 · 들으면 30일 연장됩니다';
  li.append(head,act,note);return li}));$('#libEmpty').hidden=!!musicLinks.length}
$('#pubCopyMusic').onclick=()=>copyPlain($('#pubMusicLink').value);$('#pubShareMusic').onclick=()=>{const c=currentShareEntry();if(c)shareLink(c.link,c.title+' · 말씀에 쉬다')};
$('#copyShareText').onclick=()=>copyText($('#shareText').value,'소개글과 링크를');$('#checkLinksBtn').onclick=()=>{toast('링크 상태를 확인하는 중이에요…');checkLinks()};
$('#myMusicBtn').onclick=()=>{setTab('publish');checkLinks();document.getElementById('pane-publish').scrollIntoView({behavior:'smooth',block:'start'})};
document.querySelector('#tab-publish').addEventListener('click',()=>checkLinks());
const baseRenderMediaV6=renderMedia;renderMedia=function(){baseRenderMediaV6();renderShare()};
renderShare();

