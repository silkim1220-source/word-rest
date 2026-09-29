
/* === v4 share links, mode bar, realistic theme hooks === */
async function uploadVideoLink(){const m=mediaFor();if(!m.video)return toast('먼저 영상을 만들어주세요.');if(!agentToken){accountUI();$('#authDialog').showModal();return}
 if(!confirm('영상을 Pollinations 미디어 저장소에 올려 공유 링크를 만들까요?\n\n· 링크를 아는 누구나 볼 수 있습니다 (검색 비노출)\n· 30일 보관, 15일이 지난 뒤 재생되면 연장\n· 올린 파일은 이 앱에서 삭제할 수 없습니다'))return;
 const btn=$('#videoLinkBtn');btn.disabled=true;btn.textContent='영상 링크 만드는 중…';
 try{const fd=new FormData();fd.append('file',new File([m.video.blob],fileBase().replace(/[^\p{L}\p{N}_-]+/gu,'-')+'.'+m.video.ext,{type:m.video.mime}));const r=await fetch('https://media.pollinations.ai/upload',{method:'POST',headers:{Authorization:'Bearer '+agentToken},body:fd});if(!r.ok)throw mediaApiError(r.status,await readErr(r));const d=await r.json();const url=d.url||(d.id?'https://media.pollinations.ai/'+d.id:'');if(!/^https:\/\/media\.pollinations\.ai\//.test(url))throw Error('링크를 받지 못했습니다.');m.videoLink=url;current.mediaInfo={...(current.mediaInfo||{}),videoLink:url};toast('영상 공유 링크가 만들어졌어요.')}
 catch(e){toast('영상 링크를 만들지 못했습니다: '+agentError(e))}finally{btn.textContent='영상 공유 링크 만들기 (업로드)';renderMedia()}}
function renderLinks(){const m=mediaFor();const vl=m.videoLink||current.mediaInfo?.videoLink||'';$('#pubVideoLink').value=vl;$('#pubVideoRow').hidden=!vl;$('#videoLinkBtn').hidden=!!vl;$('#videoLinkBtn').disabled=!m.video||agentBusy||mediaBusy}
const baseRenderMediaV4=renderMedia;renderMedia=function(){baseRenderMediaV4();if($('#pubMusicLink'))renderLinks()};
const ttl=()=>themeFor(current).title+' · 말씀에 쉬다';
$('#copyMusicLink').onclick=()=>copyPlain($('#musicLink').value);$('#shareMusicLink').onclick=()=>shareLink($('#musicLink').value,ttl());

$('#pubCopyVideo').onclick=()=>copyPlain($('#pubVideoLink').value);$('#pubShareVideo').onclick=()=>shareLink($('#pubVideoLink').value,ttl());$('#videoLinkBtn').onclick=uploadVideoLink;
document.querySelectorAll('[data-mode]').forEach(b=>{b.onclick=()=>{if(agentBusy||mediaBusy)return;applyMode(b.dataset.mode);toast(MODES[b.dataset.mode].label+' 설정을 불러왔어요.')};b.onkeydown=e=>{const list=[...document.querySelectorAll('[data-mode]')];const i=list.indexOf(b);if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const n=list[(i+(e.key==='ArrowRight'?1:list.length-1))%list.length];n.focus();n.click()}}});
document.querySelectorAll('[data-voice]').forEach(b=>{b.onclick=()=>{if(agentBusy||mediaBusy)return;setVoice(b.dataset.voice)}});document.querySelectorAll('[data-mood]').forEach(b=>{b.onclick=()=>{if(agentBusy||mediaBusy)return;toggleMood(b.dataset.mood)}});
MODE_FIELDS.forEach(f=>{const el=$('#'+f);if(el){el.addEventListener('change',saveModeFields);if(el.type==='range'||el.type==='number')el.addEventListener('input',saveModeFields)}});
const baseSetBusyV4=setBusy;setBusy=function(b){baseSetBusyV4(b);document.querySelectorAll('[data-mode],[data-voice],[data-mood]').forEach(x=>x.disabled=b)};
applyMode(modeStore.active,false);renderMedia();

