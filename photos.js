// moti 사진(10단계): ＋ 기능판의 카메라·사진. 설정 data/photos.json, 문구 data/ui.json (cam·photoFull·photo)
// Photos  : 사진 저장소. IndexedDB "moti_photos" — meta(정보 + 목록용 작은 사진), full(큰 사진). 칸 수 계산
// Cam     : 촬영 화면. 대화방 3D 그림판을 빌려 옴(모델을 다시 불러오지 않음). 확대·돌기·멈춤·셔터
// PhotoUI : 사진 시트(목록)·크게 보기·공유·지우기, 가득 참 시트, 시연 패널 「사진 가득 채우기」
// index.html 본 스크립트보다 먼저 불린다. S·DATA·Stage·UI·toast 등은 함수 안에서만 쓴다.
// 찍을 때 서아는 말하지 않는다. 대화 기록·서버에는 사진 관련 내용을 남기지 않는다. blur·filter 효과 없음(아이폰 사파리).

const PCFG=()=>(typeof DATA!=="undefined"&&DATA.photos)||{};
const SVG={
  close:'<path d="M6 6l12 12M18 6L6 18"/>',
  pause:'<path d="M9 6v12M15 6v12"/>',
  play:'<path d="M8.5 5.8v12.4L18.5 12z"/>',
  share:'<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M7.5 10.5H6a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5h-1.5"/>',
  heart:'<path d="M12 19.5s-7.5-4.6-7.5-10.1A4.1 4.1 0 0 1 12 7.1a4.1 4.1 0 0 1 7.5 2.3c0 5.5-7.5 10.1-7.5 10.1z"/>',
  trash:'<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/>',
  down:'<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>'
};
const icon=(k,cls)=>`<svg class="${cls||"ic"}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SVG[k]}</svg>`;

// ───────────────────────── 저장소 ─────────────────────────
const Photos=(()=>{
  let dbp=null,list=[],urls={},subs=[],loaded=null;const perf={};
  function db(){return dbp||(dbp=new Promise((res,rej)=>{let r;try{r=indexedDB.open("moti_photos",1)}catch(e){return rej(e)}
    r.onupgradeneeded=()=>{const d=r.result;["meta","full"].forEach(n=>{if(!d.objectStoreNames.contains(n))d.createObjectStore(n,{keyPath:"id"})})};
    r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}))}
  const req=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
  const done=tx=>new Promise((res,rej)=>{tx.oncomplete=()=>res();tx.onerror=tx.onabort=()=>rej(tx.error)});
  // 사진 바이트는 ArrayBuffer 로 저장(예전 사파리의 IndexedDB Blob 문제를 피함)
  const buf=b=>b.arrayBuffer?b.arrayBuffer():new Response(b).arrayBuffer();
  const emit=()=>subs.forEach(f=>{try{f()}catch(e){console.error(e)}});
  const revoke=id=>{if(urls[id]){URL.revokeObjectURL(urls[id]);delete urls[id]}};
  async function load(){const t0=performance.now(),d=await db();const all=await req(d.transaction("meta").objectStore("meta").getAll());
    Object.keys(urls).forEach(revoke);list=all.sort((a,b)=>b.at-a.at);perf.loadMs=Math.round(performance.now()-t0);perf.loadCount=list.length}
  function init(){return loaded||(loaded=load().catch(e=>{console.warn("사진 저장소를 열지 못함",e);list=[]}).then(emit))}
  const thumbUrl=m=>urls[m.id]||(urls[m.id]=URL.createObjectURL(new Blob([m.thumb],{type:m.thumbType||"image/jpeg"})));
  const cfg=()=>PCFG().slots||{};
  // 칸 수 = 무료 + 산 칸(S.photoSlots × step). PLUS 이용 중이면 plusCap(산 칸이 더 많으면 그쪽)
  function cap(){const c=cfg(),base=(c.free!=null?c.free:20)+(S.photoSlots||0)*(c.step||10);return S.plus?Math.max(c.plusCap||200,base):base}
  const count=()=>list.length,full=()=>list.length>=cap();
  async function add(meta,fullBlob,thumbBlob){
    const t0=performance.now(),d=await db();
    const m={...meta,type:fullBlob.type,size:fullBlob.size,thumbType:thumbBlob.type,thumb:await buf(thumbBlob)},f={id:meta.id,data:await buf(fullBlob)};
    const tx=d.transaction(["meta","full"],"readwrite");tx.objectStore("meta").put(m);tx.objectStore("full").put(f);await done(tx);
    list.unshift(m);list.sort((a,b)=>b.at-a.at);emit();return{ms:Math.round(performance.now()-t0)}}
  // 여러 장 한 번에(시연 「사진 가득 채우기」)
  async function addMany(items){const d=await db();const tx=d.transaction(["meta","full"],"readwrite");const ms=tx.objectStore("meta"),fs=tx.objectStore("full");
    for(const it of items){ms.put(it.m);fs.put(it.f)}await done(tx);list=list.concat(items.map(x=>x.m)).sort((a,b)=>b.at-a.at);emit()}
  async function blob(id){const d=await db();const r=await req(d.transaction("full").objectStore("full").get(id));const m=list.find(x=>x.id===id);
    return r?new Blob([r.data],{type:(m&&m.type)||"image/jpeg"}):null}
  async function setLiked(id,on){const m=list.find(x=>x.id===id);if(!m)return;m.liked=!!on;const d=await db();const tx=d.transaction("meta","readwrite");tx.objectStore("meta").put(m);await done(tx);emit()}
  async function remove(id){const d=await db();const tx=d.transaction(["meta","full"],"readwrite");tx.objectStore("meta").delete(id);tx.objectStore("full").delete(id);await done(tx);
    revoke(id);list=list.filter(x=>x.id!==id);emit()}
  async function clear(){try{const d=await db();const tx=d.transaction(["meta","full"],"readwrite");tx.objectStore("meta").clear();tx.objectStore("full").clear();await done(tx)}catch(e){}
    Object.keys(urls).forEach(revoke);list=[];emit()}
  // 칸 늘리기 +step(💎 stepPrice, 영구)
  function buySlots(){const c=cfg(),price=c.stepPrice||50;
    if(S.dia<price){toast(esc(UI("photoFull.noDia")));return false}
    S.dia-=price;S.photoSlots=(S.photoSlots||0)+1;save();renderTop();toast(esc(UI("photo.grown",{cap:cap()})));emit();return true}
  // PLUS 시작(마이 페이지 버튼과 같은 시연 동작: 💎 300 지급)
  function startPlus(){if(S.plus)return;S.plus=true;S.dia+=300;save();renderTop();toast(esc(UI("photo.plusStart"))+"<br>"+esc(UI("photo.grown",{cap:cap()})),3000);emit()}
  return{init,list:()=>list,count,cap,full,add,addMany,blob,setLiked,remove,clear,thumbUrl,buySlots,startPlus,onChange:f=>subs.push(f),perf,newId:()=>"p"+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36)};
})();

// ───────────────────────── 촬영 화면 (10-B 에서 채움) ─────────────────────────
const Cam={open(){},close(){},isOpen:()=>false,hold(){},render(){}};
// ───────────────────────── 사진 화면 (10-C 에서 채움) ─────────────────────────
const PhotoUI={sheet(){},render(){},fullSheet(){},view(){},closeView(){},fill:async()=>0,isViewOn:()=>false};
