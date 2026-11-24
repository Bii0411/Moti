// moti 이야기마다 셀카 프로필(46-C). 대화 목록 서아 줄의 왼쪽 프로필 = 지금 보이는 칸(이야기)의 셀카.
// 셀카: 45·45-1 손이 폰이 되는 셀카(data/config.json storyPic.types, high·close)를 그 이야기의 마지막 장소에서 그 이야기에서 지금 입는 옷으로, 작은 정사각형(px) 한 장.
//   만드는 것은 seoaPhoto.js SeoaPhoto.make(card: true — 서아 사진 기록·마지막 몸짓을 바꾸지 않음) 그대로: 화면 밖에서 같은 작업 안에 그리고 되돌림,
//   확대(View)가 움직이는 중이면 끝날 때까지 미룸(32-A 비율 규칙).
// 다시 만드는 때: 그 이야기의 옷이 기록(S.pf[이야기].outfit)과 달라질 때만(장소만 바뀌면 그대로). 만드는 동안·실패하면 원래 프로필 그림(card_seoa.jpg).
// 만드는 때: 대화 목록이 보일 때(Swipe.bind) 예약 → 서아 대화방 3D 가 보이지 않고, 걷기·확대·사진·카드 그리기·촬영이 아닐 때 한 장씩(보이는 칸 먼저).
// 저장: IndexedDB "moti_storypic"(카드 moti_cards·사진 moti_photos 와 따로), 열쇠 = 이야기 id("main"·"s2"…). 기록 S.pf[이야기] = {outfit, scene, type, at}
// cards.js 다음, index.html 본 스크립트보다 먼저 불린다. S·DATA·Swipe·Stage 등은 함수 안에서만 쓴다.

const StoryPic=(()=>{
  const C=()=>(typeof DATA!=="undefined"&&DATA.config&&DATA.config.storyPic)||{};
  const rec=()=>S.pf||(S.pf={});
  // ── 저장소 ──
  let dbp=null,loaded=null;const urls={},failed={},perf=[];
  function db(){return dbp||(dbp=new Promise((res,rej)=>{let r;try{r=indexedDB.open("moti_storypic",1)}catch(e){return rej(e)}
    r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains("img"))d.createObjectStore("img",{keyPath:"id"})};
    r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}))}
  const req=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
  const done=tx=>new Promise((res,rej)=>{tx.oncomplete=()=>res();tx.onerror=tx.onabort=()=>rej(tx.error)});
  const store=mode=>db().then(d=>{const tx=d.transaction("img",mode);return{tx,os:tx.objectStore("img")}});
  const setUrl=(k,b)=>{if(urls[k])URL.revokeObjectURL(urls[k]);urls[k]=URL.createObjectURL(b)};
  // 처음 한 번: 저장된 셀카를 모두 꺼내 둠(이야기 수만큼, 몇 장 안 됨). 목록을 다시 그릴 때 바로 쓰게
  function init(){return loaded||(loaded=store("readonly").then(({os})=>req(os.getAll())).then(L=>{for(const r of L||[])if(r&&r.data&&rec()[r.id])setUrl(r.id,new Blob([r.data],{type:r.type||"image/jpeg"}))}).catch(e=>{console.warn("셀카 프로필 저장소를 열지 못함",e)}))}
  async function put(k,b,meta){const data=await b.arrayBuffer();const {tx,os}=await store("readwrite");os.put({id:k,type:b.type,size:b.size,...meta,data});await done(tx)}
  async function clear(){try{const {tx,os}=await store("readwrite");os.clear();await done(tx)}catch(e){}Object.keys(urls).forEach(k=>{URL.revokeObjectURL(urls[k]);delete urls[k]});queue=[];delete S.pf}

  // 이 이야기의 셀카 주소. 지금 옷과 같은 옷으로 만든 것만(옷이 바뀌었으면 다시 만들 때까지 null = 원래 프로필 그림)
  function url(k){const r=rec()[k];return r&&urls[k]&&r.outfit===Swipe.outfitOf(k)?urls[k]:null}

  // ── 만들기 차례 ──
  let queue=[],running=false,timer=null;
  const inRoom=()=>typeof curTab!=="undefined"&&curTab==="chat"&&S.room==="seoa";
  // 서아 대화방 3D 가 보이는 중이거나 무대가 다른 일을 하는 중이면 기다림
  const busyNow=()=>!!(inRoom()||(typeof Onboard!=="undefined"&&Onboard.isOpen())||(Stage.walk&&Stage.walk.busy&&Stage.walk.busy())||(typeof View!=="undefined"&&View.moving&&View.moving()>0)||
    (typeof SeoaPhoto!=="undefined"&&SeoaPhoto.isSending())||(typeof Cards!=="undefined"&&Cards.running())||(typeof Cam!=="undefined"&&Cam.isOpen())||(typeof unlockBusy!=="undefined"&&(unlockBusy||unlockQ.length))||(typeof FirstMeet!=="undefined"&&FirstMeet.isOn()));
  function kick(ms){clearTimeout(timer);timer=setTimeout(step,ms!=null?ms:(C().waitMs!=null?C().waitMs:300))}
  // 셀카가 필요한 이야기들(목록의 칸 순서). 기록된 옷과 지금 옷이 다르거나 그림이 없으면 차례에 넣음. 이번에 실패한 옷은 다시 열 때까지 안 넣음
  async function need(keys){await init();let n=0;
    for(const k of keys){const o=Swipe.outfitOf(k);if(url(k)||failed[k]===o||queue.includes(k))continue;queue.push(k);n++}
    if(n)kick()}
  async function step(){if(running||!queue.length)return;if(busyNow())return kick(C().retryMs||1500);
    const k=queue.includes(Swipe.key)?Swipe.key:queue[0];queue=queue.filter(x=>x!==k);
    if(url(k))return kick(0);
    running=true;try{await make(k)}catch(e){console.warn("셀카 프로필을 만들지 못함",k,e);failed[k]=Swipe.outfitOf(k)}
    running=false;if(queue.length)kick(C().gapMs||600)}
  const pick=a=>a&&a.length?a[Math.floor(Math.random()*a.length)]:undefined;
  async function make(k){const o=Swipe.outfitOf(k),sc=Swipe.sceneOf(k),type=pick(C().types||["high","close"]),t0=performance.now();
    const px=C().px||192;
    const r=await SeoaPhoto.make({card:true,shot:"selfie",selfie:type,scene:sc,outfit:o,image:{aspect:[1,1],longPx:px,quality:C().quality||.82,minQuality:.5,maxKB:C().maxKB||40}});
    if(Swipe.outfitOf(k)!==o){if(!queue.includes(k))queue.push(k);return}  // 그사이 옷이 바뀜 → 다시
    const at=Date.now();await put(k,r.full,{outfit:o,scene:sc,at});
    rec()[k]={outfit:o,scene:sc,type,at};save();delete failed[k];setUrl(k,r.full);
    perf.push({k,outfit:o,scene:sc,type,mid:r.mid,...r.ms,kb:Math.round(r.full.size/1024),total:Math.round(performance.now()-t0)});
    if(typeof Swipe!=="undefined")Swipe.pic(k)}

  return{init,need,url,clear,perf,queue:()=>queue.slice(),running:()=>running};
})();
