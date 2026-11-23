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
    const sc=SCENES[sceneIdx]||SCENES[0],img=await loadImg(sc.img);
    const t0=performance.now(),c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
    g.fillStyle="#140a24";g.fillRect(0,0,W,H);if(img)cover(g,img,W,H,.5,.4);dimLayer(g,W,H);
    const {R,scene,cam}=Stage.three(),pr=R.getPixelRatio(),sz=R.getSize(new THREE.Vector2()),asp=cam.aspect,kp=cam.position.clone(),kq=cam.quaternion.clone();
    if(o.shadow)Stage.shadow(true,(PCFG().camera||{}).shadow);
    R.setPixelRatio(1);R.setSize(W,H,false);cam.aspect=W/H;cam.updateProjectionMatrix();setCam(cam,W/H);
    R.render(scene,cam);g.drawImage(R.domElement,0,0,W,H);  // 같은 작업 안에서 바로 옮겨 그림(그림판이 지워지기 전)
    R.setPixelRatio(pr);R.setSize(sz.x,sz.y,false);cam.aspect=asp;cam.updateProjectionMatrix();cam.position.copy(kp);cam.quaternion.copy(kq);
    if(o.shadow)Stage.shadow(false);
    const t1=performance.now(),type=P.type||"image/jpeg";
    const full=await encode(c,type,P.quality||.86,P.minQuality||.5,P.maxKB||300);
    const thumb=await encode(scaled(c,P.thumbPx||400),type,P.thumbQuality||.72,.4,P.thumbMaxKB||60);
    return{full,thumb,w:W,h:H,place:sc.name,ms:{render:Math.round(t1-t0),encode:Math.round(performance.now()-t1)}};
  }
  return{take,loadImg};
})();

// ───────────────────────── 촬영 화면 ─────────────────────────
const Cam=(()=>{
  let on=false,root=null,fr=null,gl=null,yaw=0,zoom=0,info=null,paused=false,held=null,helpT=null,busy=false;
  const ptrs=new Map();let pinch=null,drag=null;
  const C=()=>PCFG().camera||{};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const stopG=e=>e.preventDefault();
  function build(){
    root=document.createElement("div");root.className="cam";root.id="cam";root.setAttribute("aria-hidden","true");
    root.innerHTML=`<div class="camtop"><button class="camx" data-c="close">${icon("close")}</button><span class="camcount" id="camCount"></span><span class="camsp"></span></div>
      <div class="cammid" id="camMid"><div class="camv" id="camV"><div class="bgdim" id="camDim"></div><div class="camgl" id="camGl"></div>
        <div class="camfull" id="camFull"><p></p><div><button data-c="clear"></button><button data-c="grow"></button></div></div>
        <span class="camchip" id="camChip"></span><div class="camhelp" id="camHelp"></div><div class="camflash" id="camFlash"></div></div></div>
      <div class="cambot"><button class="cambtn" data-c="pause" id="camPause"></button><button class="camshut" data-c="shoot"><i></i></button><button class="camlast" data-c="last" id="camLast"></button></div>`;
    $(".app").appendChild(root);fr=root.querySelector("#camV");gl=root.querySelector("#camGl");
    root.querySelector('[data-c="close"]').setAttribute("aria-label",UI("cam.ariaClose"));
    root.querySelector('[data-c="shoot"]').setAttribute("aria-label",UI("cam.ariaShutter"));
    root.querySelector('[data-c="last"]').setAttribute("aria-label",UI("cam.ariaLast"));
    root.querySelector('[data-c="clear"]').textContent=UI("photoFull.clear");root.querySelector('[data-c="grow"]').textContent=UI("photoFull.grow");
    root.querySelector("#camFull p").textContent=UI("photoFull.notice");
    root.addEventListener("click",e=>{const b=e.target.closest("[data-c]");if(!b)return;const k=b.dataset.c;
      if(k==="close")close();else if(k==="shoot")shutter();else if(k==="pause")togglePause();
      else if(k==="last"){if(Photos.count())PhotoUI.sheet()}else if(k==="clear")PhotoUI.sheet();else if(k==="grow")PhotoUI.fullSheet()});
    // 두 손가락 확대 · 한 손가락 돌기 (포인터 이벤트, 마우스 끌기도 같음). 페이지 확대·스크롤로 새지 않게 touch-action:none + 기본 동작 막기
    fr.addEventListener("pointerdown",e=>{if(e.target.closest("button"))return;try{fr.setPointerCapture(e.pointerId)}catch(err){}ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});base()});
    fr.addEventListener("pointermove",e=>{if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(ptrs.size>=2&&pinch){zoom=clamp(pinch.z+Math.log(dist()/pinch.d)*(C().pinchK||.75),0,1)}
      else if(ptrs.size===1&&drag){const p=[...ptrs.values()][0],mx=C().yawMaxDeg||60;yaw=clamp(drag.yaw-(p.x-drag.x)*(C().degPerPx||.35),-mx,mx)}});
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
  function base(){pinch=ptrs.size>=2?{d:dist(),z:zoom}:null;const p=[...ptrs.values()][0];drag=ptrs.size===1?{x:p.x,yaw}:null}
  // 3:4 칸을 가운데 칸 안에 가장 크게
  function layout(){const m=root.querySelector("#camMid"),A=(PCFG().image||{}).aspect||[3,4],aw=m.clientWidth,ah=m.clientHeight;
    let w=Math.min(aw,ah*A[0]/A[1]),h=w*A[1]/A[0];fr.style.width=Math.floor(w)+"px";fr.style.height=Math.floor(h)+"px"}
  // 구도: zoom 0 = 전신(far) ~ 1 = 얼굴(near) 사이. yaw = 정면 기준 좌우 각도(서아 주위를 돎)
  function setCam(cam,aspect,y,z){const c=C(),F=c.far||{top:1.07,bottom:-.05,width:.8},N=c.near||{top:1.03,bottom:.8,width:.26};z=z!=null?z:zoom;y=y!=null?y:yaw;
    const L=k=>F[k]+(N[k]-F[k])*z,H=Stage.height(),tn=Math.tan(cam.fov*Math.PI/360);
    const top=L("top"),bot=L("bottom"),cy=(top+bot)/2*H,d=Math.max((top-bot)*H/2/tn,L("width")*H/2/(tn*aspect)),r=y*Math.PI/180;
    const o=Stage.center(z);  // 몸짓이 서아를 앞뒤·옆으로 옮겨도(다가가기 등) 서아를 가운데 두고 돎
    cam.position.set(o.x+Math.sin(r)*d,cy+(c.lift||0)*H,o.z+Math.cos(r)*d);cam.lookAt(o.x,cy,o.z)}
  function tick(now,w,h){if(on&&w&&h){const cam=Stage.three().cam;if(cam.view)cam.clearViewOffset();setCam(cam,w/h)}}
  const motionName=x=>x?(x.name||MNAME[x.id]||x.id):"";
  function render(){if(!root)return;
    root.querySelector("#camCount").textContent=UI("cam.count",{n:Photos.count(),cap:Photos.cap()});
    root.querySelector("#camChip").textContent=info?UI(paused?"cam.paused":"cam.loop",{name:motionName(info)}):UI("cam.idle");
    const pb=root.querySelector("#camPause");pb.innerHTML=icon(paused?"play":"pause");pb.disabled=!info;pb.setAttribute("aria-label",UI(paused?"cam.ariaPlay":"cam.ariaPause"));
    const L=Photos.list()[0],lb=root.querySelector("#camLast");lb.innerHTML=L?`<img src="${Photos.thumbUrl(L)}" alt="">`:"";lb.classList.toggle("empty",!L);
    root.querySelector("#camFull").classList.toggle("on",Photos.full())}
  function open(){
    if(on)return;if(!root)build();
    if(typeof View!=="undefined")View.rest(true);
    clearTimeout(faceRT);  // 들어간 순간의 표정 그대로(7초 뒤 기본 표정으로 돌아가는 타이머를 멈춤)
    info=Stage.recentMotion(C().recentMs!=null?C().recentMs:1000);paused=false;held=null;Stage.camLoop(info);
    yaw=0;zoom=0;ptrs.clear();pinch=drag=null;
    const sc=SCENES[S.scene]||SCENES[0];fr.style.backgroundImage=`url(${sc.img})`;Shot.loadImg(sc.img);
    const d=$("#bgdim"),cd=root.querySelector("#camDim");if(d){cd.className=d.className;cd.style.cssText=d.style.cssText}
    on=true;root.classList.add("on");root.setAttribute("aria-hidden","false");layout();
    Stage.borrow(gl,null,tick);Stage.shadow(true,C().shadow);
    document.addEventListener("gesturestart",stopG,{passive:false});document.addEventListener("gesturechange",stopG,{passive:false});
    render();
    const hp=root.querySelector("#camHelp");hp.classList.remove("on");clearTimeout(helpT);
    if(!S.camHelp){S.camHelp=true;save();hp.textContent=UI("cam.help");hp.classList.add("on");helpT=setTimeout(()=>hp.classList.remove("on"),C().helpMs||3000)}
  }
  function close(){
    if(!on)return;on=false;root.classList.remove("on");root.setAttribute("aria-hidden","true");
    document.removeEventListener("gesturestart",stopG);document.removeEventListener("gesturechange",stopG);
    Stage.shadow(false);Stage.camLoop(null);Stage.release();
    // 촬영 중에 온 답장: 나온 뒤 마지막 답장의 몸짓을 재생(그때 처음 본 몸짓이면 도감 기록)
    const h=held;held=null;
    if(h){react(h.r,"");firstSeen(h.mid)}else faceReset();
    if(unlockQ.length&&!unlockBusy)setTimeout(unlockNext,h&&h.mid?Stage.dur(h.mid)*1000+700:600);
  }
  function togglePause(){if(!info)return;paused=!paused;Stage.hold(paused);render()}
  // 셔터 소리: 짧은 잡음 두 덩어리(찰-칵). 아이폰은 누른 그 순간(같은 작업) 안에서 소리 장치를 깨워야 해서 셔터 처리 맨 앞에서 부름
  let ac=null;
  function sound(){const s=PCFG().sound||{};if(s.on===false)return;
    try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==="suspended")ac.resume();const t=ac.currentTime+.01;
      (s.clicks||[]).forEach(k=>{const n=Math.max(1,Math.ceil(ac.sampleRate*k.dur)),b=ac.createBuffer(1,n,ac.sampleRate),ch=b.getChannelData(0);
        for(let i=0;i<n;i++)ch[i]=(Math.random()*2-1)*Math.pow(1-i/n,3);
        const src=ac.createBufferSource();src.buffer=b;const f=ac.createBiquadFilter();f.type="bandpass";f.frequency.value=k.freq||3000;f.Q.value=k.q||1;
        const g=ac.createGain();g.gain.value=(k.gain||.5)*(s.volume!=null?s.volume:1);src.connect(f);f.connect(g);g.connect(ac.destination);src.start(t+(k.at||0))})}catch(e){}}
  function flash(){const f=root.querySelector("#camFlash");f.style.transition="none";f.style.opacity=".9";void f.offsetWidth;f.style.transition=`opacity ${C().flashMs||260}ms ease-out`;f.style.opacity="0"}
  async function shutter(){
    if(busy)return;
    if(Photos.full()){PhotoUI.fullSheet();return}
    sound();flash();busy=true;
    try{const r=await Shot.take(S.scene,(cam,a)=>setCam(cam,a));
      const meta={id:Photos.newId(),kind:"camera",at:Date.now(),mid:info?(info.ref||info.id):null,mname:info?motionName(info):null,scene:S.scene,place:r.place,liked:false,w:r.w,h:r.h};
      const sv=await Photos.add(meta,r.full,r.thumb);
      (window.__photoPerf||(window.__photoPerf=[])).push({...r.ms,save:sv.ms,kb:Math.round(r.full.size/1024),thumbKb:Math.round(r.thumb.size/1024)});
      toast(esc(UI("cam.saved")),1800);
    }catch(e){console.error("사진 저장 실패",e)}
    busy=false;render();
  }
  Photos.onChange(()=>{if(on)render()});
  return{open,close,isOpen:()=>on,hold:x=>{held=x},setCam,render,state:()=>({yaw,zoom,info,paused}),view:(y,z)=>{yaw=y;zoom=z}};
})();

// ───────────────────────── 사진 화면 (10-C 에서 채움) ─────────────────────────
const PhotoUI={sheet(){},render(){},fullSheet(){},view(){},closeView(){},fill:async()=>0,isViewOn:()=>false};
