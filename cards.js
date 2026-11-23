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
  // 26-2: 한 번에 몰아서 만들지 않고 화면이 쉬는 틈에 한 장씩(requestIdleCallback, 없으면 setTimeout). 컬렉션을 보는 중이면 보이는 카드부터
  let queue=[],running=false,timer=null,waitT=0;
  function capture(id,o={}){const a=S.col[id];if(!a||has(a.char,id)||queue.some(q=>q.id===id))return;
    queue.push({id,at:performance.now()+(o.delay!=null?o.delay:(C().afterMs!=null?C().afterMs:1500))});kick()}
  const idleCb=f=>typeof requestIdleCallback==="function"?requestIdleCallback(f,{timeout:C().idleTimeoutMs||3000}):setTimeout(()=>f(null),60);
  function kick(ms){clearTimeout(timer);timer=setTimeout(()=>idleCb(step),ms!=null?ms:(C().waitMs||600))}
  let viewOn=()=>false;  // 카드 확대 중(아래 확대 부분이 채움)
  // 대화 무대가 바쁜지: 몸짓 재생 중이거나 끝난 지 quietMs 안·해금 연출 대기·촬영·서아 사진 만드는 중·카드 확대 재생 중·사진 화면
  const inRoom=()=>typeof curTab!=="undefined"&&curTab==="chat"&&S.room==="seoa";
  const busyNow=()=>!!(Stage.recentMotion(inRoom()?(C().quietMs!=null?C().quietMs:1200):0)||(typeof unlockBusy!=="undefined"&&(unlockBusy||unlockQ.length))||(typeof Cam!=="undefined"&&Cam.isOpen())||(typeof SeoaPhoto!=="undefined"&&SeoaPhoto.isSending())||viewOn()||(typeof busy!=="undefined"&&busy&&inRoom()));
  // 다음에 만들 카드: 컬렉션 화면에 보이는 카드 → 그다음 기다린 차례대로
  function next(now){const ready=queue.filter(q=>now>=q.at);if(!ready.length)return null;
    const A=typeof curTab!=="undefined"&&curTab==="album"&&document.getElementById("album");
    if(A){const vh=window.innerHeight;const vis=ready.find(q=>{const e=A.querySelector(`.mc[data-f="${q.id}"]`);if(!e)return false;const r=e.getBoundingClientRect();return r.bottom>0&&r.top<vh});if(vis)return vis}
    return ready[0]}
  async function step(dl){
    if(running||!queue.length)return;
    const now=performance.now(),q=next(now);
    if(!q){const soon=Math.min(...queue.map(x=>x.at));return kick(Math.max(20,soon-now+20))}
    if(busyNow())return kick();
    // 이번 틈이 너무 짧으면 다음 틈. 단 idleTimeoutMs 넘게 기다렸으면 그냥 만듦(3D 무대가 매 프레임 그려져 틈이 늘 짧은 기기)
    if(!waitT)waitT=now;
    if(dl&&dl.timeRemaining&&!dl.didTimeout&&dl.timeRemaining()<(C().idleMinMs!=null?C().idleMinMs:8)&&now-waitT<(C().idleTimeoutMs||3000))return kick(50);
    waitT=0;queue.splice(queue.indexOf(q),1);running=true;
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
    perf.push({id,t:Math.round(t0),outfit:a.outfit,scene:a.scene,...r.ms,kb:Math.round(r.full.size/1024),total:Math.round(performance.now()-t0)});
  }
  // 그림 없는 카드 채우기(컬렉션을 열 때): 예전 저장값은 기본 의상·기록된 장소(없으면 바 1층)를 기록에도 적어 둠
  async function fill(){await init();let n=0;
    for(const id in S.col){const a=S.col[id];if(!a||!colBy(id))continue;
      if(!a.outfit){a.outfit=C().defaultOutfit||"ops";if(a.scene==null||!SCENES[a.scene])a.scene=C().defaultScene||0;if(!a.char)a.char="seoa";a.old=1;n++}
      if(!has(a.char,id))capture(id,{delay:0})}
    if(n)save();return n}

  // ── 카드 모양(26-1B): 3열, 가로2:세로3, 얇은 밝은 테두리와 둥근 모서리 ──
  // 모은 카드 = 카드 그림 + 아래 이름 + 왼쪽 위 등급(레어 분홍, 시크릿은 무지개빛 테두리) · 열렸지만 못 본 카드 = 흐린 실루엣 + 「대화에서 만나요」·「선물로 만나요」 ·
  // 잠긴 카드 = 뒷면(어두운 바탕, 자물쇠 선 아이콘, 작은 moti). 그림 효과 없이 색만
  const T=(k,v)=>UI("album.card."+k,v);
  const SIL='<svg class="mcsil" viewBox="0 0 60 90" aria-hidden="true"><circle cx="30" cy="31" r="11.5"/><path d="M6 92c0-22 9.5-38 24-38s24 16 24 38z"/></svg>';
  function vars(){const L=C().look||{},sc=L.secret||["#ff7eb6","#ffd36e","#7ef0c2","#7ecbff","#b18cff"];
    return `--mcEdge:${L.edge||"rgba(255,255,255,.78)"};--mcRare:${L.rare||"#ff7eb6"};--mcCommon:${L.common||"#e6e1f5"};--mcSecret:linear-gradient(135deg,${sc.join(",")})`}
  const badge=x=>`<span class="mcgr">${esc(gradeKo(x.grade))}</span>`;
  function cell(x){const a=S.col[x.id];
    if(a){const u=urlNow(a.char,x.id);
      return `<button class="mc got g-${x.grade}" data-f="${x.id}" aria-label="${esc(T("open",{name:x.name}))}"><span class="mcin">${u?`<img class="mcimg" src="${u}" alt="">`:`${SIL}<img class="mcimg" alt="" hidden>`}${badge(x)}<span class="mcnm">${esc(x.name)}</span></span></button>`}
    // 선물 카드는 처음부터 선물로 만날 수 있으니 「열렸지만 못 본」 칸. 대화 카드는 지금 단계까지 열린 몸짓
    if(x.source==="gift"||isSoon(x.id))return `<button class="mc unseen g-${x.grade}" data-h="${x.id}"><span class="mcin">${SIL}${badge(x)}<span class="mctx">${esc(T("unseen."+x.source))}</span></span></button>`;
    return `<button class="mc lock" data-h="${x.id}"><span class="mcin">${Icon.svg("lock",26)}<small class="mcmo">${esc(T("back"))}</small></span></button>`}
  const grid=L=>`<div class="mcards" style="${vars()}">${L.map(cell).join("")}</div>`;
  // 그림이 아직 주소로 안 꺼내진 카드: 꺼내는 대로 넣음
  function hydrate(root){root.querySelectorAll(".mc.got").forEach(b=>{const im=b.querySelector(".mcimg");if(!im||!im.hidden)return;const id=b.dataset.f,a=S.col[id];if(!a)return;
    url(a.char,id).then(u=>{if(!u||!im.isConnected)return;im.src=u;im.hidden=false;const sv=b.querySelector(".mcsil");if(sv)sv.remove()})})}
  subs.push(k=>{const r=document.getElementById("album");if(!r||!k)return;const id=k.slice(k.indexOf(":")+1),b=r.querySelector(`.mc.got[data-f="${id}"]`);if(b)hydrate(b.parentNode)});

  // ── 카드 확대(26-1B) ──
  // 카드가 가운데로 커지고(transform 만) 카드 안에서 3D 서아가 그 몸짓을 그때 의상·장소로 반복. 대화방 3D 그림판을 빌려 씀(Stage.borrow, 모델을 두 번 불러오지 않음)
  // 그 의상 모델을 아직 안 불러왔으면 카드 그림 + 짧은 불러오기 표시. 아래: 이름·처음 봤을 때 대사·「단계 · 날짜」, 이전/공유/다음. 바깥 누르기·아래로 밀기 = 닫기
  let vEl=null,vIds=[],vi=0,vTok=0,vOn=false,K=null,shareF=null,box=null,ptr=null;
  const V=()=>C().view||{};
  const $v=s=>vEl.querySelector(s);
  function build(){if(vEl)return;vEl=document.createElement("div");vEl.className="cv";vEl.id="cardView";vEl.setAttribute("role","dialog");vEl.setAttribute("aria-modal","true");vEl.setAttribute("aria-hidden","true");
    vEl.innerHTML=`<div class="cvbg"></div><button class="cvx" data-cv="close" aria-label="${esc(T("close"))}">${Icon.svg("close",22)}</button>
      <div class="cvcard"><div class="cvframe"><div class="cvin"><div class="cvplace"></div><div class="cvdim"></div><div class="cvgl"></div>${SIL}<img class="cvimg" alt=""><span class="mcgr"></span><span class="cvload"></span></div></div></div>
      <div class="cvinfo"><b class="cvnm"></b><p class="cvln"></p><small class="cvdt"></small></div>
      <div class="cvbar"><button data-cv="prev">${Icon.svg("back",18)}<span></span></button><button data-cv="share" class="cvsh"><span></span></button><button data-cv="next"><span></span>${Icon.svg("back",18)}</button></div>`;
    document.querySelector(".app").appendChild(vEl);
    $v('[data-cv="prev"] span').textContent=T("prev");$v('[data-cv="next"] span').textContent=T("next");$v('[data-cv="share"] span').textContent=T("share");$v(".cvload").textContent=T("loading");
    vEl.addEventListener("click",e=>{const b=e.target.closest("[data-cv]");if(!b)return;const k=b.dataset.cv;if(k==="close")close();else if(k==="share")share();else go(k==="next"?1:-1)});
    // 바깥 누르기·아래로 밀기(카드가 손가락을 따라 내려옴)·옆으로 밀기(이전/다음)
    vEl.addEventListener("pointerdown",e=>{if(!vOn||e.target.closest("button"))return;ptr={x:e.clientX,y:e.clientY,dy:0,dx:0,id:e.pointerId,on:!!e.target.closest(".cvcard,.cvinfo")}});
    vEl.addEventListener("pointermove",e=>{if(!ptr||e.pointerId!==ptr.id)return;ptr.dx=e.clientX-ptr.x;ptr.dy=e.clientY-ptr.y;
      if(ptr.dy>0&&Math.abs(ptr.dy)>Math.abs(ptr.dx)){const c=$v(".cvcard");c.style.transition="none";c.style.transform=`translateY(${ptr.dy}px)`;vEl.style.setProperty("--cvFade",String(Math.max(.3,1-ptr.dy/400)))}});
    const up=e=>{if(!ptr||e.pointerId!==ptr.id)return;const p=ptr;ptr=null;const sp=V().swipePx||70,c=$v(".cvcard");vEl.style.setProperty("--cvFade","1");
      if(p.dy>sp&&p.dy>Math.abs(p.dx))return close();
      if(Math.abs(p.dx)>50&&Math.abs(p.dx)>Math.abs(p.dy)){c.style.transform="";return go(p.dx<0?1:-1)}
      if(p.dy>4){c.style.transition=`transform ${V().zoomMs||300}ms cubic-bezier(.2,.8,.2,1)`;c.style.transform="";return}
      if(Math.abs(p.dx)<6&&Math.abs(p.dy)<6&&!p.on)close()};
    vEl.addEventListener("pointerup",up);vEl.addEventListener("pointercancel",e=>{if(ptr&&e.pointerId===ptr.id){ptr=null;$v(".cvcard").style.transform="";vEl.style.setProperty("--cvFade","1")}});
    vEl.addEventListener("touchmove",e=>{if(vOn)e.preventDefault()},{passive:false});
  }
  // 자리: 위 닫기 줄 → 카드(가로2:세로3, 화면에 맞게 가장 크게) → 글 → 버튼 줄
  function layout(){const app=document.querySelector(".app").getBoundingClientRect(),top=52,info=92,bar=70,side=24;
    const w=Math.floor(Math.min(app.width-side*2,(app.height-top-info-bar-12)*2/3)),h=Math.round(w*1.5),l=Math.round((app.width-w)/2);
    box={l,t:top,w,h};$v(".cvcard").style.cssText=`left:${l}px;top:${top}px;width:${w}px;height:${h}px`;
    $v(".cvinfo").style.cssText=`top:${top+h+12}px`;return box}
  // 목록 칸 자리(앱 기준) → 확대 카드 자리로 옮기는 transform(칸이 화면 밖이면 null)
  function fromTf(el){if(!el||!box)return null;const app=document.querySelector(".app").getBoundingClientRect(),r=el.getBoundingClientRect();
    if(!r.width||r.bottom<app.top||r.top>app.bottom)return null;
    return `translate(${r.left-app.left-box.l}px,${r.top-app.top-box.t}px) scale(${r.width/box.w},${r.height/box.h})`}
  const cellOf=id=>document.querySelector(`#album .mc[data-f="${id}"]`);
  function open(id,ids){build();vIds=ids&&ids.length?ids.slice():[id];vi=vIds.indexOf(id);if(vi<0){vIds.unshift(id);vi=0}
    layout();const c=$v(".cvcard"),ms=V().zoomMs||300,tf=fromTf(cellOf(id));
    vOn=true;vEl.setAttribute("aria-hidden","false");
    c.style.transition="none";c.style.transformOrigin="0 0";c.style.transform=tf||"translateY(24px) scale(.92)";vEl.classList.add("on");void c.offsetWidth;
    c.style.transition=`transform ${ms}ms cubic-bezier(.2,.8,.2,1),opacity 0s`;c.style.transform="";
    // 3D 뒤 장소 그림 어둡게: 대화 무대(#bgdim)와 같은 층
    const d=document.getElementById("bgdim"),cd=$v(".cvdim");if(d){cd.className=d.className+" cvdim";cd.removeAttribute("id");cd.style.cssText=d.style.cssText}
    Stage.lock(true);Stage.shadow(true,(((DATA.config||{}).camera||{}).photo||{}).shadow||{});Stage.borrow($v(".cvgl"),null,tick);
    show()}
  function tick(now,w,h){if(!vOn||!K||!w||!h)return;const cam=Stage.three().cam;if(cam.view)cam.clearViewOffset();
    const H=Stage.height(),tn=Math.tan(cam.fov*Math.PI/360),cy=(K.top+K.bottom)/2*H,d=Math.max((K.top-K.bottom)*H/2/tn,K.width*H/2/(tn*(w/h))),o=Stage.center(K.center||0);
    cam.position.set(o.x,cy+(K.lift||0)*H,o.z+d);cam.lookAt(o.x,cy,o.z)}
  const P2=n=>String(n).padStart(2,"0");
  function infoLine(a){const d=new Date(a.at),date=T("date",{y:d.getFullYear(),m:P2(d.getMonth()+1),d:P2(d.getDate())});return a.stage?T("info",{stage:stageName(a.stage),date}):date}
  async function show(){const id=vIds[vi],x=colBy(id),a=S.col[id];if(!x||!a)return close();
    const my=++vTok,mo=motionOf(id),key=a.outfit||C().defaultOutfit||"ops",sc=SCENES[a.scene]||SCENES[0];
    const fr=$v(".cvframe");fr.className="cvframe g-"+x.grade;fr.setAttribute("style",vars());$v(".cvin>.mcgr").textContent=gradeKo(x.grade);
    $v(".cvnm").textContent=x.name;const ln=speechOnly(a.line||a.text||"");$v(".cvln").textContent=ln;$v(".cvln").hidden=!ln;$v(".cvdt").textContent=infoLine(a);
    $v('[data-cv="prev"]').disabled=vi<=0;$v('[data-cv="next"]').disabled=vi>=vIds.length-1;
    $v(".cvplace").style.backgroundImage=`url(${sc.img})`;
    // 그림이 아직 없을 때만(만드는 중) 흐린 실루엣
    const im=$v(".cvimg"),cin=$v(".cvin");im.classList.remove("off");const u=urlNow(a.char,id);cin.classList.toggle("noimg",!u);
    if(u)im.src=u;else{im.removeAttribute("src");url(a.char,id).then(v=>{if(v&&my===vTok){im.src=v;cin.classList.remove("noimg")}})}
    K=null;Stage.camLoop(null);if(typeof Look!=="undefined"&&Look.setPlace)Look.setPlace(sc.name);
    const ld=$v(".cvload");ld.classList.toggle("on",!Stage.outfitLoaded(key));
    shareF=null;prep(id,my);
    Stage.keep(key);Stage.outfit(key);  // 26-2: 마지막으로 연 카드 의상은 남겨 둠(그 앞 카드 의상은 내려놓음)
    try{await Stage.ready;await Stage.model(key);await Stage.xs(mo.m)}catch(e){ld.classList.remove("on");return}
    for(let i=0;i<60&&Stage.outfitNow()!==key&&my===vTok;i++)await new Promise(r=>requestAnimationFrame(r));
    if(my!==vTok||!vOn)return;
    K=frameOf(mo.m);Stage.camLoop({id:mo.m,sp:mo.sp,name:null,ref:null});Stage.setFace(mo.f,"",true);cin.classList.remove("noimg");
    // 다음 그림부터 3D 가 보이게(카드 그림을 걷음)
    requestAnimationFrame(()=>requestAnimationFrame(()=>{if(my===vTok){im.classList.add("off");ld.classList.remove("on")}}))}
  function go(k){const n=vi+k;if(!vOn||n<0||n>=vIds.length)return;vi=n;show()}
  function close(){if(!vOn)return;vOn=false;vTok++;K=null;ptr=null;
    const id=vIds[vi],c=$v(".cvcard"),ms=V().closeMs||240,tf=fromTf(cellOf(id));
    Stage.camLoop(null);Stage.shadow(false);Stage.lock(false);Stage.release();if(typeof Outfit!=="undefined")Outfit.sync();
    if(typeof Look!=="undefined"&&Look.setPlace)Look.setPlace((SCENES[S.scene]||SCENES[0]).name);
    $v(".cvimg").classList.remove("off");  // 닫히는 동안은 카드 그림(그림판은 대화 무대로 돌아감)
    c.style.transition=`transform ${ms}ms cubic-bezier(.4,0,.2,1),opacity ${Math.round(ms/2)}ms linear ${Math.round(ms/2)}ms`;c.style.transform=tf||"translateY(40px) scale(.9)";
    vEl.classList.remove("on");vEl.setAttribute("aria-hidden","true");shareF=null}
  viewOn=()=>vOn;

  // ── 공유: 카드 그림(이름·등급·moti 표시 포함)을 그림으로. 영상 공유는 아직 ──
  const loadImg=b=>new Promise(res=>{const u=URL.createObjectURL(b),i=new Image();i.onload=()=>{URL.revokeObjectURL(u);res(i)};i.onerror=()=>{URL.revokeObjectURL(u);res(null)};i.src=u});
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  async function shareImage(id){const a=S.col[id],x=colBy(id);if(!a||!x)return null;const b=await blob(a.char,id);if(!b)return null;const img=await loadImg(b);if(!img)return null;
    const L=C().look||{},Sh=C().share||{},W=img.naturalWidth,H=img.naturalHeight,pad=Math.round(W*.05),bw=Math.max(3,Math.round(W*.01)),R=Math.round(W*.05);
    const c=document.createElement("canvas");c.width=W+pad*2;c.height=H+pad*2;const g=c.getContext("2d"),font=(wt,px)=>`${wt} ${px}px "Pretendard","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif`;
    g.fillStyle="#0b0a12";g.fillRect(0,0,c.width,c.height);
    // 테두리: 얇은 밝은 테두리(시크릿은 무지개빛)
    if(x.grade==="special"){const gr=g.createLinearGradient(pad,pad,pad+W,pad+H),cs=L.secret||["#ff7eb6","#ffd36e","#7ef0c2","#7ecbff","#b18cff"];cs.forEach((s,i)=>gr.addColorStop(i/(cs.length-1),s));g.fillStyle=gr}else g.fillStyle=L.edge||"rgba(255,255,255,.78)";
    rr(g,pad-bw,pad-bw,W+bw*2,H+bw*2,R+bw);g.fill();
    g.save();rr(g,pad,pad,W,H,R);g.clip();g.drawImage(img,pad,pad,W,H);
    const sh=g.createLinearGradient(0,pad+H*.68,0,pad+H);sh.addColorStop(0,"rgba(0,0,0,0)");sh.addColorStop(1,"rgba(0,0,0,.72)");g.fillStyle=sh;g.fillRect(pad,pad+H*.68,W,H*.32);g.restore();
    const mg=Math.round(W*(Sh.marginK||.045)),nf=Math.round(W*(Sh.nameK||.06)),gf=Math.round(W*(Sh.gradeK||.032)),mf=Math.round(W*(Sh.markK||.03));
    // 왼쪽 위 등급
    g.font=font(800,gf);g.textBaseline="middle";const gt=gradeKo(x.grade),gw=g.measureText(gt).width+gf*1.2,gh=gf*1.8,gx=pad+mg,gy=pad+mg;
    g.fillStyle="rgba(10,8,18,.55)";rr(g,gx,gy,gw,gh,gh/2);g.fill();g.lineWidth=Math.max(1.5,gf*.08);
    g.strokeStyle=x.grade==="rare"?(L.rare||"#ff7eb6"):x.grade==="special"?"#ffffff":(L.common||"#e6e1f5");g.stroke();g.fillStyle=g.strokeStyle;g.fillText(gt,gx+gf*.6,gy+gh/2+1);
    // 아래 이름 · 오른쪽 아래 moti
    g.fillStyle="#fff";g.font=font(800,nf);g.textBaseline="alphabetic";g.fillText(x.name,pad+mg,pad+H-mg,W-mg*2-mf*4);
    g.font=font(700,mf);g.fillStyle="rgba(255,255,255,.85)";const mt=T("mark");g.fillText(mt,pad+W-mg-g.measureText(mt).width,pad+H-mg);
    return await new Promise(r=>c.toBlob(r,"image/jpeg",.9))}
  const fname=id=>`moti-card-${id}.jpg`;
  // 공유 파일을 미리 만들어 둠(아이폰: 누른 순간 바로 공유 창을 열어야 함)
  async function prep(id,my){try{const b=await shareImage(id);if(!b||(my!=null&&my!==vTok))return null;shareF={id,file:new File([b],fname(id),{type:"image/jpeg"})};return shareF}catch(e){return null}}
  async function share(){const id=vIds[vi];let f=shareF&&shareF.id===id?shareF.file:null;if(!f){const r=await prep(id);f=r&&r.file}if(!f)return;
    if(PhotoUI.canShare(f)){try{await navigator.share({files:[f]})}catch(e){}return}
    PhotoUI.saveFile(f);toast(esc(T("saved")),1800)}

  return{running:()=>running,init,has,url,urlNow,blob,put,remove,clear,capture,fill,make,motionOf,frameOf,onChange:f=>subs.push(f),perf,queue:()=>queue.map(q=>q.id),
    grid,hydrate,open,close,isOpen:()=>vOn,shareImage,state:()=>({vOn,id:vIds[vi],K:!!K,outfit:Stage.outfitNow(),playing:Stage.recentMotion(0)})};
})();
