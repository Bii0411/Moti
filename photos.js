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
  down:'<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>',
  // 48: 포즈(세로 카드 안 사람 + 오른쪽 위 작은 반짝임) · 카메라(「이 포즈로 찍기」)
  pose:'<rect x="4" y="5" width="11.5" height="15.5" rx="2"/><circle cx="9.75" cy="10.3" r="1.9"/><path d="M6.6 17.2c.6-1.9 1.8-2.8 3.15-2.8s2.55.9 3.15 2.8"/><path d="M18.6 3.2l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z"/>',
  camera:'<path d="M4.5 8h2.8l1.6-2.5h6.2L16.7 8h2.8a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V9.5A1.5 1.5 0 0 1 4.5 8z"/><circle cx="12" cy="13.3" r="3.4"/>'
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
  // 서아가 보낸 사진(12, 종류 received)은 칸 수에 넣지 않음
  const count=()=>list.filter(m=>m.kind!=="received").length,full=()=>count()>=cap();
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

// ───────────────────────── 사진 만들기(3D → jpeg) ─────────────────────────
const Shot=(()=>{
  const imgs={};
  const loadImg=src=>imgs[src]||(imgs[src]=new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src=src}));
  // CSS background-size:cover + 위치(px,py) 와 같게 그림
  function cover(g,img,W,H,px,py){const s=Math.max(W/img.naturalWidth,H/img.naturalHeight),w=img.naturalWidth*s,h=img.naturalHeight*s;g.drawImage(img,(W-w)*px,(H-h)*py,w,h)}
  // 3D 뒤 배경 어둡게(4-2B, data/look.json background)와 같은 층: 검은 층 + 회색 "채도" 섞기
  function dimLayer(g,W,H){const b=(DATA.look&&DATA.look.background)||{};if(qs.get("bg")==="raw"||b.on===false)return;
    g.fillStyle=`rgba(0,0,0,${1-(b.brightness!=null?b.brightness:.8)})`;g.fillRect(0,0,W,H);
    g.save();g.globalCompositeOperation="saturation";g.globalAlpha=1-(b.saturation!=null?b.saturation:.9);g.fillStyle="#808080";g.fillRect(0,0,W,H);g.restore()}
  async function encode(c,type,q,minQ,maxKB){let b;for(;;){b=await new Promise(r=>c.toBlob(r,type,q));if(!b||b.size<=maxKB*1024||q<=minQ+1e-6)break;q=Math.max(minQ,q-.08)}return b}
  function scaled(c,long){const k=long/Math.max(c.width,c.height),o=document.createElement("canvas");o.width=Math.round(c.width*k);o.height=Math.round(c.height*k);
    const g=o.getContext("2d");g.imageSmoothingQuality="high";g.drawImage(c,0,0,o.width,o.height);return o}
  // 지금 3D 장면을 사진 크기로 한 번 더 그려서 배경 위에 얹음. setCam(cam,aspect) = 카메라 자리(촬영 화면의 지금 구도)
  async function take(sceneIdx,setCam,o={}){
    const P=PCFG().image||{},A=P.aspect||[3,4],H=P.longPx||1440,W=Math.round(H*A[0]/A[1]);
    const sc=SCENES[sceneIdx]||SCENES[0],img=await loadImg(sc.img),pi=SCENES[sceneIdx]?sceneIdx:0,pano=await Stage.pano.ready(pi);  // 30: 360도 배경이 있는 장소는 3D 장면 안의 구가 배경
    const t0=performance.now(),c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
    g.fillStyle="#140a24";g.fillRect(0,0,W,H);if(img&&!pano){cover(g,img,W,H,.5,.4);dimLayer(g,W,H)}
    try{
    const {R,scene,cam}=Stage.three(),pr=R.getPixelRatio(),sz=R.getSize(new THREE.Vector2()),asp=cam.aspect,kp=cam.position.clone(),kq=cam.quaternion.clone();
    if(o.shadow)Stage.shadow(true,(((DATA.config||{}).camera||{}).photo||PCFG().camera||{}).shadow);
    R.setPixelRatio(1);R.setSize(W,H,false);cam.aspect=W/H;cam.updateProjectionMatrix();setCam(cam,W/H);
    const back=pano?Stage.pano.use(pi):null;try{R.render(scene,cam)}finally{if(back)back()}g.drawImage(R.domElement,0,0,W,H);  // 같은 작업 안에서 바로 옮겨 그림(그림판이 지워지기 전)
    R.setPixelRatio(pr);R.setSize(sz.x,sz.y,false);cam.aspect=asp;cam.updateProjectionMatrix();cam.position.copy(kp);cam.quaternion.copy(kq);
    if(o.shadow)Stage.shadow(false);
    }finally{Stage.pano.done(pi)}  // 30-1: 다 그렸으면 360도 그림을 놓음(지금 장소 것이 아니면 내려놓음)
    if(o.onCanvas)try{o.onCanvas(c)}catch(e){console.error(e)}  // 24: 다 그린 사진(줄이기 전)을 촬영 화면의 「날아가는 사진」으로
    const t1=performance.now(),type=P.type||"image/jpeg";
    const full=await encode(c,type,P.quality||.86,P.minQuality||.5,P.maxKB||300);
    const thumb=await encode(scaled(c,P.thumbPx||400),type,P.thumbQuality||.72,.4,P.thumbMaxKB||60);
    return{full,thumb,w:W,h:H,place:sc.name,ms:{render:Math.round(t1-t0),encode:Math.round(performance.now()-t1)}};
  }
  return{take,loadImg,cover,dimLayer,encode,scaled};
})();

// ───────────────────────── 촬영 화면 ─────────────────────────
const Cam=(()=>{
  let on=false,root=null,fr=null,gl=null,yaw=0,pitch=0,zoom=0,info=null,paused=false,held=null,busy=false,flying=false;
  const ptrs=new Map();let pinch=null,drag=null;
  // 24: 촬영 화면 값은 data/config.json camera.photo (예전 data/photos.json camera)
  const C=()=>((typeof DATA!=="undefined"&&DATA.config&&DATA.config.camera)||{}).photo||PCFG().camera||{};
  const pLim=()=>[C().pitchMinDeg!=null?C().pitchMinDeg:-5,C().pitchMaxDeg!=null?C().pitchMaxDeg:30];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const stopG=e=>e.preventDefault();
  function build(){
    root=document.createElement("div");root.className="cam";root.id="cam";root.setAttribute("aria-hidden","true");
    root.innerHTML=`<div class="camtop"><button class="camx" data-c="close">${icon("close")}</button><span class="camcount" id="camCount"></span><span class="camsp"></span></div>
      <div class="cammid" id="camMid"><div class="camv" id="camV"><div class="bgdim" id="camDim"></div><div class="camgl" id="camGl"></div>
        <div class="camfull" id="camFull"><p></p><div><button data-c="clear"></button><button data-c="grow"></button></div></div>
        <span class="camchip" id="camChip"></span><div class="camflash" id="camFlash"></div></div></div>
      <div class="cambot"><div class="camleft"><button class="cambtn" data-c="pause" id="camPause"></button><button class="cambtn campose" data-c="pose" id="camPose">${icon("pose")}<span></span></button></div><button class="camshut" data-c="shoot"><i></i></button><button class="camlast" data-c="last" id="camLast"></button></div>`;
    $(".app").appendChild(root);fr=root.querySelector("#camV");gl=root.querySelector("#camGl");
    root.querySelector('[data-c="close"]').setAttribute("aria-label",UI("cam.ariaClose"));
    root.querySelector('[data-c="shoot"]').setAttribute("aria-label",UI("cam.ariaShutter"));
    root.querySelector('[data-c="last"]').setAttribute("aria-label",UI("cam.ariaLast"));
    root.querySelector("#camPose span").textContent=UI("pose.camBtn");  // 48: 멈춤 옆 「포즈」 → 모은 카드에서 골라 그 포즈를 반복
    root.querySelector('[data-c="clear"]').textContent=UI("photoFull.clear");root.querySelector('[data-c="grow"]').textContent=UI("photoFull.grow");
    root.querySelector("#camFull p").textContent=UI("photoFull.notice");
    root.addEventListener("click",e=>{const b=e.target.closest("[data-c]");if(!b)return;const k=b.dataset.c;
      if(k==="close")close();else if(k==="shoot")shutter();else if(k==="pause")togglePause();else if(k==="pose"){if(typeof PhotoAsk!=="undefined"&&PhotoAsk.fixed())return toast(esc(UI("photoAsk.poseFixed")));Pose.sheet("cam")}
      else if(k==="last"){if(Photos.count())PhotoUI.sheet()}else if(k==="clear")PhotoUI.sheet();else if(k==="grow")PhotoUI.fullSheet()});
    // 두 손가락 확대 · 한 손가락 돌기 (포인터 이벤트, 마우스 끌기도 같음). 페이지 확대·스크롤로 새지 않게 touch-action:none + 기본 동작 막기
    fr.addEventListener("pointerdown",e=>{if(e.target.closest("button"))return;try{fr.setPointerCapture(e.pointerId)}catch(err){}ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});base()});
    fr.addEventListener("pointermove",e=>{if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(ptrs.size>=2&&pinch){zoom=clamp(pinch.z+Math.log(dist()/pinch.d)*(C().pinchK||.75),0,1)}
      else if(ptrs.size===1&&drag){const p=[...ptrs.values()][0],mx=C().yawMaxDeg||60,[pa,pb]=pLim();
        yaw=clamp(drag.yaw-(p.x-drag.x)*(C().degPerPx||.35),-mx,mx);
        pitch=clamp(drag.pitch+(p.y-drag.y)*(C().pitchDegPerPx||.25),pa,pb)}});  // 24: 아래로 끌면 위에서 내려다보는 쪽
    const up=e=>{if(!ptrs.delete(e.pointerId))return;base()};
    fr.addEventListener("pointerup",up);fr.addEventListener("pointercancel",up);
    fr.addEventListener("wheel",e=>{e.preventDefault();zoom=clamp(zoom-e.deltaY*(C().wheelK||.0012)*(e.deltaMode===1?16:1),0,1)},{passive:false});
    root.addEventListener("touchmove",stopG,{passive:false});
    root.addEventListener("touchstart",e=>{if(e.touches.length>1)e.preventDefault()},{passive:false});
    root.addEventListener("dblclick",stopG);
    window.addEventListener("resize",()=>{if(on)layout()});
  }
  const dist=()=>{const [a,b]=[...ptrs.values()];return Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};
  // 손가락 수가 바뀔 때마다 기준을 다시 잡음(두 손가락 → 한 손가락으로 바뀌어도 튀지 않게)
  function base(){pinch=ptrs.size>=2?{d:dist(),z:zoom}:null;const p=[...ptrs.values()][0];drag=ptrs.size===1?{x:p.x,y:p.y,yaw,pitch}:null}
  // 3:4 칸을 가운데 칸 안에 가장 크게
  // 24: 양옆 framePad 여백을 두고(틀 밖은 어두운 단색) 그 안에 가장 크게
  function layout(){const m=root.querySelector("#camMid"),A=(PCFG().image||{}).aspect||[3,4],pad=C().framePad!=null?C().framePad:12,aw=m.clientWidth-pad*2,ah=m.clientHeight;
    let w=Math.min(aw,ah*A[0]/A[1]),h=w*A[1]/A[0];fr.style.width=Math.floor(w)+"px";fr.style.height=Math.floor(h)+"px"}
  // 구도: zoom 0 = 가장 멀리(far, 머리 위 여백 ~ 무릎 위) ~ 1 = 얼굴(near) 사이. yaw = 정면 기준 좌우 각도(서아 주위를 돎)
  // 24: pitch = 위아래 각도(+ 위에서 내려다봄). 서아 몸 가운데 줄의 top 높이가 틀 위 끝, bottom 높이가 틀 아래 끝에 오도록
  //     카메라의 수평 거리 dx·높이 cy 를 원근대로 풂(두 식 두 미지수). 그래서 각도·확대를 바꿔도 무릎 아래는 틀 밖
  function setCam(cam,aspect,y,z,p){const c=C(),F=c.far||{top:1.07,bottom:.31},N=c.near||{top:1.03,bottom:.8};
    z=z!=null?z:zoom;y=y!=null?y:yaw;p=p!=null?p:pitch;
    const H=Stage.height(),tn=Math.tan(cam.fov*Math.PI/360),top=(F.top+(N.top-F.top)*z)*H,bot=(F.bottom+(N.bottom-F.bottom)*z)*H;
    const a=p*Math.PI/180,s=Math.sin(a),co=Math.cos(a);
    // 위 끝: dx(s−tn·co) − cy(co+tn·s) = −top(co+tn·s) / 아래 끝: dx(s+tn·co) − cy(co−tn·s) = −bot(co−tn·s)
    const a1=s-tn*co,b1=-(co+tn*s),c1=-top*(co+tn*s),a2=s+tn*co,b2=-(co-tn*s),c2=-bot*(co-tn*s),D=a1*b2-a2*b1;
    const dx=(c1*b2-c2*b1)/D,cy=(a1*c2-a2*c1)/D,r=y*Math.PI/180;
    const o=Stage.center(z);  // 몸짓이 서아를 앞뒤·옆으로 옮겨도(다가가기 등) 서아를 가운데 두고 돎
    cam.position.set(o.x+Math.sin(r)*dx,cy,o.z+Math.cos(r)*dx);
    cam.lookAt(cam.position.x-Math.sin(r)*co,cy-s,cam.position.z-Math.cos(r)*co)}
  function tick(now,w,h){if(on&&w&&h){const cam=Stage.three().cam;if(cam.view)cam.clearViewOffset();setCam(cam,w/h)}}
  const motionName=x=>x?(x.name||MNAME[x.id]||x.id):"";
  function render(){if(!root)return;
    root.querySelector("#camCount").textContent=UI("cam.count",{n:Photos.count(),cap:Photos.cap()});
    root.querySelector("#camChip").textContent=info?UI(paused?"cam.paused":info.pose?"pose.chip":"cam.loop",{name:motionName(info)}):UI("cam.idle");
    const pb=root.querySelector("#camPause");pb.innerHTML=icon(paused?"play":"pause");pb.disabled=!info;pb.setAttribute("aria-label",UI(paused?"cam.ariaPlay":"cam.ariaPause"));
    // 서아가 보낸 사진(12)은 빼고 내가 찍은 마지막 사진. 24: 주석 안에 묻혀 있던 줄을 되살림. 사진이 날아가는 중엔 도착할 때 바꿈
    const L=Photos.list().find(m=>m.kind!=="received"),lb=root.querySelector("#camLast");
    if(!flying){lb.innerHTML=L?`<img src="${Photos.thumbUrl(L)}" alt="">`:"";lb.classList.toggle("empty",!L)}
    root.querySelector("#camFull").classList.toggle("on",Photos.full())}
  // o.pose: 48 포즈에서 고른 몸짓({id,sp,name,ref,f,pose}). 78: 없으면 기본 자세(예전: 열기 직전 recentMs 안의 대화 몸짓)
  // 83: o.ask = 서아 사진 제안 버튼 id. 마지막 관문 — 본편 관계 단계별 카메라 권한(PhotoAsk.gate). 잠겼으면 안내만, 열지 않음(＋ 카메라·포즈 「이 포즈로 찍기」·제안 버튼 모두 여기를 지남)
  function open(o){
    if(on)return;
    if(typeof PhotoAsk!=="undefined"){const g=PhotoAsk.gate(o);if(!g.ok){toast(esc(g.msg));return}PhotoAsk.begin(g.ses)}
    if(!root)build();
    if(typeof View!=="undefined")View.rest(true);
    clearTimeout(faceRT);  // 들어간 순간의 표정 그대로(7초 뒤 기본 표정으로 돌아가는 타이머를 멈춤)
    const okPose=x=>!!x&&(typeof Pose==="undefined"||!!Pose.info(x.ref||x.id));  // 78-1: 쓸 수 없는 포즈(일반 몸짓·안 가진 포즈 카드)는 받지 않음
    if(o&&o.pose&&!okPose(o.pose))o={...o,pose:null};
    info=o&&o.pose?o.pose:null;  // 78: 직전 대화 몸짓을 이어받지 않음 — 포즈를 고르지 않았으면 기본 자세
    paused=false;held=null;Stage.camLoop(info);if(o&&o.pose&&o.pose.f)Stage.setFace(o.pose.f);
    const [pa,pb]=pLim();yaw=C().startYawDeg||0;zoom=clamp(C().startZoom||0,0,1);pitch=clamp(C().startPitchDeg!=null?C().startPitchDeg:0,pa,pb);ptrs.clear();pinch=drag=null;
    const sc=SCENES[S.scene]||SCENES[0];fr.style.backgroundImage=`url(${sc.img})`;Shot.loadImg(sc.img);
    const d=$("#bgdim"),cd=root.querySelector("#camDim");if(d){cd.className=d.className;cd.style.cssText=d.style.cssText}
    on=true;root.classList.add("on");root.setAttribute("aria-hidden","false");layout();
    Stage.borrow(gl,null,tick,{pano:S.scene});Stage.shadow(true,C().shadow);  // 30: 360도 배경이면 끌어서 돌릴 때 배경도 같이 돎
    document.addEventListener("gesturestart",stopG,{passive:false});document.addEventListener("gesturechange",stopG,{passive:false});
    render();
  }
  function close(){
    if(!on)return;on=false;root.classList.remove("on");root.setAttribute("aria-hidden","true");
    document.removeEventListener("gesturestart",stopG);document.removeEventListener("gesturechange",stopG);
    Stage.shadow(false);Stage.camLoop(null);Stage.release();
    if(typeof PhotoAsk!=="undefined")PhotoAsk.end();  // 83: 제안 촬영에서 한 장 이상 저장했으면 반응(이벤트마다 한 번)
    // 촬영 중에 온 답장: 나온 뒤 마지막 답장의 몸짓을 재생(그때 처음 본 몸짓이면 도감 기록)
    const h=held;held=null;
    if(h){react(h.r,"",false,Fx.first(h.mid));firstSeen(h.mid)}else faceReset();
    if(unlockQ.length&&!unlockBusy)setTimeout(unlockNext,h&&h.mid?Stage.dur(h.mid)*1000+700:600);
  }
  // 48: 촬영 중에 포즈를 바꿈(멈춤을 풀고 처음부터 반복)
  function setPose(x){if(!on||!x)return;if(typeof PhotoAsk!=="undefined"&&PhotoAsk.fixed())return;  // 83: 3단계 제안 촬영은 p01 고정if(typeof Pose!=="undefined"&&!Pose.info(x.ref||x.id))return;  // 78-1: 쓸 수 있는 포즈만
   info=x;paused=false;Stage.camLoop(null);Stage.camLoop(info);if(x.f)Stage.setFace(x.f);render()}
  function togglePause(){if(!info)return;paused=!paused;Stage.hold(paused);render()}
  // 셔터 소리: 짧은 잡음 두 덩어리(찰-칵). 아이폰은 누른 그 순간(같은 작업) 안에서 소리 장치를 깨워야 해서 셔터 처리 맨 앞에서 부름
  let ac=null;
  // 소리 장치 깨우기(포토부스: 「촬영」을 누른 순간에 깨워 두면 카운트다운 뒤 타이머에서도 소리가 남)
  function audio(){try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==="suspended")ac.resume()}catch(e){}return ac}
  function sound(){const s=PCFG().sound||{};if(s.on===false)return;
    try{if(!audio())return;const t=ac.currentTime+.01;
      (s.clicks||[]).forEach(k=>{const n=Math.max(1,Math.ceil(ac.sampleRate*k.dur)),b=ac.createBuffer(1,n,ac.sampleRate),ch=b.getChannelData(0);
        for(let i=0;i<n;i++)ch[i]=(Math.random()*2-1)*Math.pow(1-i/n,3);
        const src=ac.createBufferSource();src.buffer=b;const f=ac.createBiquadFilter();f.type="bandpass";f.frequency.value=k.freq||3000;f.Q.value=k.q||1;
        const g=ac.createGain();g.gain.value=(k.gain||.5)*(s.volume!=null?s.volume:1);src.connect(f);f.connect(g);g.connect(ac.destination);src.start(t+(k.at||0))})}catch(e){}}
  // 24: 찍은 직후 — 틀 안 장면(다 그린 사진 canvas)이 작아지며 오른쪽 최근 사진 칸으로 날아 들어가고, 칸이 살짝 튀었다 돌아오며 새 사진으로.
  //     transform·opacity 만 씀. 시간 값 data/config.json camera.photo.fly
  function fly(c){const F=C().fly||{},ms=F.ms!=null?F.ms:400,lb=root.querySelector("#camLast");
    const a=fr.getBoundingClientRect(),b=lb.getBoundingClientRect(),o=root.getBoundingClientRect();if(!a.width||!b.width)return;
    const small=Shot.scaled(c,Math.max(160,Math.round(b.width*3)));  // 칸에 넣을 작은 그림(사진과 같은 장면)
    c.className="camfly";c.style.cssText=`left:${a.left-o.left}px;top:${a.top-o.top}px;width:${a.width}px;height:${a.height}px`;
    root.appendChild(c);flying=true;void c.offsetWidth;
    // 칸(정사각)을 덮는 크기로 줄여 칸 가운데로
    const k=Math.max(b.width/a.width,b.height/a.height),dx=(b.left+b.width/2)-(a.left+a.width/2),dy=(b.top+b.height/2)-(a.top+a.height/2);
    c.style.transition=`transform ${ms}ms ${F.ease||"ease-in"},opacity ${ms}ms linear`;
    c.style.transform=`translate(${dx}px,${dy}px) scale(${k})`;c.style.opacity=String(F.endOpacity!=null?F.endOpacity:.7);
    let done=false;const land=()=>{if(done)return;done=true;c.remove();flying=false;
      small.className="";lb.innerHTML="";lb.appendChild(small);lb.classList.remove("empty");
      lb.style.transition="none";lb.style.transform=`scale(${F.bounceScale||1.14})`;void lb.offsetWidth;
      lb.style.transition=`transform ${F.bounceMs||260}ms cubic-bezier(.3,1.6,.5,1)`;lb.style.transform="scale(1)"};
    c.addEventListener("transitionend",e=>{if(e.propertyName==="transform")land()});setTimeout(land,ms+120)}
  function flash(){const f=root.querySelector("#camFlash");f.style.transition="none";f.style.opacity=".9";void f.offsetWidth;f.style.transition=`opacity ${C().flashMs||260}ms ease-out`;f.style.opacity="0"}
  async function shutter(){
    if(busy)return;
    if(Photos.full()){PhotoUI.fullSheet();return}
    sound();flash();busy=true;
    const ses=typeof PhotoAsk!=="undefined"?PhotoAsk.cur():null;  // 83: 누른 때의 제안 촬영(저장 도중 닫기·초기화돼도 그 세션에만)
    try{const r=await Shot.take(S.scene,(cam,a)=>setCam(cam,a),{onCanvas:fly});
      const meta={id:Photos.newId(),kind:"camera",at:Date.now(),mid:info?(info.ref||info.id):null,mname:info?motionName(info):null,scene:S.scene,place:r.place,liked:false,w:r.w,h:r.h};
      const sv=await Photos.add(meta,r.full,r.thumb);
      if(ses)PhotoAsk.saved(ses);  // 83: 실제 저장 성공만 촬영 기회 사용으로(실패·가득 참·취소는 안 셈)
      (window.__photoPerf||(window.__photoPerf=[])).push({...r.ms,save:sv.ms,kb:Math.round(r.full.size/1024),thumbKb:Math.round(r.thumb.size/1024)});
      toast(esc(UI("cam.saved")),1800);
    }catch(e){console.error("사진 저장 실패",e)}
    busy=false;render();
  }
  Photos.onChange(()=>{if(on)render()});
  return{open,close,setPose,isOpen:()=>on,hold:x=>{held=x},setCam,render,sound,audio,state:()=>({yaw,pitch,zoom,info,paused}),view:(y,z,p)=>{yaw=y;zoom=z;if(p!=null)pitch=p}};
})();

// ───────────────────────── 작은 창(24) ─────────────────────────
// 사진 칸 늘리기 결제 방식·선물 확률 보기에 같이 씀. #mini(index.html). 바깥·✕ 누르면 닫힘. 열고 닫힘은 opacity·transform 만
const Mini=(()=>{
  const el=()=>document.getElementById("mini");
  function open(title,body,bind){const m=el();if(!m)return;
    m.innerHTML=`<div class="minibox" role="dialog" aria-modal="true"><h3>${esc(title)}</h3><button class="minix" data-mini="x" aria-label="${esc(UI("photo.ariaClose"))}">${Icon.svg("close",20)}</button>${body}</div>`;
    m.onclick=e=>{if(e.target===m||e.target.closest('[data-mini="x"]'))close()};
    if(bind)bind(m);void m.offsetWidth;m.classList.add("on")}
  function close(){const m=el();if(m)m.classList.remove("on")}
  return{open,close,isOpen:()=>!!(el()&&el().classList.contains("on"))};
})();

// ───────────────────────── 사진 화면 ─────────────────────────
const PhotoUI=(()=>{
  let seg="all",vIds=[],vi=0,vUrl=null,shareF=null,menu=false,sw=null;
  const T=(k,v)=>UI("photo."+k,v);
  const P2=n=>String(n).padStart(2,"0");
  const fmt=t=>{const d=new Date(t);return T("date",{y:d.getFullYear(),m:P2(d.getMonth()+1),d:P2(d.getDate()),hh:P2(d.getHours()),mm:P2(d.getMinutes())})};
  const shown=()=>Photos.list().filter(m=>seg==="all"||(seg==="liked"&&m.liked)||(seg==="received"&&m.kind==="received"));
  const SEG=["all","liked","received"];  // 12: 「받은 사진」 더함. 22: 「포토부스」 묶음 뺌(전에 찍은 포토부스 사진은 「전체」에)
  const sheetOn=()=>$("#photoSheet").classList.contains("on");
  function sheet(){render();if(!sheetOn()){closeSheets();openSheet("#photoSheet")}}
  function render(){
    const el=$("#photoSheet"),n=Photos.count(),cap=Photos.cap(),L=shown();
    // 24: 아래 「칸 늘리기」「PLUS」 줄 대신 「n / cap」 옆 작은 + 버튼 → 결제 방식 작은 창. 빈 상태 문구 없이 빈 칸만
    el.innerHTML=`<div class="phd"><h2>${esc(T("title"))}</h2><span class="${n>=cap?"full":""}">${esc(T("count",{n,cap}))}</span><button class="padd" data-p="add" aria-label="${esc(T("add"))}">${Icon.svg("plus",18)}</button></div>
      <div class="pprog ${n>=cap?"full":""}"><i style="width:${cap?Math.min(100,n/cap*100):0}%"></i></div>
      <div class="aseg pseg">${SEG.map(k=>`<button data-seg="${k}" class="${seg===k?"on":""}">${esc(T("seg."+k))}</button>`).join("")}</div>
      ${seg==="received"?received(L,cap):L.length?grid(L):emptyGrid()}`;
    el.querySelectorAll("[data-seg]").forEach(b=>b.onclick=()=>{seg=b.dataset.seg;render()});
    el.querySelectorAll("[data-id]").forEach(b=>b.onclick=()=>view(b.dataset.id));
    el.querySelector('[data-p="add"]').onclick=buy;
  }
  // 빈 상태(24): 문구 없이 빈 칸 두 줄
  const EMPTY_CELLS=6;
  const emptyGrid=()=>`<div class="pgrid">${'<div class="pslot"></div>'.repeat(EMPTY_CELLS)}</div>`;
  // 결제 방식 작은 창(24): 칸 늘리기 +10 · 💎 / PLUS(이용 중이면 뺌). 값·문구는 예전 아래 줄 그대로
  function buy(){const c=PCFG().slots||{};
    Mini.open(T("buyTitle"),`<div class="mopts"><button data-b="grow"><span>${esc(T("growRow"))}</span><b>${Icon.fill(esc(T("growPrice",{price:c.stepPrice||50})))}</b></button>
      ${S.plus?"":`<button class="plus" data-b="plus"><span>${esc(T("plusRow",{plusCap:c.plusCap||200}))}</span><b>${esc(T("plusPrice"))}</b></button>`}</div>`,
      m=>{m.querySelector('[data-b="grow"]').onclick=()=>{if(Photos.buySlots())Mini.close()};
        const pl=m.querySelector('[data-b="plus"]');if(pl)pl.onclick=()=>{Photos.startPlus();Mini.close()}})}
  const cell=m=>`<button class="pth ${m.kind==="booth"?"tall":""}" data-id="${m.id}"${m.kind==="booth"&&m.frameColor?` style="background:${esc(m.frameColor)}"`:""}><img src="${Photos.thumbUrl(m)}" alt="" loading="lazy">${m.liked?`<span class="plike">${icon("heart","ic")}</span>`:""}</button>`;
  const grid=L=>`<div class="pgrid">${L.map(cell).join("")}</div>`;
  // 받은 사진(12): 「단계 사진 n / 5」 진행도·막대 → 2~6단계 다섯 칸(못 받은 칸은 점선 「k단계 사진」) → 「그 밖에 받은 사진」 → 안내 한 줄
  function received(L,cap){const R=(k,v)=>UI("seoaPhoto."+k,v),st=((typeof DATA!=="undefined"&&DATA.seoaPhoto)||{}).stage||[],tot=st.length||5;
    const by={};L.forEach(m=>{if(m.stage&&!by[m.stage])by[m.stage]=m});const n=st.filter(o=>by[o.stage]).length,others=L.filter(m=>!m.stage);
    return `<div class="rhd"><b>${esc(R("progress"))}</b><span>${esc(R("progressCount",{n,total:tot}))}</span></div>
      <div class="pprog rprog"><i style="width:${tot?n/tot*100:0}%"></i></div>
      <div class="rstage">${st.map(o=>{const m=by[o.stage];return m?`<button class="pth rgot" data-id="${m.id}"><img src="${Photos.thumbUrl(m)}" alt="" loading="lazy">${m.liked?`<span class="plike">${icon("heart","ic")}</span>`:""}<span class="rlab">${esc(R("stageLabel",{k:o.stage}))}</span></button>`
        :`<div class="rslot"><span>${esc(R("slot",{k:o.stage}))}</span></div>`}).join("")}</div>
      ${others.length?`<h3 class="rh3">${esc(R("others"))}</h3>${grid(others)}`:""}
      <p class="rnote">${esc(R("note",{cap}))}</p>`}
  // ── 가득 참 시트(셔터를 눌렀을 때, 카메라 안내 「칸 늘리기」) ──
  function fullSheet(){
    const el=$("#fullSheet"),c=PCFG().slots||{};
    el.innerHTML=`<h2>${esc(UI("photoFull.title"))}</h2><p class="sub">${esc(UI("photoFull.desc"))}</p>
      <div class="fopts"><button data-o="del">${esc(UI("photoFull.optDelete"))}</button><button data-o="grow">${Icon.fill(esc(UI("photoFull.optGrow",{price:c.stepPrice||50})))}</button>
      ${S.plus?"":`<button data-o="plus" class="plus">${esc(UI("photoFull.optPlus",{plusCap:c.plusCap||200}))}</button>`}</div>`;
    el.querySelector('[data-o="del"]').onclick=()=>{closeSheets();sheet()};
    el.querySelector('[data-o="grow"]').onclick=()=>{if(Photos.buySlots())closeSheets()};
    const pl=el.querySelector('[data-o="plus"]');if(pl)pl.onclick=()=>{Photos.startPlus();closeSheets()};
    closeSheets();openSheet("#fullSheet");
  }
  // ── 크게 보기 ──
  const V=()=>$("#pView");
  // ids: 넘겨 볼 사진 목록(대화의 사진 말풍선에서 열 때 = 받은 사진들). 없으면 지금 사진 화면 묶음
  function view(id,ids){vIds=ids&&ids.length?ids.slice():shown().map(m=>m.id);if(!vIds.includes(id))vIds.unshift(id);vi=Math.max(0,vIds.indexOf(id));build();V().classList.add("on");show()}
  function build(){const v=V();if(v.dataset.built)return;v.dataset.built="1";
    v.innerHTML=`<div class="pvtop"><button class="pvx" data-v="close" aria-label="${esc(T("ariaClose"))}">${icon("close")}</button></div>
      <div class="pvimg" id="pvImg"><img alt=""></div>
      <div class="pvinfo"><b id="pvL1"></b><small id="pvL2"></small></div>
      <div class="pvbar"><div class="pvsh"><button data-v="share" aria-label="${esc(T("share"))}">${icon("share")}</button>
        <div class="pvmenu" id="pvMenu"><button data-v="download">${icon("down")}<span>${esc(T("download"))}</span></button></div></div>
        <button data-v="like" id="pvLike" aria-label="${esc(T("like"))}">${icon("heart")}</button><button data-v="delete" aria-label="${esc(T("delete"))}">${icon("trash")}</button></div>`;
    v.addEventListener("click",e=>{const b=e.target.closest("[data-v]");if(!b){if(menu&&!e.target.closest(".pvmenu"))setMenu(false);return}
      const k=b.dataset.v;if(k!=="share"&&k!=="download")setMenu(false);
      if(k==="close")closeView();else if(k==="share")share();else if(k==="download")download();else if(k==="like")like();else if(k==="delete")askDelete()});
    const im=v.querySelector("#pvImg");
    im.addEventListener("pointerdown",e=>{sw={x:e.clientX,y:e.clientY}});
    im.addEventListener("pointerup",e=>{if(!sw)return;const dx=e.clientX-sw.x,dy=e.clientY-sw.y;sw=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy))go(dx<0?1:-1)});
    im.addEventListener("pointercancel",()=>{sw=null});
    im.addEventListener("dragstart",e=>e.preventDefault());
  }
  function go(k){const n=vi+k;if(n<0||n>=vIds.length)return;vi=n;show()}
  const curM=()=>Photos.list().find(m=>m.id===vIds[vi]);
  async function show(){const m=curM();if(!m){closeView();return}setMenu(false);
    // 서아가 보낸 사진(12): 「서아가 보낸 사진 · 장소」, 단계 사진은 「k단계 · 사진 이름」. 둘째 줄 날짜
    const rv=m.kind==="received",R=(k,v)=>UI("seoaPhoto."+k,v);
    $("#pvL1").textContent=m.kind==="booth"?T("infoBooth",{date:fmt(m.at)}):rv?(m.stage?R("infoStage",{stage:R("stageLabel",{k:m.stage}),name:m.title||""}):R("info",{place:m.place||""})):T("info",{name:m.mname||UI("cam.idle"),place:m.place||""});
    $("#pvL2").textContent=m.kind==="booth"?"":fmt(m.at);
    like(true);
    const id=m.id,b=await Photos.blob(id);if(vIds[vi]!==id||!b)return;
    if(vUrl)URL.revokeObjectURL(vUrl);vUrl=URL.createObjectURL(b);V().querySelector("#pvImg img").src=vUrl;
    shareF=null;prepShare(id,b);  // 공유 파일을 미리 만들어 둠(아이폰: 누른 순간 바로 공유 창을 열어야 함)
  }
  // 12: 크게 보기를 한 번도 안 열었으면 #pvImg 가 없음(시연 장면 이동·초기화가 여기서 멈추던 문제)
  function closeView(){V().classList.remove("on");setMenu(false);if(vUrl){URL.revokeObjectURL(vUrl);vUrl=null}const im=$("#pvImg img");if(im)im.removeAttribute("src");shareF=null;if(sheetOn())render()}
  function like(only){const m=curM();if(!m)return;if(only!==true){m.liked=!m.liked;Photos.setLiked(m.id,m.liked)}
    const b=$("#pvLike");b.classList.toggle("on",!!m.liked);b.setAttribute("aria-pressed",m.liked?"true":"false")}
  // ── 공유 ──
  // 공유하는 이미지에만 구석에 「moti · 윤서아」(앱 안 사진에는 없음)
  async function marked(b){const img=await new Promise(res=>{const u=URL.createObjectURL(b),i=new Image();i.onload=()=>{URL.revokeObjectURL(u);res(i)};i.onerror=()=>{URL.revokeObjectURL(u);res(null)};i.src=u});
    if(!img)return b;const c=document.createElement("canvas");c.width=img.naturalWidth;c.height=img.naturalHeight;const g=c.getContext("2d");g.drawImage(img,0,0);
    const s=PCFG().share||{},W=c.width,fs=Math.round(W*(s.sizeK||.026)),mg=Math.round(W*(s.marginK||.03)),txt=T("mark");
    g.font=`700 ${fs}px "Pretendard","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif`;g.textBaseline="middle";
    const tw=g.measureText(txt).width,px=Math.round(fs*.6),bh=Math.round(fs*1.7),bw=Math.round(tw+px*2),bx=W-mg-bw,by=c.height-mg-bh;
    g.fillStyle=s.bg||"rgba(0,0,0,.32)";g.beginPath();g.roundRect?g.roundRect(bx,by,bw,bh,bh/2):g.rect(bx,by,bw,bh);g.fill();
    g.fillStyle=s.color||"rgba(255,255,255,.85)";g.fillText(txt,bx+px,by+bh/2);
    return await new Promise(r=>c.toBlob(r,"image/jpeg",.9))}
  const fname=m=>{const d=new Date(m.at);return `moti-${d.getFullYear()}${P2(d.getMonth()+1)}${P2(d.getDate())}-${P2(d.getHours())}${P2(d.getMinutes())}${P2(d.getSeconds())}.jpg`};
  // 포토부스 사진(11, 22단계에서 포토부스는 뺐지만 전에 찍은 사진은 남음)은 아래 줄에 이미 「moti · 윤서아」가 있어서 표시를 더 넣지 않음
  async function prepShare(id,b){const m=Photos.list().find(x=>x.id===id);const mb=m&&m.kind==="booth"?b:await marked(b);if(vIds[vi]!==id)return;shareF={id,file:new File([mb],fname(m),{type:"image/jpeg"})};return shareF}
  // 공유 창을 열 수 있는지(?share=off 로 못 여는 브라우저 흉내)
  const canShare=f=>qs.get("share")!=="off"&&!!(navigator.share&&navigator.canShare&&navigator.canShare({files:[f]}));
  async function share(){const m=curM();if(!m)return;
    let f=shareF&&shareF.id===m.id?shareF.file:null;
    if(!f){const r=await prepShare(m.id,await Photos.blob(m.id));f=r&&r.file}if(!f)return;
    if(!canShare(f)){setMenu(!menu);return}
    try{await navigator.share({files:[f]})}catch(e){if(!e||e.name!=="AbortError")setMenu(true)}}
  function setMenu(v){menu=!!v;const el=$("#pvMenu");if(el)el.classList.toggle("on",menu)}
  async function download(){setMenu(false);const m=curM();if(!m)return;let f=shareF&&shareF.id===m.id?shareF.file:null;
    if(!f){const r=await prepShare(m.id,await Photos.blob(m.id));f=r&&r.file}if(!f)return;saveFile(f)}
  function saveFile(f){const u=URL.createObjectURL(f),a=document.createElement("a");a.href=u;a.download=f.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)}
  // ── 지우기(확인 한 번) ──
  function askDelete(){const el=$("#pConfirm");
    el.innerHTML=`<div class="pcbox" role="alertdialog" aria-modal="true"><p>${esc(T("delConfirm"))}</p><div><button data-k="cancel">${esc(T("delCancel"))}</button><button data-k="ok" class="danger">${esc(T("delOk"))}</button></div></div>`;
    el.classList.add("on");
    el.onclick=async e=>{const b=e.target.closest("[data-k]");if(!b&&e.target!==el)return;el.classList.remove("on");if(!b||b.dataset.k!=="ok")return;
      const m=curM();if(!m)return;await Photos.remove(m.id);toast(esc(T("deleted")),1800);
      vIds=vIds.filter(x=>x!==m.id);if(!vIds.length){closeView();return}vi=Math.min(vi,vIds.length-1);show()}}
  // ── 시연 패널 ──
  // 사진 가득 채우기: 견본 사진(지금 장소·자세, data/photos.json demo.yaws 각도)을 찍어 돌려 쓰며 칸 수까지
  async function fill(){await Stage.ready;const need=Photos.cap()-Photos.count();if(need<=0)return 0;
    const ys=(PCFG().demo||{}).yaws||[0],shots=[];
    // 견본마다 다른 장소(지금 장소부터)·각도. 정보 줄의 장소는 그 견본을 찍은 장소
    for(let i=0;i<ys.length;i++){const si=(S.scene+i)%SCENES.length,r=await Shot.take(si,(cam,a)=>Cam.setCam(cam,a,ys[i],0),{shadow:!Cam.isOpen()});
      shots.push({full:await new Response(r.full).arrayBuffer(),thumb:await new Response(r.thumb).arrayBuffer(),type:r.full.type,size:r.full.size,w:r.w,h:r.h,scene:si,place:r.place})}
    const ids=COL.items.filter(x=>x.source==="chat").map(x=>x.id),now=Date.now(),items=[];
    for(let k=0;k<need;k++){const s=shots[k%shots.length],mid=k%4===3?null:ids[k%ids.length],id=Photos.newId()+k;
      items.push({m:{id,kind:"camera",at:now-(k+1)*3600e3,mid,mname:mid?MNAME[mid]||mid:null,scene:s.scene,place:s.place,liked:k%5===0,w:s.w,h:s.h,type:s.type,size:s.size,thumbType:s.type,thumb:s.thumb},f:{id,data:s.full}})}
    await Photos.addMany(items);return need}
  Photos.onChange(()=>{if(sheetOn())render()});
  // sharedBlob: 공유용 표시가 들어간 이미지(확인·보고서 캡처용)
  return{sheet,render,fullSheet,buy,view,fill,closeView,canShare,saveFile,fname,isViewOn:()=>V().classList.contains("on"),sharedBlob:async id=>marked(await Photos.blob(id))};
})();
