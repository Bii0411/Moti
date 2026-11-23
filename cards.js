// moti 무빙 카드(26-1). 컬렉션 칸 하나 = 몸짓을 처음 본 순간의 카드. 값 data/collection.json card, 문구 data/ui.json album.card
// 카드 그림: 몸짓이 처음 나와 기록될 때(대화·선물) 그때 의상·장소로 그 몸짓의 멈춘 순간을 가로2:세로3 jpeg 한 장으로 만든다(seoaphoto.js make 재사용).
//   몸짓 재생이 끝난 뒤 만든다(화면이 버벅이지 않게). 처음 것만 남기고 바꾸지 않는다.
//   저장은 IndexedDB "moti_cards"(사진 저장소 moti_photos 와 따로, 사진 칸 수에 안 들어감). 열쇠 = 「캐릭터 id:칸 id」
// 예전 저장값(그림 없는 카드)은 컬렉션을 처음 열 때 기본 의상과 기록된 장소(없으면 바 1층)로 한 번 만들어 채운다.
// photos.js·seoaphoto.js 다음, index.html 본 스크립트보다 먼저 불린다. S·DATA·COL·Stage·UI 등은 함수 안에서만 쓴다.

const Cards=(()=>{
  const C=()=>(typeof COL!=="undefined"&&COL.card)||{};
  const keyOf=(ch,id)=>(ch||"seoa")+":"+id;
  // ── 저장소 ──
  let dbp=null,have=new Set(),loaded=null;const urls={},subs=[];
  function db(){return dbp||(dbp=new Promise((res,rej)=>{let r;try{r=indexedDB.open("moti_cards",1)}catch(e){return rej(e)}
    r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains("img"))d.createObjectStore("img",{keyPath:"id"})};
    r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}))}
  const req=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
  const done=tx=>new Promise((res,rej)=>{tx.oncomplete=()=>res();tx.onerror=tx.onabort=()=>rej(tx.error)});
  const store=(mode)=>db().then(d=>{const tx=d.transaction("img",mode);return{tx,os:tx.objectStore("img")}});
  const emit=k=>subs.forEach(f=>{try{f(k)}catch(e){console.error(e)}});
  // 처음 한 번: 어떤 카드에 그림이 있는지만 읽음(그림은 볼 때 꺼냄)
  function init(){return loaded||(loaded=store("readonly").then(({os})=>req(os.getAllKeys())).then(k=>{have=new Set(k)}).catch(e=>{console.warn("카드 저장소를 열지 못함",e)}))}
  const has=(ch,id)=>have.has(keyOf(ch,id));
  async function blob(ch,id){const k=keyOf(ch,id);if(!have.has(k))return null;try{const {os}=await store("readonly");const r=await req(os.get(k));return r?new Blob([r.data],{type:r.type||"image/jpeg"}):null}catch(e){return null}}
  // 그림 주소(없으면 null). 한 번 만든 주소는 다시 씀
  async function url(ch,id){const k=keyOf(ch,id);if(urls[k])return urls[k];const b=await blob(ch,id);if(!b)return null;return urls[k]=URL.createObjectURL(b)}
  const urlNow=(ch,id)=>urls[keyOf(ch,id)]||null;
  async function put(ch,id,b,meta){const k=keyOf(ch,id);if(have.has(k))return false;  // 처음 것만
    const data=await b.arrayBuffer();  // 바이트를 먼저(트랜잭션을 연 뒤 기다리면 닫혀 버림). 예전 사파리 Blob 문제로 ArrayBuffer 저장
    const {tx,os}=await store("readwrite");os.put({id:k,char:ch||"seoa",cid:id,type:b.type,size:b.size,at:Date.now(),...meta,data});await done(tx);have.add(k);emit(k);return true}
  const revoke=k=>{if(urls[k]){URL.revokeObjectURL(urls[k]);delete urls[k]}};
  async function remove(ch,ids){try{const {tx,os}=await store("readwrite");ids.forEach(id=>{const k=keyOf(ch,id);os.delete(k);have.delete(k);revoke(k)});await done(tx)}catch(e){}queue=queue.filter(q=>!ids.includes(q.id));emit(null)}
  async function clear(){try{const {tx,os}=await store("readwrite");os.clear();await done(tx)}catch(e){}have.clear();Object.keys(urls).forEach(revoke);queue=[];emit(null)}

  // ── 처음 본 순간 ──
  // 칸 id → 그릴 몸짓·표정·속도. 선물 칸(g01…)은 임시 재생 설정 play, 대화 칸은 그 몸짓 그대로
  function motionOf(id){const it=colBy(id)||{},p=it.play||{},F=C().faceById||{};
    if(it.source==="gift")return{m:p.m,f:p.f||"soft",sp:p.speed>0?p.speed:1};
    const fs=((((DATA.onboarding||{}).film||{}).shots)||[]).find(s=>s.id===id);
    return{m:id,f:F[id]||(fs&&fs.face)||C().face||"soft",sp:1}}
  const frameOf=m=>({...(C().frame||{top:1.08,bottom:.34,width:.56,lift:.03,center:.3}),...((C().frameById||{})[m]||{})});
  // 기록할 때 같이 남길 값(index.html seenNow 가 부름): 의상·장소·이야기 줄기·캐릭터·관계 단계
  // 기록이 생긴 칸의 그림 만들기를 예약. 대화 무대가 하던 일이 끝난 뒤(몸짓·해금 연출·사진 보내기·촬영) 하나씩
  let queue=[],running=false,timer=null;
  function capture(id,o={}){const a=S.col[id];if(!a||has(a.char,id)||queue.some(q=>q.id===id))return;
    queue.push({id,at:performance.now()+(o.delay!=null?o.delay:(C().afterMs!=null?C().afterMs:1500))});kick()}
  function kick(ms){clearTimeout(timer);timer=setTimeout(step,ms!=null?ms:(C().waitMs||600))}
  // 대화 무대가 바쁜지: 몸짓 재생 중·해금 연출 대기·촬영·서아 사진 만드는 중·카드 확대 재생 중
  const busyNow=()=>!!(Stage.recentMotion(0)||(typeof unlockBusy!=="undefined"&&(unlockBusy||unlockQ.length))||(typeof Cam!=="undefined"&&Cam.isOpen())||(typeof SeoaPhoto!=="undefined"&&SeoaPhoto.isSending())||viewOn());
  async function step(){
    if(running||!queue.length)return;
    const q=queue[0];if(performance.now()<q.at)return kick(q.at-performance.now()+20);
    if(busyNow())return kick();
    queue.shift();running=true;
    try{await make(q.id)}catch(e){console.error("카드 그림을 만들지 못함",q.id,e)}
    running=false;if(queue.length)kick(C().gapMs||400)}
  const perf=[];
  async function make(id){const a=S.col[id];if(!a||has(a.char,id))return;
    await init();if(has(a.char,id))return;
    const mo=motionOf(id);if(!mo.m||!canPlay(mo.m))return;
    const t0=performance.now();
    const r=await SeoaPhoto.make({card:true,mid:mo.m,face:mo.f,K:frameOf(mo.m),scene:a.scene!=null&&SCENES[a.scene]?a.scene:(C().defaultScene||0),outfit:a.outfit||C().defaultOutfit||"ops",image:C().image||{aspect:[2,3],longPx:720,quality:.8,maxKB:80},at:(C().momentById||{})[id]});
    if(!S.col[id])return;  // 그사이 초기화
    await put(a.char,id,r.full,{outfit:a.outfit,scene:a.scene,mid:mo.m,w:r.w,h:r.h});
    perf.push({id,outfit:a.outfit,scene:a.scene,...r.ms,kb:Math.round(r.full.size/1024),total:Math.round(performance.now()-t0)});
  }
  // 그림 없는 카드 채우기(컬렉션을 열 때): 예전 저장값은 기본 의상·기록된 장소(없으면 바 1층)를 기록에도 적어 둠
  async function fill(){await init();let n=0;
    for(const id in S.col){const a=S.col[id];if(!a||!colBy(id))continue;
      if(!a.outfit){a.outfit=C().defaultOutfit||"ops";if(a.scene==null||!SCENES[a.scene])a.scene=C().defaultScene||0;if(!a.char)a.char="seoa";a.old=1;n++}
      if(!has(a.char,id))capture(id,{delay:0})}
    if(n)save();return n}

  // 카드 확대(26-1B)가 쓰는 자리. 26-1A 에서는 늘 꺼져 있음
  let viewOn=()=>false;
  return{init,has,url,urlNow,blob,put,remove,clear,capture,fill,make,motionOf,frameOf,onChange:f=>subs.push(f),perf,queue:()=>queue.map(q=>q.id),
    _setView:f=>{viewOn=f}};
})();
