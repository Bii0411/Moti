// moti 온보딩(7단계): 첫 화면 → 입장권(약관) → 로그인 → 홈. 처음 실행일 때만(저장값 S.onboarded).
// 문구·설정은 data/onboarding.json(DATA.onboarding). 이 파일은 index.html 의 본 스크립트보다 먼저 불리지만,
// 본 스크립트의 것($·S·DATA·Stage·setTab 등)은 함수 안에서만 쓰므로 순서 문제는 없다.
const Onboard=(()=>{
  const D=()=>(typeof DATA!=="undefined"&&DATA.onboarding)||{};
  const T=k=>{const v=k.split(".").reduce((o,x)=>o!=null?o[x]:undefined,D());return typeof v==="string"?v:""};
  const tm=(k,d)=>{const t=D().timing||{};return t[k]!=null?t[k]:d};
  const E=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  // 원고의 <br> 만 줄바꿈으로 살리고 나머지는 글자 그대로
  const EB=s=>E(s).replace(/&lt;br\s*\/?&gt;/gi,"<br>");
  let root=null,step=null,openFlag=false,filled=false;
  const M={};  // 확인용 시간 기록(ms): firstShown·tap·ticketShown·loginShown·done
  const mark=k=>{M[k]=Math.round(performance.now())};

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
    return `<div class="obcity">${neon}${svg}<div class="obrain">${rain}</div></div>`;
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
          <p class="obai" id="obAi"></p>
          <label class="obchk all"><input type="checkbox" data-k="all"><span class="box"></span><span class="tx" id="obAll"></span></label>
          <div class="oblist" id="obList"></div></div>
          <div class="obpunch locked" id="obPunch" role="button" tabindex="0"><span class="obhole"><i></i></span><span class="obptx"><b id="obPunchT"></b><small id="obPunchS"></small></span></div>
        </div>
        <div class="obscrim" id="obScrim"></div>
        <div class="obsheet" id="obSheet" role="dialog" aria-modal="true"><h3 id="obSTitle"></h3><p id="obSBody"></p><button class="obbtn" id="obSClose" type="button"></button></div>
      </section>
      <section class="obscr oblogin" id="obLogin"><div class="obhead"><h2 id="obLTitle"></h2><p class="obdesc" id="obLDesc"></p></div>
        <div class="obacts"><button class="obbtn g" id="obG" type="button"></button><button class="obbtn k" id="obK" type="button"></button>
        <button class="obtext" id="obGuest" type="button"></button><p class="obnote" id="obLNote"></p></div></section>`;
    document.querySelector(".app").appendChild(root);
    const q=id=>root.querySelector("#"+id);
    q("obGear").onclick=()=>{if(typeof Demo!=="undefined")Demo.toggle()};
    q("obGo").onclick=goTicket;
    q("obCard").addEventListener("change",onCheck);
    q("obCard").addEventListener("click",e=>{const v=e.target.closest("[data-view]");if(v){e.preventDefault();openTerms(v.dataset.view)}});
    q("obPunch").onclick=punch;q("obPunch").onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();punch()}};
    q("obScrim").onclick=q("obSClose").onclick=closeTerms;
    q("obG").onclick=q("obK").onclick=demoLogin;
    q("obGuest").onclick=()=>finish("guest");
  }
  // 문구 채우기(데이터가 오면)
  function fill(){
    if(!root||filled||!D().first)return;filled=true;
    const q=id=>root.querySelector("#"+id);
    root.style.setProperty("--fade",tm("fadeInMs",600)+"ms");
    q("obLogo").textContent=T("first.logo");q("obTag").textContent=T("first.tagline");q("obGoT").textContent=T("first.button");
    q("obGuide").textContent=T("ticket.guide");q("obWelcome").textContent=T("ticket.welcome");
    q("obCTitle").textContent=T("ticket.title");q("obCSmall").textContent=T("ticket.small");q("obAi").textContent=T("ticket.ai");q("obAll").textContent=T("ticket.all");
    q("obList").innerHTML=(D().ticket.items||[]).map(it=>`<div class="obrow"><label class="obchk"><input type="checkbox" data-k="${E(it.id)}"${it.required?" data-req":""}><span class="box"></span><span class="tx">${E(it.text)}</span></label>${it.view?`<button type="button" class="obview" data-view="${E(it.view)}">${E(T("ticket.view"))}</button>`:""}</div>`).join("");
    q("obPunchS").textContent=T("ticket.punchSub");q("obSClose").textContent=T("terms.close");
    punchText();
    q("obLTitle").innerHTML=EB(T("login.title"));q("obLDesc").textContent=T("login.desc");
    q("obG").textContent=T("login.google");q("obK").textContent=T("login.kakao");q("obGuest").textContent=T("login.guest");q("obLNote").textContent=T("login.note");
    if(step==="first")showScr("obFirst");  // 데이터가 늦게 오면 그때 로고·소개가 나타남
  }
  function showScr(id){
    root.querySelectorAll(".obscr").forEach(s=>{if(s.id!==id)s.classList.remove("on","show")});
    const s=root.querySelector("#"+id);if(!filled)return;
    s.classList.remove("show");s.classList.add("on");void s.offsetWidth;s.classList.add("show");
  }

  // ── 흐름 ──
  function open(){
    build();openFlag=true;step="first";root.classList.remove("out");root.classList.add("on");
    for(const k in M)delete M[k];mark("firstShown");
    root.querySelector("#obGo").classList.remove("loading");
    if(typeof dataReady!=="undefined")dataReady.then(fill);fill();
    stageOut();
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
  function punchText(){if(!root||!filled)return;const ok=reqOk(),p=root.querySelector("#obPunch");
    p.classList.toggle("locked",!ok);p.setAttribute("aria-disabled",ok?"false":"true");
    root.querySelector("#obPunchT").textContent=T(ok?"ticket.punchReady":"ticket.punchLocked")}
  function resetTicket(){root.querySelectorAll("#obCard input").forEach(b=>b.checked=false);
    const c=root.querySelector("#obCard"),p=root.querySelector("#obPunch");c.classList.remove("leave");p.classList.remove("punched","shake");
    root.querySelector("#obWelcome").classList.remove("on");root.querySelector("#obGuide").classList.remove("off");punched=false;punchText();closeTerms()}
  function openTerms(k){const t=(D().terms||{})[k]||{};root.querySelector("#obSTitle").textContent=t.title||"";root.querySelector("#obSBody").textContent=t.body||"";
    root.querySelector("#obScrim").classList.add("on");root.querySelector("#obSheet").classList.add("on")}
  function closeTerms(){if(!root)return;root.querySelector("#obScrim").classList.remove("on");root.querySelector("#obSheet").classList.remove("on")}
  let punched=false,leaveT=[];
  function punch(){
    if(step!=="ticket"||punched)return;
    const p=root.querySelector("#obPunch");
    if(!reqOk()){p.classList.remove("shake");void p.offsetWidth;p.classList.add("shake");return}  // 필수 동의 전: 살짝 흔들리기만
    punched=true;mark("punch");
    const val={};boxes().forEach(b=>val[b.dataset.k]=b.checked);
    S.consent={...val,at:Date.now()};save();  // 선택 동의(이벤트·소식)도 저장만
    p.classList.add("punched");
    greet();
    const G=D().greet||{};
    leaveT.push(setTimeout(()=>{if(step==="ticket")root.querySelector("#obCard").classList.add("leave")},G.leaveMs!=null?G.leaveMs:1700));
    leaveT.push(setTimeout(()=>{if(step==="ticket")goLogin()},(G.leaveMs!=null?G.leaveMs:1700)+(G.leaveFadeMs!=null?G.leaveFadeMs:450)));
  }
  // 인사: 서아 손 흔들기(m13) + 「어서 와요」
  function greet(){
    const G=D().greet||{};
    if(typeof Stage!=="undefined"){Stage.play(G.motion||"m13",{quiet:true});Stage.setFace(G.face||"joy")}
    root.querySelector("#obGuide").classList.add("off");
    const w=root.querySelector("#obWelcome");w.classList.remove("on");void w.offsetWidth;w.classList.add("on");
  }

  // ── 3D: 대화방의 3D 그림판을 잠깐 빌려 옴(모델을 다시 불러오지 않음) ──
  let borrowed=false;
  function stageIn(){
    if(typeof Stage==="undefined")return;
    const C=D().scene3d||{};
    const st=root.querySelector("#obStage"),card=root.querySelector("#obCard");
    const fit=()=>{st.style.height=Math.round(card.offsetTop+(C.overlapPx!=null?C.overlapPx:48))+"px"};fit();
    Stage.borrow(st,C.frame||{top:1.1,bottom:.5,width:.9,lift:.02});borrowed=true;
    window.addEventListener("resize",fitNow);fitNow.f=fit;
    const f=C.fog||{};Stage.fog(f.color||"#120e1f",f.near!=null?f.near:2.4,f.far!=null?f.far:6);
    if(typeof Look!=="undefined")Look.setPlace(null);
    Stage.setFace(C.face||"soft");
  }
  function fitNow(){if(fitNow.f)fitNow.f()}
  function stageOut(){
    leaveT.forEach(clearTimeout);leaveT=[];
    if(!borrowed)return;borrowed=false;window.removeEventListener("resize",fitNow);
    Stage.release();Stage.setFace("neutral");
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
    if(step!=="done")step=null;
    root.classList.add("out");setTimeout(()=>{if(!openFlag){root.classList.remove("on","out");root.querySelectorAll(".obscr").forEach(s=>s.classList.remove("on","show"))}},420);
  }
  return{T,open,hide,fill,isOpen:()=>openFlag,step:()=>step,times:()=>({...M})};
})();
