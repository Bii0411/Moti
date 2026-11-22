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
      <section class="obscr obtemp" id="obTicket"><p class="obguide" id="obGuide"></p><button class="obbtn" id="obNext" type="button"></button></section>
      <section class="obscr oblogin" id="obLogin"><div class="obhead"><h2 id="obLTitle"></h2><p class="obdesc" id="obLDesc"></p></div>
        <div class="obacts"><button class="obbtn g" id="obG" type="button"></button><button class="obbtn k" id="obK" type="button"></button>
        <button class="obtext" id="obGuest" type="button"></button><p class="obnote" id="obLNote"></p></div></section>`;
    document.querySelector(".app").appendChild(root);
    const q=id=>root.querySelector("#"+id);
    q("obGear").onclick=()=>{if(typeof Demo!=="undefined")Demo.toggle()};
    q("obGo").onclick=goTicket;
    q("obNext").onclick=()=>goLogin();
    q("obG").onclick=q("obK").onclick=demoLogin;
    q("obGuest").onclick=()=>finish("guest");
  }
  // 문구 채우기(데이터가 오면)
  function fill(){
    if(!root||filled||!D().first)return;filled=true;
    const q=id=>root.querySelector("#"+id);
    root.style.setProperty("--fade",tm("fadeInMs",600)+"ms");
    q("obLogo").textContent=T("first.logo");q("obTag").textContent=T("first.tagline");q("obGoT").textContent=T("first.button");
    q("obGuide").textContent=T("ticket.guide");q("obNext").textContent=T("ticket.tempNext");
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
  function showTicket(){step="ticket";mark("ticketShown");showScr("obTicket")}
  function goLogin(){step="login";mark("loginShown");showScr("obLogin")}
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
    if(!root||!openFlag)return;openFlag=false;clearTimeout(loginT);loginT=null;going=false;
    if(step!=="done")step=null;
    root.classList.add("out");setTimeout(()=>{if(!openFlag){root.classList.remove("on","out");root.querySelectorAll(".obscr").forEach(s=>s.classList.remove("on","show"))}},420);
  }
  return{T,open,hide,fill,isOpen:()=>openFlag,step:()=>step,times:()=>({...M})};
})();
