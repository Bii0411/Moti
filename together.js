// moti 함께하기(84). 서아 본편 대화방 ＋ 기능판 「함께하기」 → 몰입형 전체 화면(위 약 60% 3D · 아래 약 40% 행동 버튼).
// 관계 단계(본편 S.story.stage)마다 할 수 있는 행동과 서아의 반응이 다르다. 설정·연출 data/together.json, 화면 문구 data/ui.json together.
// 모든 반응은 앱 안에서만: /chat·/judge 호출 · 호감 · 대화 횟수 · 대화 기록 · 다이아 · 카드 지급 · 서사 이벤트 · 선물 조건 변화 없음.
// 3D 는 대화 무대의 그림판·캐릭터를 빌려 씀(Stage.borrow, 모델을 다시 불러오지 않음). 빌린 동안 Stage.solo 로 바깥 예약 몸짓·표정을 막고,
// 함께하기 몸짓은 Stage.play(quiet + solo) — 최근 몸짓·대화 몸짓 기록·이름 칩·확대·모션 강조(cue)·도감 기록·카드 그림에 들어가지 않는다.
// 세션 토큰(tok): 열고 닫을 때마다 +1. 그 전에 잡힌 타이머·모션 불러오기 결과는 모두 버림.
// 사진 촬영 권한(PhotoAsk)과는 따로: 함께하기 해금은 관계 단계만 본다.
// index.html 본 스크립트보다 먼저 불린다. S·DATA·UI·Stage·curStage 등은 함수 안에서만 쓴다.

const Together=(()=>{
  const D=()=>((typeof DATA!=="undefined"&&DATA.together)||{});
  const T=(k,v)=>UI("together."+k,v);
  const A='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  // 선 아이콘(icons.js 와 같은 굵기·끝 모양, 직접 그림)
  const ICON={
    together:'<circle cx="8.6" cy="9.4" r="2.6"/><path d="M3.9 19.5c.5-2.9 2.3-4.6 4.7-4.6s4.2 1.7 4.7 4.6"/><circle cx="16" cy="10.6" r="2.2"/><path d="M14 15.3c.6-.3 1.3-.4 2-.4 2.1 0 3.6 1.5 4.1 4.6"/><path d="M16.4 3.4c.5-.8 1.9-.8 2.1.4.2 1.1-1.1 2-2.1 2.6-1-.6-2.3-1.5-2.1-2.6.2-1.2 1.6-1.2 2.1-.4z"/>',
    still:'<path d="M5 19c0-7.6 5-12.6 14-14-1 8.8-6 13.8-14 14z"/><path d="M5 19l7.5-7.5"/>',
    tease:'<circle cx="12" cy="12" r="8.6"/><path d="M8.2 10.4h2.2"/><path d="M15.2 10.4h.01"/><path d="M8.4 14.2c1.9 2.2 5.3 2.2 7.2 0"/>',
    look:'<path d="M2.6 12s3.5-6 9.4-6 9.4 6 9.4 6-3.5 6-9.4 6-9.4-6-9.4-6z"/><circle cx="12" cy="12" r="2.6"/>',
    eye:'<path d="M2.8 13.4s2.7-4.6 7.2-4.6 7.2 4.6 7.2 4.6-2.7 4.6-7.2 4.6-7.2-4.6-7.2-4.6z"/><circle cx="10" cy="13.4" r="1.9"/><path d="M18.6 3.2l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z"/>',
    hand:'<path d="M7 11.6V6.9a1.4 1.4 0 0 1 2.8 0V11"/><path d="M9.8 10.6V5.4a1.4 1.4 0 0 1 2.8 0v5.2"/><path d="M12.6 10.7V6.4a1.4 1.4 0 0 1 2.8 0v5.2"/><path d="M15.4 11.5V9.2a1.4 1.4 0 0 1 2.8 0v4.6c0 3.9-2.6 6.7-6.3 6.7-2.4 0-3.9-1-5.1-2.9l-2.2-3.4a1.4 1.4 0 0 1 2.3-1.6L7 13.5"/>',
    close:'<path d="M3.8 8l4 4-4 4"/><path d="M20.2 8l-4 4 4 4"/><path d="M12 14.6l-1.7-1.6a1.15 1.15 0 0 1 1.7-1.6 1.15 1.15 0 0 1 1.7 1.6z"/>'
  };
  const svg=(n,sz)=>`<svg width="${sz||24}" height="${sz||24}" ${A}>${ICON[n]||""}</svg>`;
  const reduced=()=>!!(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches);
  const now=()=>performance.now();

  let root=null,on=false,tok=0,tab="act",act=null,cool=0,autoT=null,autoAct=null,chkI=null,lastAuto=null,lastStage=0,lastScene=-1,lastFree="",coolT=null;
  const lastPick={};const timers=new Set();
  // 84-2: lastM = 이번 함께하기에서 마지막으로 재생한 몸짓(행동·자동·자유 모션 공통, 대화 최근 몸짓 기록과 따로 · 저장 안 함). 같은 몸짓 묶음(data/motion_keywords.json same, x19·x49)은 같은 몸짓으로 봄
  let lastM=null;
  const famOf=m=>typeof sameOf==="function"?sameOf(m):[m];
  const sameAsLast=m=>!!lastM&&famOf(lastM).includes(m);
  const wpick=L=>{const tot=L.reduce((a,v)=>a+(v.w>0?+v.w:v.w===0?0:1),0);let r=Math.random()*tot;for(const v of L){r-=v.w>0?+v.w:v.w===0?0:1;if(r<0)return v}return L[L.length-1]};  // w 비중(기본 1)
  const oneF=f=>Array.isArray(f)?f[Math.floor(Math.random()*f.length)]:f;  // 표정 후보가 배열이면 그중 하나
  // 84-1 E-4: 잡아 둔 타이머는 끝나거나(drop) 취소되면 목록에서 빠짐(오래 써도 쌓이지 않게). 닫을 때 남은 것 모두 취소
  const later=(f,ms)=>{const t=setTimeout(()=>{timers.delete(t);f()},Math.max(0,ms||0));timers.add(t);return t};
  const drop=t=>{if(t!=null){clearTimeout(t);timers.delete(t)}};
  const firstMs=()=>+((D().auto||{}).firstMs)||12000;
  // 카메라 다가가기(가까이 다가가기): k = 거리 배율(1 = 기본 구도). from→to 를 ms 동안 부드럽게
  const cz={k:1,from:1,to:1,t0:0,ms:0};
  const log=[];const note=x=>{log.push({at:Math.round(now()),...x});if(log.length>40)log.shift()};

  // ── 단계·행동 ──
  const stageN=()=>typeof curStage==="function"?curStage():1;
  const actsOf=n=>((D().stages||{})[n])||[];
  const freeOn=(n=stageN())=>n>=(+D().freeStage||6)&&actsOf(n).length>0;
  const idleFace=(n=stageN())=>((D().idleFace||{})[n])||"soft";
  // 84-1 E-3: 쓰임새마다 권한을 나눔. baseOk = 재생 가능 · 장소(placeBan·placeOnly) · 에피소드 전용(episodeOnly)
  const baseOk=m=>!!m&&typeof canPlay==="function"&&canPlay(m)&&placeOkMotion(m);
  const onlyOf=m=>((((typeof DATA!=="undefined"&&DATA.motions)||{}).motions||{})[m]||{}).only||"";
  // 교감·자동(actOk): 지금 단계 행동 데이터·자동 목록에 적힌 후보만 여기까지 옴. 일반 대화 몸짓은 해금된 것(unlockedIds = 단계·판정 해금, ban·only 제외),
  //   함께하기 전용 몸짓을 새로 만들면 only "together" 로 둠. 그 밖의 전용(preview·gift·pose·wait·onboarding·selfie·pack·walk 등)은 막음
  const actOk=m=>{if(!baseOk(m))return false;const o=onlyOf(m);if(o)return o==="together";return typeof unlockedIds!=="function"||unlockedIds().includes(m)};
  // 자유 모션(freeMotionOk): 가진 카드 조건·카드팩 허용 목록은 freeOk 가 봄. 여기서는 재생·장소 + 검수 전용 차단
  const freeMotionOk=m=>baseOk(m)&&onlyOf(m)!=="preview";
  const okFor=(m,kind)=>kind==="preview"?typeof canPlay==="function"&&canPlay(m):kind==="free"?freeMotionOk(m):actOk(m);

  // 들어갈 수 없는 이유(없으면 ""). UI 버튼·직접 호출 모두 이것을 지남(C-6)
  function why(){
    if(typeof S==="undefined"||S.room!=="seoa"||curTab!=="chat")return "room";
    if(Thread.cur()!=="main"||EpStage.on())return "room";
    if(End.locked("main"))return "ended";
    const n=stageN();if(!actsOf(n).length)return n===5?"crisis":"closer";
    if(busy||waiting||judgeP)return "busy";  // 내 메시지 처리·답장 기다림·관계 판정
    if(Night.isOn()||(S.night&&S.night.ph==="go"))return "busy";  // 밤 전환
    if(EpScene.isOn()||Stage.walk.busy()||FirstMeet.isOn()||View.held()||End.isPlaying()||Ending.isPlaying())return "busy";  // 서사 장면·걷기·첫 만남·끝 화면 연출
    if(document.querySelector("#stage .plveil.on"))return "busy";  // 장소 전환 중
    if(typeof introEnd!=="undefined"&&now()<introEnd)return "busy";
    if(unlockBusy||unlockQ.length||$("#gradeFx").classList.contains("on")||$("#firstChip").classList.contains("on"))return "busy";  // 카드 얻기·해금 연출
    if(Stage.isLent()||Cam.isOpen()||Cards.isOpen()||Pack.isOpen()||PhotoUI.isViewOn()||(typeof Onboard!=="undefined"&&Onboard.isOpen()))return "busy";  // 다른 렌더러·전체 화면
    if(SeoaPhoto.isSending()||Greet.pending())return "busy";
    if(Stage.readyMs()==null)return "busy";  // 3D 준비 전
    return ""}
  // 함께하기 중 계속 있어도 되는지(바뀌면 닫음). 진입 조건 중 「지금 상태」로 바뀔 수 있는 것만
  function stayWhy(){
    if(S.room!=="seoa"||curTab!=="chat"||Thread.cur()!=="main"||EpStage.on())return "room";
    if(End.locked("main"))return "ended";
    if(!actsOf(stageN()).length)return "stage";
    if(busy||waiting||judgeP||Night.isOn()||EpScene.isOn()||FirstMeet.isOn()||End.isPlaying()||Ending.isPlaying())return "busy";
    if(Stage.lentTo()!=="together")return "lent";
    return ""}
  const lockKind=w=>w==="closer"||w==="crisis"||w==="ended"?w:w==="room"?"":"busy";
  // ＋ 기능판: 본편 서아 대화방이면 포즈 칸 대신 함께하기 칸(에피소드는 포즈 그대로). 단계로 잠겼으면 작은 자물쇠(사진 권한 자물쇠와 따로)
  function fnUI(){const p=document.querySelector('#fnPanel [data-fn="pose"]'),b=document.querySelector('#fnPanel [data-fn="together"]');if(!b)return;
    const main=Thread.cur()==="main";b.hidden=!main;if(p)p.hidden=main;if(!main)return;
    const w=why(),lk=w==="closer"||w==="crisis"||w==="ended";b.classList.toggle("plocked",lk);
    let k=b.querySelector(".fnlock");if(lk&&!k){k=document.createElement("span");k.className="fnlock";k.innerHTML=Icon.svg("lock",12);b.querySelector(".tile").appendChild(k)}else if(!lk&&k)k.remove()}

  // ── 화면 ──
  function build(){if(root)return;
    root=document.createElement("div");root.className="tg";root.id="together";root.setAttribute("role","dialog");root.setAttribute("aria-modal","true");root.setAttribute("aria-hidden","true");
    root.innerHTML=`<div class="tgtop"><div class="tgbg"></div><div class="tgdim"></div><div class="tggl"></div>
      <button class="tgback" type="button" data-tg="back">${Icon.svg("back",22)}</button><span class="tgchip"></span></div>
      <div class="tgbot"><div class="tgtabs" role="tablist"></div><div class="tgscroll"></div></div>`;
    (document.querySelector(".app")||document.body).appendChild(root);
    root.addEventListener("click",e=>{const b=e.target.closest("[data-tg],[data-act],[data-f]");if(!b||!on)return;
      if(b.dataset.tg==="back")return close();
      if(b.dataset.tg==="tab")return setTabIn(b.dataset.v);
      if(b.dataset.act)return run(b.dataset.act);
      if(b.dataset.f)return playCard(b.dataset.f)});
    root.addEventListener("touchmove",e=>{if(on&&!e.target.closest(".tgscroll"))e.preventDefault()},{passive:false});  // 위 3D 칸은 스크롤되지 않게(아래 목록만)
    document.addEventListener("visibilitychange",onVis)}
  const $r=s=>root.querySelector(s);
  function chip(){const n=stageN(),c=$r(".tgchip");c.innerHTML=`${Icon.heart(n,18)}<b>${esc(T("stage",{name:mainStageName()}))}</b>`;c.style.color=typeof bondColor==="function"?bondColor(n):""}
  function place(){const sc=SCENES[S.scene]||SCENES[0];$r(".tgbg").style.backgroundImage=`url(${sc.img})`;const d=$("#bgdim"),td=$r(".tgdim");if(d){td.className=d.className.replace(/\bbgdim\b/,"").trim()+" tgdim";td.style.cssText=d.style.cssText}lastScene=S.scene}
  function render(){if(!root)return;const n=stageN(),fo=freeOn(n);lastStage=n;if(!fo)tab="act";chip();
    const tb=$r(".tgtabs");tb.hidden=!fo;
    tb.innerHTML=fo?["act","motion"].map(k=>`<button type="button" role="tab" data-tg="tab" data-v="${k}" aria-selected="${tab===k}" class="${tab===k?"on":""}">${esc(T("tabs."+k))}</button>`).join(""):"";
    const sc=$r(".tgscroll");
    if(tab==="motion"){const L=freeList();lastFree=L.map(x=>x.id).join(",");
      if(!L.length){sc.innerHTML=`<p class="tgempty">${esc(T("empty")).replace(/\n/g,"<br>")}</p>`}
      else{sc.innerHTML=Cards.grid(L);sc.querySelectorAll(".mc[data-f]").forEach(b=>{const x=L.find(y=>y.id===b.dataset.f);if(x)b.setAttribute("aria-label",T("playCard",{name:x.name}))});Cards.hydrate(sc)}}
    else sc.innerHTML=`<div class="tggrid">${actsOf(n).map(id=>`<button type="button" class="tga" data-act="${esc(id)}"><span class="tgi">${svg(((D().actions||{})[id]||{}).icon||id,26)}</span><b>${esc(T("actions."+id))}</b><small class="tgld"></small></button>`).join("")}</div>`;
    busyUI()}
  // 행동 중: 누른 버튼만 살짝 강조, 나머지는 잠깐 누를 수 없음(게임 스킬처럼 쿨다운 숫자·막대는 없음)
  function busyUI(){if(!root)return;const lock=!!act||now()<cool;
    root.querySelectorAll(".tga,.tgscroll .mc").forEach(b=>{const mine=!!act&&((b.dataset.act&&b.dataset.act===act.id)||(b.dataset.f&&"card:"+b.dataset.f===act.id));
      b.classList.toggle("tgon",mine);b.classList.toggle("tgwait",lock&&!mine);b.setAttribute("aria-disabled",lock?"true":"false")});
    root.querySelectorAll(".tgld").forEach(x=>{x.textContent=""})}
  function loadingUI(my,v){if(act!==my||!root)return;const b=root.querySelector(`.tga[data-act="${my.id}"] .tgld`);if(b&&v)b.textContent=T("loading")}
  function setTabIn(k){if(!freeOn()||(k!=="act"&&k!=="motion")||k===tab)return;tab=k;settle("tab",true);render()}  // 84-1 E-1: 행동·자동 교감 모두 정리하고 자동은 처음부터 다시 셈

  // ── 3D 카메라(빌린 그림판, 매 프레임) ──
  function tick(t,w,h){if(!on||!w||!h)return;const C=D().camera||{},F=C.frame||{top:1.07,bottom:.27,width:.52,lift:.02},cam=Stage.three().cam;
    if(cam.view&&cam.view.enabled)cam.clearViewOffset();
    if(Math.abs(cam.aspect-w/h)>1e-3){cam.aspect=w/h;cam.updateProjectionMatrix()}
    if(cz.ms>0){const k=Math.min(1,(t-cz.t0)/cz.ms),e=k*k*(3-2*k);cz.k=cz.from+(cz.to-cz.from)*e;if(k>=1)cz.ms=0}else cz.k=cz.to;
    const H=Stage.height(),tn=Math.tan(cam.fov*Math.PI/360),f=C.focus!=null?+C.focus:.8,k=cz.k;
    const top=f+(F.top-f)*k,bot=f+(F.bottom-f)*k,cy=(top+bot)/2*H,d=Math.max((top-bot)*H/2/tn,(F.width||0)*k*H/2/(tn*(w/h)));
    const o=Stage.center(0),rf=C.rootFollow!=null?+C.rootFollow:.7,x=o.x*rf,z=o.z*rf;
    cam.position.set(x,cy+(F.lift||0)*H,z+d);cam.lookAt(x,cy,z)}
  function camGo(k,ms){if(reduced()){cz.to=cz.k=1;cz.ms=0;return false}cz.from=cz.k;cz.to=k;cz.t0=now();cz.ms=ms||0;return true}

  // ── 열기·닫기 ──
  function enter(){const w=why();if(w){const k=lockKind(w);toast(esc(T("lock."+(k||"busy"))));note({enter:w});return false}open();return true}
  function open(){if(on)return;build();
    if(Fn.isOn())Fn.set(false);
    on=true;tok++;tab="act";act=null;autoAct=null;cool=0;cz.k=cz.from=cz.to=1;cz.ms=0;lastAuto=null;lastM=null;for(const k in lastPick)delete lastPick[k];
    if(typeof faceRT!=="undefined")clearTimeout(faceRT);  // 대화에서 7초 뒤 기본 표정으로 돌아가는 타이머가 함께하기 표정을 덮지 않게
    View.rest(true);MotionCue.clear();  // 91: 함께하기에는 대화 모션 강조가 없음
    place();render();
    root.classList.add("on");root.setAttribute("aria-hidden","false");document.querySelector(".app").classList.add("tgon");
    Stage.solo(true);Stage.gaze(null);Stage.toRest(+D().blendMs||450);Stage.setFace(idleFace(),"","solo");
    Stage.borrow($r(".tggl"),null,tick,{pano:S.scene,owner:"together",yield:()=>close({yielded:true})});
    const C=D().camera||{},cam=Stage.three().cam;if(C.fov>0&&cam.fov!==+C.fov){cam.fov=+C.fov;cam.updateProjectionMatrix()}  // 끝나면 Stage.release 가 빌리기 전 화각으로
    preload();scheduleAuto(+((D().auto||{}).firstMs)||12000);
    clearInterval(chkI);chkI=setInterval(check,500);
    note({open:stageN(),scene:S.scene})}
  // o.yielded = 다른 화면이 그림판을 빌리려 해서 닫음(그 화면이 곧 몸짓·표정을 정하므로 여기서 기본 자세·표정을 건드리지 않음)
  function close(o){if(!on)return;o=o||{};on=false;tok++;
    timers.forEach(clearTimeout);timers.clear();clearTimeout(autoT);autoT=null;drop(coolT);coolT=null;clearInterval(chkI);if(autoAct)autoAct.dead=true;chkI=null;act=null;autoAct=null;cool=0;cz.k=cz.from=cz.to=1;cz.ms=0;
    Stage.gaze(null);Stage.solo(false);
    if(Stage.lentTo()==="together")Stage.release();  // 그림판·화각·크기·360도 배경을 대화 무대로(32-A 저장값)
    Stage.clearLast();  // 끝난 함께하기 몸짓을 촬영·카드 그림·자동 몸짓이 「직전 대화 몸짓」으로 보지 않게
    if(!o.yielded){Stage.setFace(curState()==="sulky"?"sulky":curState()==="tired"?"sorrow":"neutral")}
    root.classList.remove("on");root.setAttribute("aria-hidden","true");document.querySelector(".app").classList.remove("tgon");
    root.querySelector(".tgscroll").innerHTML="";
    note({close:o.yielded?"yield":o.why||"back"})}
  function check(){if(!on)return;const w=stayWhy();if(w)return close({why:w});
    if(S.scene!==lastScene){place();Stage.pano.view(S.scene)}  // 장소가 바뀌면(시연 등) 배경도 같이
    if(stageN()!==lastStage){lastStage=stageN();settle("stage",true);render();preload()}  // 84-1 E-1: 허용된 단계끼리 바뀌어도 하던 것을 정리하고 새 단계 표정·후보로
    else if(tab==="motion"&&freeList().map(x=>x.id).join(",")!==lastFree&&!act)render()}
  // 84-1 E-2: 뒤로 가면 하던 행동·자동 교감·불러오는 몸짓을 모두 정리(입력 잠금·카메라 확대가 남지 않게, 늦게 받은 몸짓이 재생되지 않게).
  //   돌아오면 그 세션이 그대로인지(stayWhy) 보고 자동 교감을 처음(firstMs)부터 셈
  function onVis(){if(!on)return;
    if(document.hidden){settle("hidden",false);note({hidden:1});return}
    const w=stayWhy();if(w)return close({why:w});settle("visible",true)}

  // ── 행동 ──
  // 몸짓 파일 미리 받기(지금 단계 행동·자동 몸짓 후보). 받는 동안에도 행동은 누를 수 있음(받은 뒤 실제 시작 기준으로 끝을 셈)
  function preload(){const n=stageN(),ids=new Set();for(const id of actsOf(n)){const by=(((D().actions||{})[id]||{}).by||{})[n]||{};[by,...(by.variants||[])].forEach(b=>(b.steps||[]).forEach(s=>(s.pick||[]).forEach(v=>ids.add(v.m))))}
    autoList(n).forEach(v=>ids.add(v.m));ids.forEach(m=>{if(XS[m]&&actOk(m))Stage.xs(m)})}  // 84-2: 반응 묶음(variants)·단계별 자동 후보까지, 지금 쓸 수 있는 것만(해금 전·전용 몸짓은 받지 않음)
  const withTimeout=(p,ms)=>{let t=null;return Promise.race([p,new Promise(r=>{t=setTimeout(()=>r(null),ms)})]).finally(()=>clearTimeout(t))};  // 84-1 E-4: 먼저 받으면 기다림 타이머를 바로 지움
  const faceSet=f=>{if(f&&FACE[f])Stage.setFace(f,"","solo")};
  // 몸짓 하나: 파일을 다 받은 뒤 실제로 재생을 시작한 순간부터 길이를 셈. 실패하면 null
  async function playM(m,sp,mine,kind){if(!okFor(m,kind))return null;  // 84-1: kind = 교감·자동(없음) · free(자유 모션) · preview(시연 패널 검수: 재생 가능 여부만)
    if(XS[m]){const d=await withTimeout(Stage.xs(m),+D().loadTimeoutMs||8000);if(!mine())return null;if(!d)return null}
    if(!mine()||!okFor(m,kind))return null;  // 84-2 F-1: 받는 동안 장소·단계가 바뀌었으면 재생 직전에 권한을 다시 봄
    Stage.play(m,{quiet:true,solo:true,speed:sp>0?sp:1,blendMs:+D().blendMs||450});
    if(Stage.playing()!==m)return null;
    return{m,start:now(),ms:Stage.dur(m)*1000/(sp>0?sp:1)}}
  function stopAuto(){clearTimeout(autoT);autoT=null;if(autoAct){autoAct.dead=true;autoAct=null}}
  // 행동 시작. id = data/together.json actions 이름, 또는 내부 "card:카드 id"(자유 모션)
  function run(id){if(!on||act||now()<cool)return false;const n=stageN();
    if(!actsOf(n).includes(id))return false;
    let def=((((D().actions||{})[id]||{}).by)||{})[n];if(!def)return false;
    if(Array.isArray(def.variants)&&def.variants.length)def=wpick(def.variants);  // 84-2: 같은 행동도 반응 묶음 중 하나
    stopAuto();if(Stage.playing())Stage.toRest(+D().blendMs||450);  // 자동 몸짓 중이면 그 몸짓을 섞으며 끝내고 이 행동부터(사용자 행동 우선)
    const my={id,tok,t0:now(),until:0,left:0,pending:0,cam:false,motion:null};act=my;busyUI();note({act:id,stage:n});
    my.until=my.t0+(+def.ms||0);
    if(def.still){Stage.toRest(+D().blendMs||450);my.until=Math.max(my.until,my.t0+(+D().stillMs||900))}
    const steps=(def.steps||[]).slice().sort((a,b)=>(a.at||0)-(b.at||0));my.left=steps.length;
    if(!steps.length)return finishMaybe(my),true;
    steps.forEach(s=>later(()=>step(my,s,id),s.at||0));
    return true}
  const alive=my=>on&&act===my&&my.tok===tok;
  function step(my,s,id){if(!alive(my))return;
    if("gaze" in s)Stage.gaze(s.gaze==="camera"?"steady":s.gaze==="away"?"away":null);
    if(s.f)faceSet(s.f);
    if(s.cam==="in"){const a=(D().actions||{})[my.id]||{};if(camGo(1-(+a.camIn||.12),+a.camInMs||600))my.cam=true}
    if(s.pick)pick(my,s.pick,id);
    my.left--;finishMaybe(my)}
  // 몸짓 후보 고르기: 지금 장소·해금에서 쓸 수 있는 것(카메라가 다가간 동안은 camBan 빼고), 둘 이상이면 직전 함께하기 몸짓·이 행동의 직전 몸짓을 빼고 비중(w)대로 무작위.
  //   84-2: 표정만 다른 같은 몸짓·같은 몸짓 묶음도 같은 몸짓으로 봄. 없으면 첫 후보 표정만
  function pick(my,list,key){let ok=(list||[]).filter(v=>actOk(v.m));if(my.cam||cz.to!==1){const B=D().camBan||[];ok=ok.filter(v=>!B.includes(v.m))}
    if(!ok.length){const f=(list||[])[0]&&oneF(list[0].f);faceSet(f);my.until=Math.max(my.until,now()+(+D().faceOnlyMs||2600));note({faceOnly:key});return}
    const notLast=ok.filter(v=>!sameAsLast(v.m)),fresh=notLast.filter(v=>v.m!==lastPick[key]),P=fresh.length?fresh:notLast.length?notLast:ok,v=wpick(P);
    lastPick[key]=v.m;motion(my,{...v,f:oneF(v.f)})}
  function motion(my,v){my.pending++;const lt=later(()=>loadingUI(my,true),300);
    playM(v.m,v.sp,()=>alive(my),v.k).then(r=>{drop(lt);my.pending--;if(!alive(my))return;
      if(!r){note({fail:v.m});Stage.toRest(+D().blendMs||450);faceSet(idleFace());Stage.gaze(null);my.until=now();busyUI();return finishMaybe(my,true)}  // 불러오기 실패: 기본 자세로, 입력 풀기
      faceSet(v.f);if("g" in v)Stage.gaze(v.g==="camera"?"steady":v.g==="away"?"away":null);lastM=v.m;my.motion=r;my.until=Math.max(my.until,r.start+r.ms);busyUI();note({play:v.m,f:v.f,ms:Math.round(r.ms)});finishMaybe(my)})}  // 84-2: g = 몸짓을 시작할 때 시선
  // 남은 단계·불러오는 몸짓이 없으면 until 에 끝냄
  function finishMaybe(my,now0){if(!alive(my)||my.left>0||my.pending>0||my.endT)return;my.endT=later(()=>end(my),now0?0:my.until-now())}
  function end(my){if(!alive(my))return;act=null;
    Stage.gaze(null);faceSet(idleFace());
    if(my.cam){const a=(D().actions||{})[my.id]||{};camGo(1,+a.camBackMs||800)}
    cool=now()+(+D().cooldownMs||500);busyUI();drop(coolT);coolT=later(busyUI,(+D().cooldownMs||500)+20);
    note({end:my.id,ms:Math.round(now()-my.t0)});
    scheduleAuto(firstMs())}
  // 탭 바꾸기·단계 바뀜: 하던 행동을 끝냄(기본 자세·표정·카메라로)
  function stopAct(why){if(!act)return;const my=act;act=null;drop(my.endT);my.endT=null;Stage.toRest(+D().blendMs||450);Stage.gaze(null);faceSet(idleFace());if(my.cam||cz.to!==1)camGo(1,0);cz.k=cz.to=1;cz.ms=0;cool=0;note({stop:why})}

  // ── 자동 교감(C-1) ──
  // 84-1 E-1·E-2: 하던 것 모두 정리 — 사용자 행동(불러오는 몸짓 결과 무효) · 자동 교감(불러오는 것 포함) · 지금 몸짓 → 기본 자세·표정·시선·카메라.
  //   again = 자동 교감을 처음(firstMs)부터 다시 셈(닫힌 화면·뒤로 간 화면이면 scheduleAuto 가 만들지 않음)
  function settle(why,again){if(!on)return;const was=act?act.id:autoAct?"auto":Stage.playing();
    stopAct(why);stopAuto();if(Stage.playing())Stage.toRest(+D().blendMs||450);
    Stage.gaze(null);faceSet(idleFace());if(cz.to!==1||cz.k!==1){camGo(1,0);cz.k=cz.to=1;cz.ms=0}cool=0;busyUI();
    if(was)note({settle:why,was});if(again)scheduleAuto(firstMs())}
  function scheduleAuto(ms){clearTimeout(autoT);autoT=null;if(!on||document.hidden)return;const my=tok;autoT=setTimeout(()=>{autoT=null;if(on&&my===tok)autoGo()},ms)}
  const gapMs=()=>{const g=(D().auto||{}).gapMs||[12000,20000];return g[0]+Math.random()*Math.max(0,g[1]-g[0])};
  // 84-2 D-1: 단계별 자동 후보 [{m, f 표정 후보, w 비중}](data/together.json auto.byStage, 없으면 예전 motions)
  function autoList(n){const C=D().auto||{},B=(C.byStage||{})[n];return (B&&B.length?B:(C.motions||[]).map(m=>({m}))).filter(v=>v&&v.m)}
  function autoGo(){if(!on)return;if(act||now()<cool)return scheduleAuto(2000);
    const C=D().auto||{},n=stageN(),idle=idleFace(n),fs=((C.faces||{})[n]||[]).filter(f=>FACE[f]),fsx=fs.filter(f=>f!==idle);
    const ms=autoList(n).filter(v=>actOk(v.m)),av=((C.avoidAfter||{})[lastAuto])||[],fresh=ms.filter(v=>v.m!==lastAuto&&!sameAsLast(v.m)&&!av.includes(v.m)),P=fresh.length?fresh:ms;  // 직전 자동·직전 함께하기 몸짓·avoidAfter 는 다른 후보가 있으면 뺌
    const me={tok,dead:false};autoAct=me;const mine=()=>on&&autoAct===me&&!me.dead&&me.tok===tok&&!document.hidden;  // 84-1 E-2: 뒤로 간 동안 받은 몸짓은 재생하지 않음
    const done=()=>{if(!mine())return;autoAct=null;faceSet(idleFace());scheduleAuto(gapMs())};
    if(!P.length||Math.random()<(C.faceOnlyChance!=null?+C.faceOnlyChance:.4)){  // 표정만
      const f=(fsx.length?fsx:fs)[Math.floor(Math.random()*(fsx.length?fsx:fs).length)];faceSet(f);note({auto:"face",f});later(done,+C.faceMs||3200);return}
    const v=wpick(P),m=v.m;lastAuto=m;
    playM(m,1,mine).then(r=>{if(!mine())return;if(!r){note({autoFail:m});autoAct=null;return scheduleAuto(gapMs())}
      const vf=(Array.isArray(v.f)?v.f:v.f?[v.f]:[]).filter(f=>FACE[f]),F=vf.length?vf:fs;const f=F.length?F[Math.floor(Math.random()*F.length)]:null;if(f)faceSet(f);lastM=m;note({auto:m,f});later(done,r.ms)})}

  // ── 연인 자유 모션(D) ──
  // 모션 탭에 보일 카드: 가진 서아 카드 중 허용 유형 · 재생 가능 · 지금 장소·줄기 허용(data/together.json free 설명)
  function freeOk(x){const F=D().free||{},a=S.col[x.id];if(!a||(a.char||"seoa")!=="seoa")return false;
    const mo=Cards.motionOf(x.id),m=mo&&mo.m;if(!m)return false;
    const pack=(F.packMotions||[]).includes(m);
    if(!(x.source==="chat"&&!x.pose&&!x.play)&&!(x.source==="pack"&&pack))return false;  // 대화 카드 또는 카드팩 허용 목록만(선물·순간 선물·포즈·연출 카드 빠짐)
    if((F.exclude||[]).includes(m)||(F.exclude||[]).includes(x.id))return false;
    const M=(DATA.motions.motions||{})[m]||{};if(M.only==="preview")return false;if(M.only&&!pack)return false;  // 선물·포즈·셀카·온보딩·프롤로그·답장 대기·걷기 전용 · 84-1 검수 전용은 팩 목록에 있어도 막음
    const ST=DATA.story||{},X=ST.extraMotions||{};
    if((ST.ban||[]).includes(m)||(X.move||[]).includes(m))return false;
    return freeMotionOk(m)}  // 재생 가능 · 장소(placeBan·placeOnly) · 에피소드 전용(episodeOnly)
  function freeList(){if(!freeOn()||!COL||!COL.items)return[];return COL.items.filter(freeOk)}
  function playCard(cid){if(!on||act||now()<cool||tab!=="motion"||!freeOn())return false;
    const x=freeList().find(y=>y.id===cid);if(!x){note({deny:cid});return false}  // 안 가진 카드·허용 안 된 카드는 재생하지 않음
    stopAuto();if(Stage.playing())Stage.toRest(+D().blendMs||450);const mo=Cards.motionOf(cid),my={id:"card:"+cid,tok,t0:now(),until:0,left:0,pending:0,cam:false,motion:null};act=my;busyUI();
    Stage.gaze(null);note({card:cid,m:mo.m});motion(my,{m:mo.m,f:mo.f,sp:mo.sp,k:"free"});return true}

  // 84-1 시연 패널 「신규 모션 검수」(?debug=1 만): 검수 전용(only preview) 몸짓도 함께하기 구도에서 재생. 사용자 행동처럼 하나만(끝나면 기본 자세·표정, 자동 교감 다시 셈).
  // 기록·카드·호감·관계는 바꾸지 않음(행동과 같은 quiet·solo 재생). 실제 행동·자동·자유 모션의 권한 검사와는 따로
  function preview(m,f){if(!on||typeof DEBUG==="undefined"||!DEBUG||!m||typeof canPlay!=="function"||!canPlay(m))return false;
    if(act)stopAct("preview");stopAuto();if(Stage.playing())Stage.toRest(+D().blendMs||450);
    const my={id:"preview:"+m,tok,t0:now(),until:0,left:0,pending:0,cam:false,motion:null};act=my;busyUI();Stage.gaze(null);note({preview:m});
    motion(my,{m,f:f||"",k:"preview"});return true}

  // 확인용
  const info=()=>({on,tok,tab,stage:stageN(),acts:actsOf(stageN()),why:why(),stay:on?stayWhy():null,act:act&&{id:act.id,left:act.left,pending:act.pending,motion:act.motion&&act.motion.m,inMs:Math.round(act.until-now())},
    auto:autoAct?"on":autoT?"wait":"off",timers:timers.size,cool:Math.max(0,Math.round(cool-now())),cam:+cz.k.toFixed(3),gaze:Stage.gazeMode(),lent:Stage.lentTo(),free:on?freeList().map(x=>x.id):null,log:log.slice()});
  return{enter,open:enter,close:()=>close(),run,playCard,preview,why,ok:(m,kind)=>okFor(m,kind),fnUI,isOn:()=>on,freeList,info,icon:svg};
})();
