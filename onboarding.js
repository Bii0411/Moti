// moti 온보딩(7단계): 첫 화면 → 입장권(약관) → 로그인 → 홈. 처음 실행일 때만(저장값 S.onboarded).
// 문구·설정은 data/onboarding.json(DATA.onboarding). 이 파일은 index.html 의 본 스크립트보다 먼저 불리지만,
// 본 스크립트의 것($·S·DATA·Stage·setTab 등)은 함수 안에서만 쓰므로 순서 문제는 없다.
const Onboard=(()=>{
  const D=()=>(typeof DATA!=="undefined"&&DATA.onboarding)||{};
  const T=k=>{const v=k.split(".").reduce((o,x)=>o!=null?o[x]:undefined,D());return typeof v==="string"?v:""};
  const tm=(k,d)=>{const t=D().timing||{};return t[k]!=null?t[k]:d};
  const trim=()=>D().trim||{};
  const E=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  // 원고의 <br> 만 줄바꿈으로 살리고 나머지는 글자 그대로
  const EB=s=>E(s).replace(/&lt;br\s*\/?&gt;/gi,"<br>");
  let root=null,step=null,openFlag=false,filled=false;
  const M={};  // 확인용 시간 기록(ms): firstShown·tap·ticketShown·loginShown·done
  const mark=k=>{M[k]=Math.round(performance.now())};

  // 35: 로고 그림(index.html .logo, assets/logo_moti.svg) + 화면 읽기 이름 · 안 보이는 글자(data 의 first.logo)
  function logoMark(el,name){const m=document.createElement("span"),t=document.createElement("span");m.className="logo";m.setAttribute("role","img");m.setAttribute("aria-label",name);t.className="sr";t.textContent=name;m.appendChild(t);el.replaceChildren(m)}
  // ── 어두운 네온 도시 배경(CSS·SVG). 같은 씨앗이면 늘 같은 모양 ──
  function rnd(seed){let s=seed>>>0;return()=>(s=(s*1664525+1013904223)>>>0)/4294967296}
  function city(){
    const r=rnd(7);
    const neonC=["#8b5cf6","#f472b6","#38bdf8","#c4b5fd","#fb7185"];
    let neon="";for(let i=0;i<7;i++){const w=18+r()*46,h=8+r()*26;
      neon+=`<i class="obneon" style="left:${(r()*92).toFixed(1)}%;top:${(56+r()*24).toFixed(1)}%;width:${w.toFixed(0)}px;height:${h.toFixed(0)}px;--c:${neonC[i%neonC.length]};--o:${(.16+r()*.2).toFixed(2)}"></i>`}
    // 건물: 뒤 줄(조금 밝게)·앞 줄(더 어둡게), 창문 점 몇 개
    const row=(n,y0,hMin,hMax,fill)=>{let x=0,p="";while(x<400){const w=22+r()*48,h=hMin+r()*(hMax-hMin);p+=`<rect x="${x.toFixed(0)}" y="${(y0-h).toFixed(0)}" width="${w.toFixed(0)}" height="${(h+2).toFixed(0)}" fill="${fill}"/>`;
      if(r()<.6){for(let k=0;k<3;k++)if(r()<.55)p+=`<rect x="${(x+4+r()*(w-10)).toFixed(0)}" y="${(y0-h+6+r()*(h-14)).toFixed(0)}" width="2" height="3" fill="${r()<.5?"#c4b5fd":"#f9a8d4"}" opacity="${(.25+r()*.35).toFixed(2)}"/>`}
      x+=w+(r()<.3?4:0)}return p};
    const svg=`<svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${row(0,200,70,150,"#1a1429")}${row(1,200,30,95,"#0d0a15")}</svg>`;
    let rain="";for(let i=0;i<34;i++)rain+=`<i style="--x:${(r()*100).toFixed(1)}%;--h:${(40+r()*60).toFixed(0)}px;--d:${(1.9+r()*1.6).toFixed(2)}s;--dl:${(-r()*3.5).toFixed(2)}s;--o:${(.25+r()*.45).toFixed(2)}"></i>`;
    return `<div class="obcity"><div class="obneons">${neon}</div>${svg}<div class="obrain">${rain}</div></div>`;
  }

  function build(){
    if(root)return;
    root=document.createElement("div");root.className="ob";root.id="ob";
    const gear=(document.getElementById("gearBtn")||{}).innerHTML||"";
    root.innerHTML=`${city()}<button class="obgear" id="obGear" type="button">${gear}</button>
      <section class="obscr obfirst" id="obFirst"><div class="obmid"><div class="oblogo" id="obLogo"></div><p class="obtag" id="obTag"></p></div>
        <button class="obbtn" id="obGo" type="button"><span class="spin"></span><span id="obGoT"></span></button></section>
      <section class="obscr obticket" id="obTicket"><div class="obstage" id="obStage"></div>
        <p class="obguide" id="obGuide"></p><div class="obwelcome" id="obWelcome"></div>
        <div class="obcard" id="obCard"><div class="obcbody">
          <div class="obchead"><b id="obCTitle"></b><small id="obCSmall"></small></div>
          <div class="obfaces"><div class="obface obfront" id="obFront">
          <p class="obai" id="obAi"></p>
          <label class="obchk all"><input type="checkbox" data-k="all"><span class="box"></span><span class="tx" id="obAll"></span></label>
          <div class="oblist" id="obList"></div></div>
          <form class="obface obback" id="obBack" novalidate><p class="obbguide" id="obBGuide"></p>
            <label class="obname"><span class="obntag" id="obBLabel"></span><input id="obName" type="text" autocomplete="nickname" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go"></label></form></div></div>
          <div class="obpunch locked" id="obPunch" role="button" tabindex="0"><span class="obhole"><i></i></span><span class="obptx"><b id="obPunchT"></b><small id="obPunchS"></small></span></div>
        </div>
        <div class="obscrim" id="obScrim"></div>
        <div class="obsheet" id="obSheet" role="dialog" aria-modal="true"><h3 id="obSTitle"></h3><p id="obSBody"></p><button class="obbtn" id="obSClose" type="button"></button></div>
      </section>
      <section class="obscr oblogin" id="obLogin"><div class="obhead"><h2 id="obLTitle"></h2><p class="obdesc" id="obLDesc"></p></div>
        <div class="obacts"><button class="obbtn x" id="obX" type="button"></button><button class="obbtn g" id="obG" type="button"></button><button class="obbtn k" id="obK" type="button"></button>
        <button class="obtext" id="obGuest" type="button"></button><p class="obnote" id="obLNote"></p></div></section>`;
    document.querySelector(".app").appendChild(root);
    const q=id=>root.querySelector("#"+id);
    q("obGear").onclick=()=>{if(typeof Demo!=="undefined")Demo.toggle()};
    q("obGo").onclick=goTicket;
    q("obCard").addEventListener("change",onCheck);
    q("obCard").addEventListener("click",e=>{const v=e.target.closest("[data-view]");if(v){e.preventDefault();openTerms(v.dataset.view)}});
    q("obPunch").onclick=punch;q("obPunch").onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();punch()}};
    q("obScrim").onclick=q("obSClose").onclick=closeTerms;
    // 69: 입장권 뒷면 이름칸. 한글 조합 중에는 자르지 않고(조합이 끝나면), 키보드 완료/이동 = 입장(form 제출)
    const nm=q("obName");
    nm.addEventListener("compositionstart",()=>{composing=true});
    nm.addEventListener("compositionend",()=>{composing=false;nameInput()});
    nm.addEventListener("input",e=>{if(!composing&&!e.isComposing)nameInput();else punchText()});
    q("obBack").addEventListener("submit",e=>{e.preventDefault();nameInput();punch()});
    // 키보드가 올라오면(아이폰은 화면 크기가 그대로라 visualViewport 로 앎) 입장권을 키보드 위로
    if(window.visualViewport){const kb=()=>{const v=visualViewport,k=Math.max(0,Math.round(window.innerHeight-v.height-v.offsetTop));kbPx=document.activeElement===nm?k:0;root.style.setProperty("--kb",kbPx+"px")};
      visualViewport.addEventListener("resize",kb);visualViewport.addEventListener("scroll",kb);nm.addEventListener("focus",()=>setTimeout(kb,60));nm.addEventListener("blur",()=>setTimeout(kb,60))}
    q("obG").onclick=q("obK").onclick=q("obX").onclick=demoLogin;  // 69: XSTAGE 도 시연에선 Google·카카오처럼 게스트로
    q("obGuest").onclick=()=>finish("guest");
  }
  // 문구 채우기(데이터가 오면)
  function fill(){
    if(!root||filled||!D().first)return;filled=true;
    const q=id=>root.querySelector("#"+id);
    root.style.setProperty("--fade",tm("fadeInMs",600)+"ms");
    logoMark(q("obLogo"),T("first.logo"));q("obTag").textContent=T("first.tagline");q("obGoT").textContent=T("first.button");
    q("obGuide").textContent=T("ticket.guide");q("obWelcome").textContent=T("ticket.welcome");
    q("obCTitle").textContent=T("ticket.title");q("obCSmall").textContent=T("ticket.small");q("obAi").textContent=T("ticket.ai");q("obAll").textContent=T("ticket.all");
    q("obList").innerHTML=(D().ticket.items||[]).map(it=>`<div class="obrow"><label class="obchk"><input type="checkbox" data-k="${E(it.id)}"${it.required?" data-req":""}><span class="box"></span><span class="tx">${E(it.text)}</span></label>${it.view?`<button type="button" class="obview" data-view="${E(it.view)}">${E(T("ticket.view"))}</button>`:""}</div>`).join("");
    q("obBGuide").textContent=T("ticket.back.guide");q("obBLabel").textContent=T("ticket.back.label");q("obName").placeholder=T("ticket.back.placeholder");q("obName").setAttribute("aria-label",T("ticket.back.label"));
    q("obPunchS").textContent=T("ticket.punchSub");q("obSClose").textContent=T("terms.close");
    punchText();
    q("obLTitle").innerHTML=EB(T("login.title"));q("obLDesc").textContent=T("login.desc");
    q("obX").innerHTML=`<b class="xwm">XSTAGE</b><span>${E(T("login.xstage"))}</span>`;q("obG").textContent=T("login.google");q("obK").textContent=T("login.kakao");q("obGuest").textContent=T("login.guest");q("obLNote").textContent=T("login.note");
    // 빈 문구(20단계 「없앰」)는 자리를 차지하지 않게 숨김
    ["obTag","obGuide","obCSmall","obAi","obPunchS","obLTitle","obLDesc","obLNote"].forEach(id=>{const e=q(id);e.hidden=!e.textContent.trim()});
    q("obAi").classList.toggle("box",!!trim().aiBox);  // AI 안내: 보라 상자(예전) 또는 회색 한 줄
    if(step==="first")showScr("obFirst");  // 데이터가 늦게 오면 그때 로고·소개가 나타남
  }
  // 화면별 배경 덜어내기(20단계, data trim.scenery): 빗줄기·네온 사각형을 끄거나 어두운 단색으로 덮음
  const SCN={obFirst:"first",obTicket:"ticket",obLogin:"login"};
  function scenery(id){
    const t=trim(),c=(t.scenery||{})[SCN[id]]||{};
    root.classList.toggle("norain",c.rain===false);root.classList.toggle("noneon",c.neon===false);root.classList.toggle("solid",!!c.solid);
    if(t.solidColor)root.style.setProperty("--obsolid",t.solidColor);
  }
  function showScr(id){
    scenery(id);
    root.querySelectorAll(".obscr").forEach(s=>{if(s.id!==id)s.classList.remove("on","show")});
    const s=root.querySelector("#"+id);if(!filled)return;
    s.classList.remove("show");s.classList.add("on");void s.offsetWidth;s.classList.add("show");
  }

  // ── 흐름 ──
  function open(){
    build();openFlag=true;step="first";backOnly=false;onDone=null;root.classList.remove("out","backonly");root.classList.add("on");
    for(const k in M)delete M[k];mark("firstShown");
    root.querySelector("#obGo").classList.remove("loading");
    if(typeof dataReady!=="undefined")dataReady.then(fill);fill();
    stageOut();
    if(typeof FirstMeet!=="undefined")FirstMeet.preload();  // 31-1: 첫 만남 연출 장소(네온 골목) 360도 그림 미리 받기
    // 첫 화면이 뜨는 동안 필름 띠 사진도 미리 불러와 셰이더까지 준비(7-2)
    if(typeof Stage!=="undefined")Promise.all([Stage.ready,typeof dataReady!=="undefined"?dataReady:null]).then(()=>Film.prepare());
    showScr("obFirst");
  }
  let going=false;
  // 입장권 받기: 서아 3D가 아직이면 버튼에 로딩 표시를 하고, 준비되면(또는 최대 시간이 지나면) 넘어간다
  function goTicket(){
    if(going||step!=="first")return;going=true;mark("tap");
    const b=root.querySelector("#obGo");
    let done=false;const t=setTimeout(()=>{if(!done)b.classList.add("loading")},60);
    const wait=new Promise(r=>setTimeout(r,tm("preloadMaxWaitMs",15000)));
    Promise.race([typeof Stage!=="undefined"?Stage.ready:Promise.resolve(),wait]).then(()=>{
      done=true;clearTimeout(t);b.classList.remove("loading");going=false;
      if(step!=="first")return;showTicket()});
  }
  function showTicket(){step="ticket";resetTicket();mark("ticketShown");showScr("obTicket");stageIn()}
  function goLogin(){step="login";mark("loginShown");showScr("obLogin");setTimeout(()=>{if(step!=="ticket")stageOut()},380)}

  // ── 입장권 카드: 체크·약관 시트·펀치 ──
  const boxes=()=>[...root.querySelectorAll("#obList input[data-k]")];
  const reqOk=()=>boxes().filter(b=>b.hasAttribute("data-req")).every(b=>b.checked);
  function onCheck(e){
    const t=e.target;if(!t||!t.dataset||!t.dataset.k)return;
    if(t.dataset.k==="all")boxes().forEach(b=>b.checked=t.checked);
    root.querySelector('input[data-k="all"]').checked=boxes().every(b=>b.checked);  // 하나라도 풀면 전체 동의도 풀림
    punchText();
  }
  function punchText(){if(!root||!filled)return;const back=side==="back",ok=back?!!cleanName(root.querySelector("#obName").value,true):reqOk(),p=root.querySelector("#obPunch");
    p.classList.toggle("locked",!ok);p.setAttribute("aria-disabled",ok?"false":"true");
    root.querySelector("#obPunchT").textContent=T(back?"ticket.back.enter":ok?"ticket.punchReady":"ticket.punchLocked")}
  // ── 69: 입장권 뒷면(이름 정하기). 앞뒤 공백 자르기 · 최대 ticket.back.maxLength 자 · 줄바꿈과 ticket.back.ban 글자는 못 넣음 ──
  let side="front",composing=false,kbPx=0,backOnly=false,onDone=null,swapT=null;
  const BK=()=>(D().ticket||{}).back||{};
  function cleanName(v,final){const ban=new Set(Array.from(String(BK().ban!=null?BK().ban:"{}\"「」")));
    let s=Array.from(String(v==null?"":v)).filter(c=>c!=="\n"&&c!=="\r"&&!ban.has(c)).join("").replace(/^\s+/,"");
    s=Array.from(s).slice(0,Math.max(1,+BK().maxLength||8)).join("");
    return final?s.trim():s}
  function nameInput(){const i=root.querySelector("#obName"),c=cleanName(i.value,false);if(c!==i.value)i.value=c;punchText()}
  // 앞면 ↔ 뒷면: 틀(제목·ADMIT ONE·점선·동그라미)은 그대로, 안쪽만 짧게 흐려졌다 바뀜(3D 뒤집기 없음). 두 면은 같은 칸에 겹쳐 있어 카드 높이가 안 바뀜
  function setSide(to,fade){side=to;const c=root.querySelector("#obCard");clearTimeout(swapT);
    const apply=()=>{c.classList.toggle("back",to==="back");root.querySelector("#obFront").inert=to==="back";root.querySelector("#obBack").inert=to!=="back";punchText();c.classList.remove("swap")};
    if(!fade)return apply();
    c.classList.add("swap");swapT=setTimeout(apply,tm("swapMs",180))}
  function resetTicket(){root.querySelectorAll("#obCard input[type=checkbox]").forEach(b=>b.checked=false);
    root.querySelector("#obName").value=cleanName((typeof S!=="undefined"&&S.profile&&S.profile.name)||"",true);setSide(backOnly?"back":"front",false);
    const c=root.querySelector("#obCard"),p=root.querySelector("#obPunch");c.classList.remove("leave");p.classList.remove("punched","shake");
    root.querySelector("#obWelcome").classList.remove("on");root.querySelector("#obGuide").classList.remove("off");punched=false;punchText();closeTerms()}
  function openTerms(k){const t=(D().terms||{})[k]||{};root.querySelector("#obSTitle").textContent=t.title||"";root.querySelector("#obSBody").textContent=t.body||"";
    root.querySelector("#obScrim").classList.add("on");root.querySelector("#obSheet").classList.add("on")}
  function closeTerms(){if(!root)return;root.querySelector("#obScrim").classList.remove("on");root.querySelector("#obSheet").classList.remove("on")}
  let punched=false,leaveT=[];
  function punch(){
    if(step!=="ticket"||punched||root.querySelector("#obCard").classList.contains("swap"))return;
    const p=root.querySelector("#obPunch"),shake=()=>{p.classList.remove("shake");void p.offsetWidth;p.classList.add("shake")};
    // 69: 앞면 = 「다음」(필수 동의를 저장하고 뒷면으로), 뒷면 = 「눌러서 입장」(이름 저장 → 예전 펀치 흐름)
    if(side==="front"){
      if(!reqOk())return shake();  // 필수 동의 전: 살짝 흔들리기만
      const val={};boxes().forEach(b=>val[b.dataset.k]=b.checked);
      S.consent={...val,at:Date.now()};save();  // 선택 동의(이벤트·소식)도 저장만
      mark("next");return setSide("back",true)}
    const name=cleanName(root.querySelector("#obName").value,true);if(!name)return shake();
    S.profile={...(S.profile||{}),name,nameAt:Date.now()};save();
    const inp=root.querySelector("#obName");if(document.activeElement===inp)inp.blur();
    punched=true;mark("punch");
    p.classList.add("punched");
    if(backOnly){  // 이름만 정하러 연 뒷면(예전 유저·설정·시연): 구멍이 뚫리면 흐려지며 닫힘
      Film.punch();const cb=onDone;leaveT.push(setTimeout(()=>{hide();if(cb)cb(name)},tm("backDoneMs",650)));return}
    greet();
    const G=D().greet||{};
    // 카드가 올라가며 사라짐(서아 전신이 보이게 카메라가 살짝 물러남) → 잠깐 머묾 → 3D가 어두워지며 사라짐 → 로그인(7-3)
    const L=(D().scene3d||{}).leave||{},t1=G.leaveMs!=null?G.leaveMs:1700,t2=t1+(G.leaveFadeMs!=null?G.leaveFadeMs:450)+(L.holdMs!=null?L.holdMs:300),fade=L.fadeMs!=null?L.fadeMs:500;
    leaveT.push(setTimeout(()=>{if(step!=="ticket")return;root.querySelector("#obCard").classList.add("leave");leaving={t0:performance.now(),ms:G.leaveFadeMs!=null?G.leaveFadeMs:450}},t1));
    leaveT.push(setTimeout(()=>{if(step!=="ticket")return;const st=root.querySelector("#obStage");st.style.setProperty("--stfade",fade+"ms");st.classList.add("fade")},t2));
    leaveT.push(setTimeout(()=>{if(step==="ticket")goLogin()},t2+fade));
  }
  // 인사: 서아 손 흔들기(43: x23 두 손 흔들기, data/onboarding.json greet.motion. 34-1 의 m13·34 의 x20 은 남겨 둠) + 필름 띠가 잠깐 밝고 빨라짐. 글자(ticket.welcome)는 trim.welcome 이 켜져 있고 문구가 있을 때만(20단계부터 끔)
  function greet(){
    const G=D().greet||{};
    if(typeof Stage!=="undefined"){Stage.play(G.motion||"m13",{quiet:true});Stage.setFace(G.face||"joy")}
    Film.punch();
    root.querySelector("#obGuide").classList.add("off");
    if(trim().welcome&&T("ticket.welcome")){const w=root.querySelector("#obWelcome");w.classList.remove("on");void w.offsetWidth;w.classList.add("on")}
  }

  // ── 3D: 대화방의 3D 그림판을 잠깐 빌려 옴(모델을 다시 불러오지 않음) ──
  let borrowed=false;
  function stageIn(){
    if(typeof Stage==="undefined")return;
    const C=D().scene3d||{};
    const st=root.querySelector("#obStage"),card=root.querySelector("#obCard");
    st.classList.remove("fade");leaving=null;
    fov0=Stage.three().cam.fov;Stage.borrow(st,null,camTick);borrowed=true;
    const f=C.fog||{};Stage.fog(f.color||"#120e1f",f.near!=null?f.near:2.4,f.far!=null?f.far:6);
    if(typeof Look!=="undefined")Look.setPlace(null);
    Stage.setFace(C.face||"soft");
    const G=D().greet||{};if(Stage.xs)Stage.xs(G.motion||"m13");  // 34: 인사 모션 파일을 입장권이 보일 때 먼저 받아 둠(펀치 때 기다리면 몸짓과 카드 사라지기가 어긋남)
    Film.show();
  }
  // 3D 칸은 화면 아래 끝까지(서아 몸 전체가 그려짐, 아래쪽은 평소 카드가 가림). scene3d.frame 은
  // 「3D 칸이 카드 윗변 + overlapPx 까지만 있을 때」의 구도. 카메라는 그때 자리 그대로 두고 시야만 아래로 늘린다
  // (위쪽은 그때와 같은 그림, 아래로 이어서 더 그림 → 머리·상반신 크기·위치·안개가 예전과 같음).
  // 방법: 그때 화면을 위쪽에 둔 더 큰 가상 화면을 잡고(setViewOffset) 그 아래 부분까지 그린다. 매 프레임(그림판의 카메라 계산 뒤) 맞춤.
  // 카드가 사라질 때(leaving): 발끝(scene3d.leave.bottom)이 안 들어오면 머리 위치는 두고 카메라가 뒤로 물러남
  let fov0=30,leaving=null;
  function camTick(now,w,h){
    Film.tick(now);
    if(!borrowed||!w||!h)return;
    const cam=Stage.three().cam,a=document.querySelector(".app");
    if(a&&a.clientWidth>a.clientHeight){if(cam.view)cam.clearViewOffset();return}  // 가로 화면은 그림판 기본 카메라 그대로
    const C=D().scene3d||{},F=C.frame||{top:1.1,bottom:.5,width:.9,lift:.02},card=root.querySelector("#obCard");
    const h0=Math.max(1,Math.min(h,card.offsetTop+kbPx+(C.overlapPx!=null?C.overlapPx:48)));  // 69: 키보드로 카드가 올라가도 서아 구도는 그대로
    const H=Stage.height(),tn=Math.tan(fov0*Math.PI/360);
    const d0=Math.max((F.top-F.bottom)*H/2/tn,(F.width||0)*H/2/(tn*w/h0)),T=(F.top+F.bottom)/2*H+d0*tn;  // T: 화면 위끝 높이(서아 자리)
    let d=d0;
    if(leaving){const lb=(C.leave||{}).bottom,dl=lb!=null?Math.max(d0,(T-lb*H)*h0/(2*tn*h)):d0,k=Math.min(1,(now-leaving.t0)/leaving.ms),e=k*k*(3-2*k);d=d0+(dl-d0)*e}
    const cy=T-d*tn,fullH=2*h-h0;
    cam.fov=2*Math.atan(tn*fullH/h0)*180/Math.PI;cam.aspect=w/fullH;
    cam.setViewOffset(w,fullH,0,h-h0,w,h);  // 안에서 updateProjectionMatrix
    cam.position.set(0,cy+(F.lift||0)*H,d);cam.lookAt(0,cy,0);
  }
  function stageOut(){
    leaveT.forEach(clearTimeout);leaveT=[];
    if(!borrowed)return;borrowed=false;leaving=null;
    // 카메라 시야를 그림판 기본으로 되돌림(대화방 3D 무대는 원래 계산 그대로)
    const T3=Stage.three(),cam=T3.cam;cam.clearViewOffset();cam.fov=fov0;
    Film.hide();Stage.release();Stage.setFace("neutral");
    const cv=T3.R.domElement;if(cv.clientWidth&&cv.clientHeight)cam.aspect=cv.clientWidth/cv.clientHeight;cam.updateProjectionMatrix();
    if(typeof showScene==="function"&&typeof SCENES!=="undefined")showScene(S.scene||0);  // 테두리 빛을 대화 장소로 되돌림
  }
  // Google·카카오: 시연 버전이라 안내 토스트 뒤 게스트로
  let loginT=null;
  function demoLogin(){if(step!=="login"||loginT)return;
    if(typeof toast==="function")toast(E(T("login.demoToast")),2600);
    loginT=setTimeout(()=>{loginT=null;finish("guest")},tm("loginDemoDelayMs",1100))}
  function finish(how){
    if(step!=="login")return;step="done";mark("done");
    S.onboarded=true;S.onboardedAt=Date.now();S.loginAs=how||"guest";save();
    hide();setTab("home");
  }
  // 겹친 층 닫기(저장 없이도 씀: 시연 장면으로 바로 갈 때)
  function hide(){
    if(!root||!openFlag)return;openFlag=false;clearTimeout(loginT);loginT=null;going=false;stageOut();closeTerms();
    if(step!=="done")step=null;backOnly=false;onDone=null;root.classList.remove("backonly");
    const inp=root.querySelector("#obName");if(inp&&document.activeElement===inp)inp.blur();
    root.classList.add("out");setTimeout(()=>{if(!openFlag){root.classList.remove("on","out");root.querySelectorAll(".obscr").forEach(s=>s.classList.remove("on","show"))}},420);
  }
  // 69: 입장권 뒷면만 열기(이름이 없는 예전 유저 · 설정 「부르는 이름」 · 시연). 같은 무대·디자인, 이름을 정해야 닫힘. o.onDone(name)
  function openBack(o={}){
    if(openFlag)return false;build();openFlag=true;backOnly=true;onDone=o.onDone||null;step="back";
    root.classList.remove("out");root.classList.add("on","backonly");if(D().trim)scenery("obTicket");
    const wait=new Promise(r=>setTimeout(r,tm("preloadMaxWaitMs",15000)));
    Promise.all([typeof dataReady!=="undefined"?dataReady:null,Promise.race([typeof Stage!=="undefined"?Stage.ready:null,wait])]).then(()=>{
      if(!openFlag||!backOnly||step!=="back")return;fill();step="ticket";resetTicket();showScr("obTicket");stageIn()});
    return true}
  return{T,open,openBack,hide,fill,cleanName:v=>cleanName(v,true),isOpen:()=>openFlag,step:()=>step,times:()=>({...M})};
})();
