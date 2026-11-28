// moti 출석 보상(110). 하루 첫 접속 때 홈에서 출석 창(아래에서 올라오는 시트 #attSheet), 마이 「출석」 카드, 시연 패널(?debug=1) 「다음 날로」「초기화」
// 보상표·숫자 data/attendance.json, 문구 data/ui.json attend. 누적 방식: 하루 빠져도 이어서 받음. 11일째부터 repeatFrom(2)~10일 칸을 다시 돈다
// 저장값: S.att = {n 받은 누적 일수, last 마지막으로 받은 날(한국 날짜 YYYY-MM-DD), seen 창이 저절로 뜬 날, off 시연용 날짜 밀기(일)}
//         S.tix = {pack 히든 카드 1회권, ep 특별 에피소드 이용권}
// pack.js 다음, index.html 본 스크립트보다 먼저 불린다. S·DATA·UI 등은 함수 안에서만 쓴다.

const Attend=(()=>{
  const A=()=>DATA.attend&&Array.isArray(DATA.attend.days)?DATA.attend:{days:[],repeatFrom:2,fallback:{}};
  const T=(k,v)=>UI("attend."+k,v);
  const st=()=>{if(!S.att||typeof S.att!=="object")S.att={n:0,last:null,seen:null,off:0};return S.att};
  const tix=()=>{if(!S.tix||typeof S.tix!=="object")S.tix={pack:0,ep:0};S.tix.pack=+S.tix.pack||0;S.tix.ep=+S.tix.ep||0;return S.tix};
  // 오늘(한국 시간 자정 기준, 기기 시계). off = 시연 패널 「다음 날로」 누른 수
  const today=()=>{const h=A().tzHours!=null?+A().tzHours:9;return new Date(Date.now()+h*3600e3+(+st().off||0)*864e5).toISOString().slice(0,10)};
  const L=()=>A().days.length||10;
  const done=()=>st().last===today();
  // 누적 d 일째 → 그 바퀴의 칸(1~10). 11일째 = 2일 칸
  const slotOf=d=>{const n=L(),r=Math.min(n,Math.max(1,+A().repeatFrom||2));return d<=n?d:((d-n-1)%(n-r+1))+r};
  // 화면의 「누적 ○일째」 = 오늘 받을(받은) 날
  const cur=()=>done()?st().n:st().n+1;
  const dayOf=d=>A().days[slotOf(d)-1]||{type:"dia",n:0};
  // 아직 안 가진 히든 카드 시크릿(special, source pack, 보류 제외)
  const secretPool=()=>(typeof Gacha!=="undefined"&&typeof COL!=="undefined")?Gacha.pool(COL.items).filter(x=>x.grade==="special"&&!S.col[x.id]):[];
  // 대신 줄 것(data fallback): 열 수 있는 특별 에피소드가 남지 않았거나 시크릿을 다 가졌을 때
  function resolve(r){if(!r)return r;const fb=(A().fallback||{})[r.type];if(!fb)return r;
    if(r.type==="epTicket"){const left=STORIES.filter(s=>s.price&&!S.stories[s.id]).length;if(left<=tix().ep)return{...fb,fb:r.type}}
    if(r.type==="secret"&&!secretPool().length)return{...fb,fb:r.type};
    return r}
  const cellName=r=>T("reward."+r.type+".cell",{n:r.n});
  const gotName=r=>T("reward."+r.type+".got",{n:r.n});
  const ICON={packTicket:"cards",epTicket:"ticket",secret:"sparkle"};
  const icon=(r,sz)=>r.type==="dia"?Icon.gem(sz):Icon.svg(ICON[r.type]||"gift",sz);

  // ── 받기 ── 돌려줌 {d 누적 일수, r 받은 보상(대신 준 것이면 fb), card 시크릿으로 받은 카드}
  function claim(){if(done())return null;
    const d=st().n+1,r=resolve(dayOf(d)),t=tix();let card=null;
    if(r.type==="dia")S.dia+=+r.n||0;
    else if(r.type==="packTicket")t.pack+=+r.n||1;
    else if(r.type==="epTicket")t.ep+=+r.n||1;
    else if(r.type==="secret"){const P=secretPool();card=P[Math.floor(Math.random()*P.length)];
      if(card&&typeof Pack!=="undefined"&&Pack.grant)Pack.grant(card)}  // 카드는 받는 순간 S.col 에 기록(연출 전에 앱이 닫혀도 남게)
    Object.assign(st(),{n:d,last:today(),seen:today()});
    save();renderTop();
    return{d,r,card}}

  // ── 출석 창 ──
  const el=()=>document.getElementById("attSheet");
  const isOn=()=>!!(el()&&el().classList.contains("on"));
  let busy=false,closeT=null,showT=null;
  // 칸 상태: 그 바퀴에서 오늘 칸보다 앞 = 받음, 오늘 칸 = 오늘(받았으면 체크)
  function cells(){const c=cur(),ts=slotOf(c),dn=done();
    return A().days.map((r0,i)=>{const s=i+1,got=s<ts||(s===ts&&dn),r=got?r0:resolve(r0);
      return{s,r,got,today:s===ts,last:s===L()}})}
  function html(){const dn=done();
    const cs=cells().map(x=>`<div class="atc${x.got?" got":""}${x.today?" today":""}${x.last?" last":""}"><span class="atd">${esc(x.today?T("today"):T("day",{n:x.s}))}</span><span class="ati ${x.r.type}">${icon(x.r,22)}</span><span class="atn">${esc(cellName(x.r))}</span>${x.got?`<i class="atk" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></i>`:""}</div>`).join("");
    return `<div class="atgrab" aria-hidden="true"></div>
      <div class="athd"><h2>${esc(T("title"))}</h2><b>${esc(T("total",{n:cur()}))}</b></div>
      <p class="sub">${esc(T("sub"))}</p>
      <div class="atgrid">${cs}</div>
      <button class="atgo" id="attGo"${dn?" disabled":""}>${esc(dn?T("claimed"):T("claim"))}</button>`}
  function draw(){const e=el();if(!e)return;e.innerHTML=html();const b=e.querySelector("#attGo");if(b)b.onclick=onClaim}
  function open(auto){const e=el();if(!e||busy)return;
    if(auto){st().seen=today();save()}
    if(!isOn())closeSheets();draw();openSheet("#attSheet")}
  function onClaim(){if(busy||done())return;busy=true;
    const res=claim();draw();
    const r=res.r;toast(esc(T("got",{name:gotName(r)}))+(r.fb?`<br><small>${esc(T("fallback."+r.fb))}</small>`:""),2200);
    if(typeof curTab!=="undefined"&&curTab==="my")renderMy();
    clearTimeout(closeT);closeT=setTimeout(()=>{busy=false;if(isOn())closeSheets();
      if(res.card&&typeof Pack!=="undefined"&&Pack.showSecret)Pack.showSecret(res.card)},A().closeMs||1000)}  // 10일째: 닫는 대신 시크릿 카드 뽑기 연출
  // 아래로 내리면 닫힘(받지 않음). 창 맨 위에서 아래로 60px 넘게
  function bindSwipe(){const e=el();if(!e||e.dataset.sw)return;e.dataset.sw="1";let y0=null;
    e.addEventListener("touchstart",ev=>{y0=e.scrollTop<=0?ev.touches[0].clientY:null},{passive:true});
    e.addEventListener("touchend",ev=>{if(y0==null)return;const dy=ev.changedTouches[0].clientY-y0;y0=null;if(dy>60&&!busy)closeSheets()},{passive:true})}

  // 하루 첫 접속: 홈에 왔을 때 한 번(온보딩·로그인·첫 만남·대화방·다른 창이 열려 있으면 안 띄우고, 다음에 홈에 올 때)
  function can(){return typeof curTab!=="undefined"&&curTab==="home"&&A().days.length&&(S.onboarded||(typeof SKIP_INTRO!=="undefined"&&SKIP_INTRO))&&
    !done()&&st().seen!==today()&&!(typeof Onboard!=="undefined"&&Onboard.isOpen())&&!(typeof FirstMeet!=="undefined"&&FirstMeet.isOn())&&
    !document.querySelector(".sheet.on")&&!Mini.isOpen()&&!(typeof Pack!=="undefined"&&Pack.isOpen())&&!(typeof Cards!=="undefined"&&Cards.isOpen&&Cards.isOpen())}
  function maybeShow(){clearTimeout(showT);showT=setTimeout(()=>{if(can())open(true)},A().showDelayMs!=null?+A().showDelayMs:450)}

  // ── 마이 출석 카드 ──
  function myHTML(){if(!A().days.length)return "";const dn=done(),cs=cells(),t=tix(),nd=st().n+1,nr=resolve(dayOf(nd));
    return `<div class="card atmy" id="attCard" role="button" tabindex="0" aria-label="${esc(T("aria"))}">
      <div class="atmh"><b>${esc(T("myTitle",{n:cur()}))}</b>${dn?`<span class="atok">${esc(T("myDone"))}</span>`:`<span class="atmb">${esc(T("myClaim"))}</span>`}</div>
      <div class="atbar">${cs.map(x=>`<i${x.got?' class="on"':""}></i>`).join("")}</div>
      <div class="atmn"><span>${esc(T("myNext",{d:nd,name:gotName(nr)}))}</span><span>${esc(T("myGoal"))}</span></div>
      ${t.pack||t.ep?`<p class="atown">${esc(T("myOwn",{p:t.pack,e:t.ep}))}</p>`:""}
    </div>`}
  function bindMy(root){const c=root.querySelector("#attCard");if(!c)return;c.onclick=()=>open(false);c.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open(false)}}}

  // ── 시연 패널(?debug=1) ──
  function debugNext(){st().off=(+st().off||0)+1;save()}
  function debugReset(){S.att={n:0,last:null,seen:null,off:0};save()}
  const info=()=>({n:st().n,last:st().last||"-",today:today()});

  function init(){bindSwipe();
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")maybeShow()})}  // 앱을 켜 둔 채 날이 바뀌어도 홈으로 돌아오면
  return{init,open,maybeShow,claim,myHTML,bindMy,tix,today,cur,slotOf,done,isOn,debugNext,debugReset,info,secretPool,
    state:()=>({...st(),tix:{...tix()},today:today(),done:done(),cur:cur(),slot:slotOf(cur())})};
})();
