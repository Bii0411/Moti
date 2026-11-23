// moti 포토부스(11단계): 앨범 「명장면 수집」 제목 오른쪽 「포토부스」 → 네 컷 사진. 값 data/booth.json, 문구 data/ui.json booth
// Booth : 꾸미기 화면(칸마다 포즈·동작 순간·표정·각도, 네 칸 공통 배경·프레임) → 촬영(3·2·1·찰칵) → 결과 → 완성(사진에 저장, 종류 booth)
// 3D 는 앱의 3D 그림판을 빌려 씀(Stage.borrow, 서아 모델을 다시 불러오지 않음). 서아 혼자, 말하지 않음(Stage.lock). blur·filter 효과 없음(아이폰 사파리)
// photos.js 다음, index.html 본 스크립트보다 먼저 불린다. S·DATA·Stage·UI·COL 등은 함수 안에서만 쓴다.

const Booth=(()=>{
  const B=()=>(typeof DATA!=="undefined"&&DATA.booth)||{};
  const T=(k,v)=>UI("booth."+k,v);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const frames=n=>new Promise(r=>{const f=()=>--n<=0?r():requestAnimationFrame(f);requestAnimationFrame(f)});
  let on=false,root=null,pv=null,gl=null,mode="edit",sel=0,retake=null,gen=0;
  let cells=[],common=null,thumbs=[],snapT=null;
  let shots=[null,null,null,null],strip=null,stripAt=0,shareF=null,menu=false,perf={};
  const ptrs=new Map();let pinch=null,drag=null;
  const stopG=e=>e.preventDefault();

  // ── 몸짓 ──
  const C=()=>B().camera||{};
  const playOf=x=>x&&x.source==="gift"?{m:(x.play||{}).m,speed:(x.play||{}).speed||1,f:(x.play||{}).f}:{m:x?x.id:IDLE,speed:1};
  const filmShot=m=>((((DATA.onboarding||{}).film||{}).shots)||[]).find(s=>s.id===m);
  function defMoment(x){if(!x)return 50;const fs=filmShot(playOf(x).m);if(fs&&fs.at!=null)return fs.at;const M=B().moments||{},v=(M.byId||{})[x.id];return v!=null?v:(M.default!=null?M.default:50)}
  function defFace(x){const d=B().defaultFace||"soft";if(!x)return d;const fs=filmShot(playOf(x).m);return (fs&&fs.face)||playOf(x).f||d}
  const playable=x=>!!x&&(RIG.M[playOf(x).m]||XS[playOf(x).m]);
  const gotList=()=>colList("all").filter(x=>S.col[x.id]&&playable(x));
  const nameOf=c=>{const x=colBy(c.pid);return x?x.name:UI("cam.idle")};
  const grades=()=>COL.gradeOrder||["common","rare","special"];
  const gcol=x=>((COL.grades||{})[x.grade]||{}).color||"#a7b0c4";
  // 기본 꾸밈: 서로 다른 모은 몸짓 네 개(등급 높은 것부터, 같은 등급은 앨범 순서), 정면. 네 개보다 적으면 있는 것을 반복. 하나도 없으면 기본 자세
  function defaults(){
    const O=grades(),L=gotList().map((x,i)=>({x,i})).sort((a,b)=>O.indexOf(b.x.grade)-O.indexOf(a.x.grade)||a.i-b.i).map(o=>o.x);
    cells=[0,1,2,3].map(k=>{const x=L.length?L[k%L.length]:null;return{pid:x?x.id:null,at:defMoment(x),face:defFace(x),yaw:0,zoom:0}});
    const bg=(B().bgs||[])[0];common={bg:bg?bg.id:"white",frame:((B().frames||[])[0]||{}).id||"white"};
    thumbs=[null,null,null,null];
  }
  // 모은 몸짓이 바뀌었으면(초기화 등) 못 쓰는 칸은 기본으로
  function check(){const ok=new Set(gotList().map(x=>x.id));
    if(cells.some(c=>c.pid&&!ok.has(c.pid))||(ok.size&&cells.some(c=>!c.pid))){defaults();return}
    if(common.bg.startsWith("place:")&&!places().includes(+common.bg.slice(6)))common.bg=((B().bgs||[])[0]||{}).id||"white"}

  // ── 배경 ──
  // 가 본 장소: 대화에서 머문 장소(S.places) + 명장면을 얻은 장소 + 지금 장소
  function places(){const s=new Set([...(S.places||[]),S.scene||0]);for(const id in S.col){const a=S.col[id];if(a&&a.scene!=null)s.add(a.scene)}
    return [...s].filter(i=>SCENES[i]).sort((a,b)=>a-b)}
  const bgColor=()=>{const b=(B().bgs||[]).find(x=>x.id===common.bg);return b?b.color:null};
  const bgPlace=()=>common.bg.startsWith("place:")?+common.bg.slice(6):null;
  function applyBg(){const pi=bgPlace(),d=root.querySelector("#bDim");
    if(pi!=null&&SCENES[pi]){Stage.bg(null);pv.style.backgroundImage=`url(${SCENES[pi].img})`;Shot.loadImg(SCENES[pi].img);
      const sd=$("#bgdim");d.className=sd?sd.className:"bgdim";d.style.cssText=sd?sd.style.cssText:"";d.style.display="";Look.setPlace(SCENES[pi].name)}
    else{const c=bgColor()||"#f7f5fa";Stage.bg(c);pv.style.backgroundImage="none";pv.style.backgroundColor=c;d.style.display="none";Look.setPlace(null)}}

  // ── 구도 ── zoom 0 = 무릎 위(far) ~ 1 = 상반신(near). yaw = 정면 기준 좌우(서아 주위를 돎). 돌 중심은 서아를 따라감(앞으로 걸어오는 몸짓도 화면 안에)
  function setCam(cam,aspect,c){const F=C().far||{top:1.06,bottom:.27,width:.62},N=C().near||{top:1.05,bottom:.55,width:.45},z=c.zoom||0;
    const L=k=>F[k]+(N[k]-F[k])*z,H=Stage.height(),tn=Math.tan(cam.fov*Math.PI/360);
    const top=L("top"),bot=L("bottom"),cy=(top+bot)/2*H,d=Math.max((top-bot)*H/2/tn,L("width")*H/2/(tn*aspect)),r=(c.yaw||0)*Math.PI/180;
    const o=Stage.center(z);
    cam.position.set(o.x+Math.sin(r)*d,cy+(C().lift||0)*H,o.z+Math.cos(r)*d);cam.lookAt(o.x,cy,o.z)}
  function tick(now,w,h){if(on&&w&&h&&cells[sel]&&mode!=="result"&&mode!=="done"){const cam=Stage.three().cam;if(cam.view)cam.clearViewOffset();setCam(cam,w/h,cells[sel])}}
  // 칸 k 를 서아에게: 그 몸짓의 그 순간에서 멈춤 + 표정. blendMs 동안 지금 자세에서 넘어감
  function apply(k,blendMs){const c=cells[k],x=colBy(c.pid),p=playOf(x);
    Stage.freeze(p.m,c.at/100*Stage.dur(p.m),{blendMs:blendMs||0,speed:p.speed,name:x?x.name:null,ref:x?x.id:null});
    Stage.setFace(c.face,"",true)}

  // ── 한 칸 그리기(3D → 캔버스) ── 지금 서아 자세 그대로, 칸 k 의 구도·배경으로 W×H 에 한 번 더 그림
  const cellAspect=()=>{const a=(B().strip||{}).cellAspect||[4,3];return a[0]/a[1]};
  function drawCell(k,W,H){
    const c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d"),pi=bgPlace();
    if(pi!=null&&SCENES[pi]){g.fillStyle="#140a24";g.fillRect(0,0,W,H);const im=imgs[SCENES[pi].img];if(im)Shot.cover(g,im,W,H,.5,.4);Shot.dimLayer(g,W,H)}
    else{g.fillStyle=bgColor()||"#f7f5fa";g.fillRect(0,0,W,H)}
    const {R,scene,cam}=Stage.three(),pr=R.getPixelRatio(),sz=R.getSize(new THREE.Vector2()),asp=cam.aspect,kp=cam.position.clone(),kq=cam.quaternion.clone();
    R.setPixelRatio(1);R.setSize(W,H,false);cam.aspect=W/H;cam.updateProjectionMatrix();setCam(cam,W/H,cells[k]);
    R.render(scene,cam);g.drawImage(R.domElement,0,0,W,H);  // 같은 작업 안에서 바로 옮겨 그림(그림판이 지워지기 전)
    R.setPixelRatio(pr);R.setSize(sz.x,sz.y,false);cam.aspect=asp;cam.updateProjectionMatrix();cam.position.copy(kp);cam.quaternion.copy(kq);
    return c}
  // 장소 그림은 미리 불러 둠(그릴 때 기다리지 않게)
  const imgs={};
  function preload(){places().forEach(i=>{const s=SCENES[i].img;if(!imgs[s])Shot.loadImg(s).then(im=>{if(im)imgs[s]=im})})}
  // 썸네일: 지금 자세가 그 칸일 때(sel === k, 넘어가는 중 아님)만 찍음
  function snap(k){if(!on||sel!==k)return;const tw=(B().preview||{}).thumbW||240,th=Math.round(tw/cellAspect());thumbs[k]=drawCell(k,tw,th);renderThumbs()}
  function snapLater(ms){clearTimeout(snapT);const my=gen;snapT=setTimeout(()=>{if(my!==gen||!on||mode!=="edit")return;if(Stage.blending())return snapLater(80);snap(sel)},ms!=null?ms:200)}
  // 처음: 네 칸을 차례로 잠깐씩 세워 썸네일을 찍고 1번 칸으로
  async function initThumbs(){const my=gen;
    for(let k=3;k>=0;k--){if(my!==gen)return;sel=k;apply(k,0);Stage.faceNow();renderThumbs();await frames(3);if(my!==gen)return;snap(k)}
    renderOpts()}

  // ── 화면 ──
  function build(){
    root=document.createElement("div");root.className="bth";root.id="booth";root.setAttribute("aria-hidden","true");
    root.innerHTML=`<div class="bthtop"><button class="bthback" data-b="back"></button><h2></h2><span class="bthcount" id="bCount"></span></div>
      <div class="bthmain" id="bMain">
        <div class="bpvwrap"><div class="bpv" id="bPv"><div class="bgdim" id="bDim"></div><div class="bgl" id="bGl"></div>
          <div class="camfull" id="bFull"><p></p><div><button data-b="clear"></button><button data-b="grow"></button></div></div>
          <span class="bshotof" id="bShotOf"></span><b class="bcount3" id="bCd"></b><div class="camflash" id="bFlash"></div></div></div>
        <div class="bthumbs" id="bThumbs"></div>
        <div class="bopts" id="bOpts"></div>
        <div class="bres" id="bRes"><p class="bresnote" id="bResNote"></p><div class="bstrip" id="bStrip"></div></div>
      </div>
      <div class="bthbot" id="bBot"></div>`;
    $(".app").appendChild(root);pv=root.querySelector("#bPv");gl=root.querySelector("#bGl");
    root.querySelector(".bthtop h2").textContent=T("title");root.querySelector('[data-b="back"]').textContent=T("back");
    root.querySelector("#bFull p").textContent=UI("photoFull.notice");
    root.querySelector('[data-b="clear"]').textContent=UI("photoFull.clear");root.querySelector('[data-b="grow"]').textContent=UI("photoFull.grow");
    root.addEventListener("click",onClick);
    root.addEventListener("input",onInput);
    // 미리보기: 끌어서 돌리기 · 두 손가락 확대(휠도). 페이지 확대·스크롤로 새지 않게
    pv.addEventListener("pointerdown",e=>{if(mode!=="edit"||e.target.closest("button"))return;try{pv.setPointerCapture(e.pointerId)}catch(err){}ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});base()});
    pv.addEventListener("pointermove",e=>{if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});const c=cells[sel];
      if(ptrs.size>=2&&pinch)c.zoom=clamp(pinch.z+Math.log(dist()/pinch.d)*(C().pinchK||.75),0,1);
      else if(ptrs.size===1&&drag){const p=[...ptrs.values()][0],mx=C().yawMaxDeg||60;c.yaw=Math.round(clamp(drag.yaw-(p.x-drag.x)*(C().degPerPx||.35),-mx,mx))}
      syncAngle()});
    const up=e=>{if(!ptrs.delete(e.pointerId))return;base();if(!ptrs.size){snapCenter();snapLater()}};
    pv.addEventListener("pointerup",up);pv.addEventListener("pointercancel",up);
    pv.addEventListener("wheel",e=>{e.preventDefault();if(mode!=="edit")return;const c=cells[sel];c.zoom=clamp(c.zoom-e.deltaY*(C().wheelK||.0012)*(e.deltaMode===1?16:1),0,1);syncAngle();snapLater(300)},{passive:false});
    pv.addEventListener("touchmove",stopG,{passive:false});
    pv.addEventListener("touchstart",e=>{if(e.touches.length>1)e.preventDefault()},{passive:false});
    pv.addEventListener("dblclick",stopG);
    window.addEventListener("resize",()=>{if(on){layout();fitStrip()}});
  }
  const dist=()=>{const [a,b]=[...ptrs.values()];return Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};
  function base(){const c=cells[sel];pinch=ptrs.size>=2?{d:dist(),z:c.zoom}:null;const p=[...ptrs.values()][0];drag=ptrs.size===1?{x:p.x,yaw:c.yaw}:null}
  function snapCenter(){const c=cells[sel];if(Math.abs(c.yaw)<=(C().frontSnapDeg!=null?C().frontSnapDeg:3))c.yaw=0;syncAngle()}
  // 미리보기 = 칸 비율(4:3), 화면 폭에 맞춤
  function layout(){pv.style.height=Math.round(pv.offsetWidth/cellAspect())+"px"}
  const angleText=y=>y===0?T("angle.front"):T(y>0?"angle.left":"angle.right",{deg:Math.abs(y)});

  function renderTop(){root.querySelector("#bCount").textContent=T("count",{n:Photos.count(),cap:Photos.cap()});
    root.querySelector("#bFull").classList.toggle("on",Photos.full()&&mode==="edit")}
  function renderThumbs(){const el=root.querySelector("#bThumbs");
    el.innerHTML=cells.map((c,k)=>`<button class="bth1 ${k===sel?"on":""} ${retake!=null&&retake!==k?"off":""}" data-k="${k}" aria-label="${esc(T("cell",{k:k+1}))}"><i>${k+1}</i></button>`).join("");
    el.querySelectorAll("[data-k]").forEach(b=>{const t=thumbs[+b.dataset.k];if(t){const cv=document.createElement("canvas");cv.width=t.width;cv.height=t.height;cv.getContext("2d").drawImage(t,0,0);b.prepend(cv)}})}
  const chip=(attrs,cls,inner)=>`<button class="bchip ${cls}" ${attrs}>${inner}</button>`;
  function renderOpts(){
    const c=cells[sel],el=root.querySelector("#bOpts"),got=new Set(gotList().map(x=>x.id));
    const all=colList("all").filter(playable),L=all.filter(x=>got.has(x.id)).concat(all.filter(x=>!got.has(x.id)));  // 모은 몸짓 먼저, 그 안에서 앨범 순서
    const bgs=(B().bgs||[]).map(b=>chip(`data-bg="${b.id}"`,common.bg===b.id?"on":"",`<span class="sw" style="background:${b.color}"></span>${esc(T("bg."+b.id))}`))
      .concat(places().map(i=>chip(`data-bg="place:${i}"`,common.bg==="place:"+i?"on":"",`<span class="sw img" style="background-image:url(${SCENES[i].img})"></span>${esc(SCENES[i].name)}`))).join("");
    el.innerHTML=`<h3 class="bcellh">${esc(T("cell",{k:sel+1}))}</h3>
      <section><div class="bsh"><b>${esc(T("sec.pose"))}</b><small>${esc(T("poseNote"))}</small></div>
        <div class="bchips" id="bPose">${L.map(x=>{const g=got.has(x.id);return chip(`data-pose="${x.id}" style="--gc:${gcol(x)}"`,`pose ${g?"":"lock"} ${c.pid===x.id?"on":""}`,`<span class="gd"></span>${g?"":"🔒 "}${esc(x.name)}`)}).join("")}</div></section>
      <section><div class="bsh"><b>${esc(T("sec.moment"))}</b><span id="bMomV">${esc(T("momentValue",{n:c.at}))}</span></div>
        <input type="range" class="brange" id="bMom" min="0" max="100" step="1" value="${c.at}"></section>
      <section><div class="bsh"><b>${esc(T("sec.face"))}</b></div>
        <div class="bchips">${(B().faces||Object.keys(FACE)).filter(f=>FACE[f]).map(f=>chip(`data-face="${f}"`,c.face===f?"on":"",esc(FACEKO[f]||f))).join("")}</div></section>
      <section><div class="bsh"><b>${esc(T("sec.angle"))}</b><span id="bAngV">${esc(angleText(c.yaw))}</span></div>
        <input type="range" class="brange" id="bAng" min="${-(C().yawMaxDeg||60)}" max="${C().yawMaxDeg||60}" step="1" value="${-c.yaw}">
        <div class="bzoom"><span aria-hidden="true">${zIcon(false)}</span><input type="range" class="brange" id="bZoom" min="0" max="100" step="1" value="${Math.round(c.zoom*100)}" aria-label="${esc(T("ariaZoomIn"))}"><span aria-hidden="true">${zIcon(true)}</span></div></section>
      <section class="bcommon"><div class="bsh"><b>${esc(T("sec.bg"))}</b></div><div class="bchips">${bgs}</div></section>
      <section class="bcommon"><div class="bsh"><b>${esc(T("sec.frame"))}</b></div>
        <div class="bchips">${(B().frames||[]).map(f=>chip(`data-frame="${f.id}"`,common.frame===f.id?"on":"",`<span class="sw" style="background:${f.color}"></span>${esc(T("frame."+f.id))}`)).join("")}</div></section>`;
    const pe=el.querySelector("#bPose .on");if(pe){const row=el.querySelector("#bPose"),a=pe.getBoundingClientRect(),r=row.getBoundingClientRect();if(a.left<r.left+16||a.right>r.right-16)row.scrollLeft+=a.left-r.left-16}
  }
  const zIcon=plus=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4M8 11h6${plus?"M11 8v6":""}"/></svg>`;
  // 각도 막대는 오른쪽으로 밀면 서아가 오른쪽을 보도록(막대 값 = −yaw)
  function syncAngle(){const c=cells[sel],a=root.querySelector("#bAng"),z=root.querySelector("#bZoom"),v=root.querySelector("#bAngV");
    if(a)a.value=String(-c.yaw);if(z)z.value=String(Math.round(c.zoom*100));if(v)v.textContent=angleText(c.yaw)}
  // 맨 아래 버튼: 꾸미기 = 「촬영」, 결과 = 「다시 꾸미기 · 완성」, 완성 뒤 = 「공유하기 · 닫기」(공유 창을 못 열면 「내려받기」 작은 메뉴)
  function renderBot(){const el=root.querySelector("#bBot");
    if(mode==="result")el.innerHTML=`<div class="bbtns"><button class="bsub" data-b="redo">${esc(T("redo"))}</button><button class="bshoot" data-b="done">${esc(T("done"))}</button></div>`;
    else if(mode==="done")el.innerHTML=`<p class="bsaved">${esc(T("saved"))}</p><div class="bbtns"><div class="pvsh bshw"><button class="bshoot" data-b="share">${esc(T("share"))}</button>
      <div class="pvmenu" id="bMenu"><button data-b="download">${icon("down")}<span>${esc(UI("photo.download"))}</span></button></div></div><button class="bsub" data-b="close">${esc(T("close"))}</button></div>`;
    else el.innerHTML=`<button class="bshoot" data-b="shoot">${esc(T("shoot"))}</button>`;
    root.querySelector(".bthtop h2").textContent=mode==="result"||mode==="done"?T("resultTitle"):T("title")}
  function setMode(m){mode=m;["shooting","result","done","retake"].forEach(c=>root.classList.remove(c));
    if(m==="shoot")root.classList.add("shooting");else if(m==="result"||m==="done"){root.classList.add("result");if(m==="done")root.classList.add("done")}
    if(m==="edit"&&retake!=null)root.classList.add("retake");
    renderBot();renderTop()}
  function render(){renderTop();renderThumbs();renderOpts();renderBot()}

  function pick(k){if(retake!=null&&k!==retake)return;if(k===sel)return;sel=k;apply(k,(B().shoot||{}).blendMs||500);renderThumbs();renderOpts();snapLater()}
  function onClick(e){const b=e.target.closest("button");if(!b||!root.contains(b))return;
    if(b.dataset.b){const k=b.dataset.b;
      if(k==="back")return close();
      if(k==="clear")return PhotoUI.sheet();
      if(k==="grow")return PhotoUI.fullSheet();
      if(k==="shoot")return shoot();
      if(k==="redo")return redo();
      if(k==="done")return finish();
      if(k==="share")return share();
      if(k==="download"){setMenu(false);if(shareF)PhotoUI.saveFile(shareF);return}
      if(k==="close")return close();
      if(k==="cell"&&mode==="result")return retakeCell(+b.dataset.k);
      return}
    if(mode!=="edit")return;
    if(b.dataset.k!=null)return pick(+b.dataset.k);
    const c=cells[sel],bl=(B().shoot||{}).blendMs||500;
    if(b.dataset.pose){const x=colBy(b.dataset.pose);
      if(!S.col[x.id]){toast(esc(T("locked")),1800);return}
      if(c.pid===x.id)return;c.pid=x.id;c.at=defMoment(x);c.face=defFace(x);apply(sel,bl);renderOpts();snapLater();return}
    if(b.dataset.face){c.face=b.dataset.face;Stage.setFace(c.face,"",true);setOn(b,"[data-face]");snapLater(400);return}
    if(b.dataset.bg){common.bg=b.dataset.bg;applyBg();setOn(b,"[data-bg]");resnapAll();return}
    if(b.dataset.frame){common.frame=b.dataset.frame;setOn(b,"[data-frame]");return}
  }
  function setOn(b,q){root.querySelectorAll("#bOpts "+q).forEach(x=>x.classList.toggle("on",x===b))}
  // 배경이 바뀌면 네 칸 썸네일을 다시(지금 칸은 바로, 나머지는 차례로 세워서)
  async function resnapAll(){const my=gen,keep=sel;
    for(const k of [0,1,2,3].filter(k=>k!==keep).concat([keep])){if(my!==gen||mode!=="edit")return;sel=k;apply(k,0);Stage.faceNow();await frames(3);if(my!==gen)return;snap(k)}
    renderThumbs()}
  function onInput(e){const t=e.target;if(mode!=="edit")return;const c=cells[sel];
    if(t.id==="bMom"){c.at=+t.value;root.querySelector("#bMomV").textContent=T("momentValue",{n:c.at});apply(sel,0);snapLater(250)}
    else if(t.id==="bAng"){c.yaw=-(+t.value);if(Math.abs(c.yaw)<=(C().frontSnapDeg!=null?C().frontSnapDeg:3))c.yaw=0;root.querySelector("#bAngV").textContent=angleText(c.yaw);snapLater(250)}
    else if(t.id==="bZoom"){c.zoom=+t.value/100;snapLater(250)}}

  // ── 촬영 ── 칸마다 위쪽 「k / 4」, 3·2·1(숫자 하나당 shoot.stepMs) → 찰칵(하얀 깜빡임 + 셔터 소리) → 서아가 다음 포즈로 넘어감
  const cellSize=()=>{const st=B().strip||{},W=st.w||1200,pad=st.pad!=null?st.pad:48,cw=W-2*pad;return{cw,ch:Math.round(cw/cellAspect())}};
  function flash(){const f=root.querySelector("#bFlash");f.style.transition="none";f.style.opacity=".9";void f.offsetWidth;f.style.transition=`opacity ${(B().shoot||{}).flashMs||260}ms ease-out`;f.style.opacity="0"}
  async function shoot(){
    if(mode!=="edit")return;
    if(Photos.full()){PhotoUI.fullSheet();return}   // 사진 칸이 가득 차 있으면 [10]의 가득 참 시트부터
    Cam.audio();                                      // 누른 순간 소리 장치를 깨움(아이폰: 카운트다운 뒤 타이머에서도 소리가 나게)
    const list=retake!=null?[retake]:[0,1,2,3],my=++gen,sh=B().shoot||{},{cw,ch}=cellSize();
    clearTimeout(snapT);ptrs.clear();setMenu(false);setMode("shoot");
    const of=root.querySelector("#bShotOf"),cd=root.querySelector("#bCd"),nums=((DATA.ui||{}).booth||{}).countdown||["3","2","1"],t0=performance.now();
    if(!perf.t0)perf.t0=t0;
    for(let i=0;i<list.length;i++){const k=list[i];
      const first=i===0&&sel===k;sel=k;renderThumbs();apply(k,first?0:(sh.blendMs||500));
      of.textContent=T("shotOf",{k:k+1});of.classList.add("on");
      await wait((first?0:(sh.blendMs||500))+(sh.settleMs||300));if(my!==gen)return;
      for(const n of nums){cd.textContent=n;cd.className="bcount3";void cd.offsetWidth;cd.className="bcount3 on";await wait(sh.stepMs||800);if(my!==gen)return}
      Cam.sound();const s0=performance.now();shots[k]=drawCell(k,cw,ch);perf.cellMs=Math.round(performance.now()-s0);
      flash();cd.textContent=T("click");cd.className="bcount3 on click";
      const tw=(B().preview||{}).thumbW||240,t=document.createElement("canvas");t.width=tw;t.height=Math.round(tw/cellAspect());t.getContext("2d").drawImage(shots[k],0,0,t.width,t.height);thumbs[k]=t;renderThumbs();
      await wait(sh.clickMs||450);cd.className="bcount3";if(my!==gen)return}
    of.classList.remove("on");perf.shootMs=Math.round(performance.now()-t0);
    retake=null;showResult()}
  // ── 결과: 네 칸을 세로로 이은 사진(프레임 색, 아래에 「날짜 · moti · 윤서아」) ──
  const P2=n=>String(n).padStart(2,"0");
  const frameOf=()=>(B().frames||[]).find(f=>f.id===common.frame)||{color:"#ffffff",text:"#4a4358"};
  function compose(){const st=B().strip||{},W=st.w||1200,pad=st.pad!=null?st.pad:48,gap=st.gap!=null?st.gap:24,foot=st.foot!=null?st.foot:150,{cw,ch}=cellSize();
    const H=pad+4*ch+3*gap+foot,c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d"),fr=frameOf();
    g.fillStyle=fr.color;g.fillRect(0,0,W,H);
    shots.forEach((s,k)=>{if(s)g.drawImage(s,pad,pad+k*(ch+gap),cw,ch)});
    stripAt=Date.now();const d=new Date(stripAt),date=(st.date||"{y}.{m}.{d}").replace("{y}",d.getFullYear()).replace("{m}",P2(d.getMonth()+1)).replace("{d}",P2(d.getDate()));
    g.fillStyle=fr.text;g.font=`700 ${st.footSize||34}px "Pretendard","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif`;g.textAlign="center";g.textBaseline="middle";
    g.fillText(T("foot",{date}),W/2,pad+4*ch+3*gap+foot/2);
    return{c,W,H,pad,gap,cw,ch}}
  function showResult(){
    strip=compose();setMode("result");
    const el=root.querySelector("#bStrip"),{c,W,H,pad,gap,cw,ch}=strip;
    c.className="bstripc";el.innerHTML="";el.appendChild(c);el.style.aspectRatio=W+"/"+H;el.style.background=frameOf().color;
    for(let k=0;k<4;k++){const b=document.createElement("button");b.className="bcell";b.dataset.b="cell";b.dataset.k=k;b.setAttribute("aria-label",T("cell",{k:k+1}));
      b.style.cssText=`left:${pad/W*100}%;top:${(pad+k*(ch+gap))/H*100}%;width:${cw/W*100}%;height:${ch/H*100}%`;el.appendChild(b)}
    root.querySelector("#bResNote").textContent=T("resultNote");fitStrip()}
  // 세로로 긴 사진을 남은 높이에 맞춤
  function fitStrip(){if(!root||!strip)return;const r=root.querySelector("#bRes"),el=root.querySelector("#bStrip");if(!r.clientHeight)return;
    const n=root.querySelector("#bResNote"),hh=r.clientHeight-n.offsetHeight-20,w=Math.min(r.clientWidth-32,hh*strip.W/strip.H);el.style.width=Math.floor(w)+"px";el.style.height=Math.floor(w*strip.H/strip.W)+"px"}
  // 결과에서 칸을 누르면 그 칸만 다시 꾸미고 다시 찍음(배경·프레임은 그대로)
  function retakeCell(k){retake=k;gen++;setMode("edit");layout();sel=k;apply(k,0);Stage.faceNow();applyBg();renderThumbs();renderOpts();snapLater()}
  function redo(){retake=null;gen++;setMode("edit");layout();sel=0;apply(0,0);renderThumbs();renderOpts();snapLater()}
  // ── 완성: 사진에 저장(종류 booth, 1장으로 계산). 다시 찍은 컷들은 저장하지 않음 ──
  async function finish(){
    if(mode!=="result"||!strip)return;
    if(Photos.full()){PhotoUI.fullSheet();return}
    const my=gen,I=B().image||{},type=I.type||"image/jpeg",t0=performance.now();
    const full=await Shot.encode(strip.c,type,I.quality||.9,I.minQuality||.6,I.maxKB||900);
    const thumb=await Shot.encode(Shot.scaled(strip.c,I.thumbPx||720),type,I.thumbQuality||.75,.4,I.thumbMaxKB||120);
    const t1=performance.now();
    const meta={id:Photos.newId(),kind:"booth",at:stripAt||Date.now(),mid:null,mname:null,scene:null,place:null,liked:false,w:strip.W,h:strip.H,
      frameColor:frameOf().color,bg:common.bg,cells:cells.map(c=>c.pid)};
    const sv=await Photos.add(meta,full,thumb);if(my!==gen||!on)return;
    perf.encodeMs=Math.round(t1-t0);perf.saveMs=sv.ms;perf.kb=Math.round(full.size/1024);perf.thumbKb=Math.round(thumb.size/1024);perf.w=strip.W;perf.h=strip.H;
    perf.totalMs=perf.t0?Math.round(performance.now()-perf.t0):null;window.__boothPerf={...perf};perf={};
    shareF=new File([full],PhotoUI.fname(meta),{type:full.type||"image/jpeg"});  // 완성본에 이미 표시가 있어서 그대로 공유
    window.__boothLast={id:meta.id,blob:full};
    setMode("done");fitStrip();
    cells=[];  // 다음에 열면 기본 꾸밈부터
  }
  function setMenu(v){menu=!!v;const el=root&&root.querySelector("#bMenu");if(el)el.classList.toggle("on",menu)}
  async function share(){const f=shareF;if(!f)return;
    if(!PhotoUI.canShare(f)){setMenu(!menu);return}
    try{await navigator.share({files:[f]})}catch(e){if(!e||e.name!=="AbortError")setMenu(true)}}

  async function open(){
    if(on)return;if(!root)build();
    await Stage.ready;if(on)return;
    if(typeof View!=="undefined")View.rest(true);
    clearTimeout(faceRT);  // 7초 뒤 기본 표정으로 돌아가는 타이머를 멈춤
    gen++;on=true;retake=null;shareF=null;strip=null;perf={};
    if(!cells.length){defaults();shots=[null,null,null,null]}else check();
    root.classList.add("on");root.setAttribute("aria-hidden","false");setMode("edit");
    Stage.lock(true);Stage.borrow(gl,null,tick);preload();layout();applyBg();
    sel=0;apply(0,0);render();root.querySelector("#bOpts").scrollTop=0;initThumbs();
    document.addEventListener("gesturestart",stopG,{passive:false});document.addEventListener("gesturechange",stopG,{passive:false});
  }
  function close(){
    if(!on)return;on=false;gen++;clearTimeout(snapT);ptrs.clear();setMenu(false);shareF=null;
    if(mode==="done")cells=[];
    root.classList.remove("on");root.setAttribute("aria-hidden","true");
    document.removeEventListener("gesturestart",stopG);document.removeEventListener("gesturechange",stopG);
    Stage.lock(false);Stage.bg(null);Stage.release();
    const sc=SCENES[S.scene]||SCENES[0];if(sc)Look.setPlace(sc.name);
    Stage.setFace(curState()==="sulky"?"sulky":curState()==="tired"?"sorrow":"neutral");
  }
  Photos.onChange(()=>{if(on)renderTop()});
  // 메뉴 밖을 누르면 닫음
  document.addEventListener("click",e=>{if(menu&&!e.target.closest("#bMenu")&&!e.target.closest('[data-b="share"]'))setMenu(false)});
  // refresh: 시연 패널(명장면 모두 열기)이 모은 몸짓을 바꿨을 때
  return{open,close,isOpen:()=>on,refresh:()=>{if(on&&mode==="edit"){check();renderOpts()}},perf:()=>window.__boothPerf,state:()=>({mode,sel,retake,cells:cells.map(c=>({...c})),common:{...(common||{})}})};
})();
