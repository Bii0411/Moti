// moti 온보딩(7단계): 첫 화면 → 입장권(약관) → 로그인 → 홈. 처음 실행일 때만(저장값 S.onboarded).
// 문구·설정은 data/onboarding.json(DATA.onboarding). 이 파일은 index.html 의 본 스크립트보다 먼저 불리지만,
// 본 스크립트의 것($·S·DATA·Stage·setTab 등)은 함수 안에서만 쓰므로 순서 문제는 없다.
// ── 입장권 뒤 마네킹들(7-B): 파일을 불러오지 않고 코드로 만든 그림자 같은 인형. 설정은 data/onboarding.json crowd ──
// 마네킹 하나 = 몸(머리·몸통·다리·머리카락·가만히 있는 팔을 한 덩어리로 합침) + 흔드는 팔 → 그리기 2번
const Crowd=(()=>{
  let group=null,list=[];
  const C=()=>((typeof DATA!=="undefined"&&DATA.onboarding)||{}).crowd||{};
  // 캡슐(r128 에는 CapsuleGeometry 가 없어 옆모습을 돌려 만듦). 가운데가 원점, 길이 len 은 두 반구 중심 사이
  function capsule(r,len,seg){const pts=[],n=5;
    for(let i=0;i<=n;i++){const a=-Math.PI/2+i/n*Math.PI/2;pts.push(new THREE.Vector2(Math.max(1e-4,r*Math.cos(a)),-len/2+r*Math.sin(a)))}
    for(let i=0;i<=n;i++){const a=i/n*Math.PI/2;pts.push(new THREE.Vector2(Math.max(1e-4,r*Math.cos(a)),len/2+r*Math.sin(a)))}
    return new THREE.LatheGeometry(pts,seg||10)}
  const sphere=r=>new THREE.SphereGeometry(r,12,9);
  const mat4=(x,y,z,rx,ry,rz,sx,sy,sz)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx||0,ry||0,rz||0)),new THREE.Vector3(sx||1,sy||sx||1,sz||sx||1));
  // 여러 도형을 하나로(위치·노멀·색). 색은 부분마다 달리(머리카락을 조금 밝게)
  function merge(parts){
    const P=[],N=[],K=[];
    for(const {g,m,c} of parts){const x=(g.index?g.toNonIndexed():g.clone());x.applyMatrix4(m);
      const pa=x.attributes.position.array,na=x.attributes.normal.array;P.push(pa);N.push(na);
      const col=new THREE.Color(c),ca=new Float32Array(pa.length);for(let i=0;i<pa.length;i+=3){ca[i]=col.r;ca[i+1]=col.g;ca[i+2]=col.b}K.push(ca);x.dispose();g.dispose()}
    const cat=A=>{const n=A.reduce((a,b)=>a+b.length,0),o=new Float32Array(n);let k=0;for(const a of A){o.set(a,k);k+=a.length}return o};
    const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.BufferAttribute(cat(P),3));geo.setAttribute("normal",new THREE.BufferAttribute(cat(N),3));geo.setAttribute("color",new THREE.BufferAttribute(cat(K),3));
    return geo}
  function hairParts(style,s,hc){
    const cap={g:sphere(.118*s),m:mat4(0,1.515*s,-.012*s,0,0,0,1.07,.96,1.06),c:hc};
    const H={
      short:[cap],
      long:[cap,{g:capsule(.118*s,.26*s),m:mat4(0,1.36*s,-.04*s,0,0,0,1.02,1,.55),c:hc}],
      pony:[cap,{g:sphere(.045*s),m:mat4(0,1.56*s,-.12*s),c:hc},{g:capsule(.038*s,.2*s),m:mat4(0,1.41*s,-.155*s,.28,0,0),c:hc}],
      bun:[cap,{g:sphere(.062*s),m:mat4(0,1.645*s,-.05*s),c:hc}],
      twin:[cap,{g:capsule(.04*s,.22*s),m:mat4(-.125*s,1.42*s,-.03*s,0,0,-.12),c:hc},{g:capsule(.04*s,.22*s),m:mat4(.125*s,1.42*s,-.03*s,0,0,.12),c:hc}]
    };return H[style]||H.short}
  function one(o,mat){
    const s=(o.height||1.6)/1.7,bc=C().color||"#2a2140",hc=C().hairColor||"#3b2e5c",side=o.x<0?-1:1;
    const armLen=.56*s,armR=.045*s,shX=.19*s,shY=1.33*s,rest=(C().wave||{}).restRad!=null?C().wave.restRad:.12;
    const parts=[
      {g:capsule(.062*s,.72*s),m:mat4(-.075*s,.47*s,0),c:bc},{g:capsule(.062*s,.72*s),m:mat4(.075*s,.47*s,0),c:bc},
      {g:sphere(.135*s),m:mat4(0,.9*s,0,0,0,0,1,.7,.72),c:bc},
      {g:capsule(.14*s,.32*s),m:mat4(0,1.13*s,0,0,0,0,1,1,.64),c:bc},
      {g:capsule(.045*s,.08*s),m:mat4(0,1.37*s,0),c:bc},
      {g:sphere(.11*s),m:mat4(0,1.5*s,0),c:bc},
      // 흔들지 않는 팔(반대쪽)
      {g:capsule(armR,armLen),m:new THREE.Matrix4().makeTranslation(-side*shX,shY,0).multiply(new THREE.Matrix4().makeRotationZ(-side*rest)).multiply(new THREE.Matrix4().makeTranslation(0,-armLen/2,0)),c:bc},
      ...hairParts(o.hair,s,hc)];
    const body=new THREE.Mesh(merge(parts),mat);
    const armG=capsule(armR,armLen);armG.translate(0,-armLen/2,0);
    const armGeo=merge([{g:armG,m:new THREE.Matrix4(),c:bc}]);
    const pivot=new THREE.Group();pivot.position.set(side*shX,shY,0);pivot.rotation.z=side*rest;
    pivot.add(new THREE.Mesh(armGeo,mat));
    const g=new THREE.Group();g.add(body,pivot);g.position.set(o.x||0,0,o.z||-1.6);g.rotation.y=o.turn!=null?o.turn:-(o.x||0)*.3;
    return{g,body,pivot,side,rest,ph:Math.random()*Math.PI*2,x:o.x||0,start:null};
  }
  function build(){
    if(group||typeof THREE==="undefined")return;
    const c=C();group=new THREE.Group();group.name="obCrowd";
    const mat=new THREE.MeshLambertMaterial({color:new THREE.Color(1,1,1).multiplyScalar(c.light!=null?c.light:.6),vertexColors:true,emissive:new THREE.Color(c.emissive||"#0c0916")});
    list=(c.people||[]).map(o=>one(o,mat));list.forEach(m=>group.add(m.g));
  }
  function prepare(){build();if(!group)return;const T3=Stage.three();T3.scene.add(group);try{T3.R.compile(T3.scene,T3.cam)}catch(e){}if(!shown)T3.scene.remove(group)}
  let shown=false;
  function show(){build();if(!group)return;shown=true;list.forEach(m=>m.start=null);Stage.three().scene.add(group)}
  function hide(){shown=false;if(group)Stage.three().scene.remove(group)}
  // 인사: |x| 가 큰(바깥쪽) 마네킹부터 stepMs 간격으로
  function wave(t0,G){const w=C().wave||{},step=w.stepMs!=null?w.stepMs:100;
    [...list].sort((a,b)=>Math.abs(b.x)-Math.abs(a.x)||a.x-b.x).forEach((m,i)=>m.start=t0+i*step)}
  const sm=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
  function tick(now){
    if(!shown)return;const w=C().wave||{},dur=w.ms||900,up=w.upRad!=null?w.upRad:2.3,amp=w.wiggleRad!=null?w.wiggleRad:.25,br=C().breath||{};
    for(const m of list){
      // 숨쉬기: 아주 작게(세로 크기·높이)
      const b=Math.sin(now/1000*2*Math.PI/(br.sec||3.8)+m.ph);
      m.body.scale.y=1+(br.scale!=null?br.scale:.006)*b;m.g.position.y=(br.bob!=null?br.bob:.003)*b;
      let a=m.rest;
      if(m.start!=null){const k=(now-m.start)/dur;
        if(k>=0&&k<=1){const lift=sm(k/.3)*(1-sm((k-.72)/.28));a=m.rest+(up-m.rest)*lift+amp*Math.sin(Math.max(0,k-.3)/.42*Math.PI*3)*(k>.3&&k<.72?1:0)}}
      m.pivot.rotation.z=m.side*a;
    }
  }
  return{prepare,show,hide,wave,tick,info:()=>({count:list.length})};
})();

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
    // 첫 화면이 뜨는 동안 마네킹도 미리 만들어 셰이더까지 준비
    if(typeof Stage!=="undefined")Promise.all([Stage.ready,typeof dataReady!=="undefined"?dataReady:null]).then(()=>Crowd.prepare());
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
  // 인사: 서아 손 흔들기(m13) + 마네킹들이 바깥쪽부터 차례로 한 손을 들어 흔듦 + 「어서 와요」
  function greet(){
    const G=D().greet||{};
    if(typeof Stage!=="undefined"){Stage.play(G.motion||"m13",{quiet:true});Stage.setFace(G.face||"joy")}
    Crowd.wave(performance.now()+(G.crowdDelayMs||0),G);
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
    Stage.borrow(st,C.frame||{top:1.1,bottom:.5,width:.9,lift:.02},Crowd.tick);borrowed=true;
    window.addEventListener("resize",fitNow);fitNow.f=fit;
    const f=C.fog||{};Stage.fog(f.color||"#120e1f",f.near!=null?f.near:2.4,f.far!=null?f.far:6);
    if(typeof Look!=="undefined")Look.setPlace(null);
    Stage.setFace(C.face||"soft");
    Crowd.show();
  }
  function fitNow(){if(fitNow.f)fitNow.f()}
  function stageOut(){
    leaveT.forEach(clearTimeout);leaveT=[];
    if(!borrowed)return;borrowed=false;window.removeEventListener("resize",fitNow);
    Crowd.hide();Stage.release();Stage.setFace("neutral");
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
