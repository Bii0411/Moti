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
  // 칸 id → 그릴 몸짓·표정·속도. 카드 팩 칸(g01…, 49 전에는 선물)은 임시 재생 설정 play, 대화 칸은 그 몸짓 그대로
  function motionOf(id){const it=colBy(id)||{},p=it.play||{},F=C().faceById||{};
    if(it.source==="gift"||it.source==="pack"||p.m)return{m:p.m,f:p.f||"soft",sp:p.speed>0?p.speed:1};  // 42: 몸짓 칸이 아닌 연출 카드(e01 크리스마스 이브)도 play
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
  const busyNow=()=>!!(Stage.recentMotion(inRoom()?(C().quietMs!=null?C().quietMs:1200):0)||(typeof unlockBusy!=="undefined"&&(unlockBusy||unlockQ.length))||(typeof Cam!=="undefined"&&Cam.isOpen())||(typeof SeoaPhoto!=="undefined"&&SeoaPhoto.isSending())||viewOn()||(typeof busy!=="undefined"&&busy&&inRoom())||(typeof Together!=="undefined"&&Together.isOn()));  // 84: 함께하기 중엔 카드 그림을 만들지 않고 기다림
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
  // 43: 몸짓의 진짜 모션 버전(data/motions.json xstage 의 motionVer, 없으면 1). 카드 그림을 만들 때 기록(S.col[id].mv)에 남기고,
  //   버전이 바뀐 몸짓의 카드는 그림만 지우고 다시 만든다(의상·장소·날짜·대사는 기록 그대로)
  //   53: XSTAGE 가 아닌 몸짓(motion.js 코드 몸짓)은 data/motions.json motions 의 motionVer(기본 손이 바뀌면 올림)
  const verOf=m=>(typeof XS!=="undefined"&&XS[m]?XS[m].ver:+(((DATA.motions||{}).motions||{})[m]||{}).motionVer)||1;
  async function make(id){const a=S.col[id];if(!a||has(a.char,id))return;
    await init();if(has(a.char,id))return;
    const mo=motionOf(id);if(!mo.m||!canPlay(mo.m))return;
    const t0=performance.now();
    const r=await SeoaPhoto.make({card:true,mid:mo.m,face:mo.f,K:frameOf(mo.m),scene:a.scene!=null&&SCENES[a.scene]?a.scene:(C().defaultScene||0),outfit:a.outfit||C().defaultOutfit||"ops",image:C().image||{aspect:[2,3],longPx:720,quality:.8,maxKB:80},at:(C().momentById||{})[id]});
    if(!S.col[id])return;  // 그사이 초기화
    await put(a.char,id,r.full,{outfit:a.outfit,scene:a.scene,mid:mo.m,mv:verOf(mo.m),w:r.w,h:r.h});
    if(S.col[id]){S.col[id].mv=verOf(mo.m);save()}
    perf.push({id,t:Math.round(t0),outfit:a.outfit,scene:a.scene,...r.ms,kb:Math.round(r.full.size/1024),total:Math.round(performance.now()-t0)});
  }
  // 그림 없는 카드 채우기(컬렉션을 열 때): 예전 저장값은 기본 의상·기록된 장소(없으면 바 1층)를 기록에도 적어 둠
  async function fill(){await init();let n=0;
    for(const id in S.col){const a=S.col[id];if(!a||!colBy(id))continue;
      if(!a.outfit){a.outfit=C().defaultOutfit||"ops";if(a.scene==null||!SCENES[a.scene])a.scene=C().defaultScene||0;if(!a.char)a.char="seoa";a.old=1;n++}
      // 27: 장소와 의상이 안 맞게 저장된 카드(크리스마스 거리에 작전복 등)는 맞는 의상으로 고치고 그림을 다시 만듦
      if(typeof outfitForScene==="function"){const fit=outfitForScene(a.scene,a.outfit);if(fit!==a.outfit){a.outfit=fit;n++;if(has(a.char,id))await remove(a.char,[id])}}
      if(stale(id)){await remove(a.char,[id]);n++}
      if(!has(a.char,id))capture(id,{delay:0})}
    if(n)save();return n}
  // 43: 그림이 있는데 그 몸짓의 모션 버전이 기록과 다른 카드(예전 그림은 mv 없음 = 1)
  function stale(id){const a=S.col[id];if(!a||!has(a.char,id))return false;const mo=motionOf(id);return !!(mo.m&&canPlay(mo.m)&&(a.mv||1)!==verOf(mo.m))}
  // 43: 앱을 열 때 한 번 — 모션 버전이 바뀐 카드만 그림을 지우고 다시 만들기 예약(다른 카드는 그대로). 만드는 때는 26-2 나눠 만들기 그대로
  async function refresh(){await init();const ids=Object.keys(S.col||{}).filter(id=>colBy(id)&&stale(id));
    for(const id of ids){const a=S.col[id];await remove(a.char,[id]);capture(id)}
    return ids}

  // ── 카드 모양(38 포토카드): 3열, 가로2:세로3. 사진 둘레 테두리(등급마다: 일반 크림 무광·레어 홀로그램·시크릿 금박) + 둥근 사진 + 아래 띠 ──
  // 모은 카드 = 사진 + 왼쪽 위 영문 등급 표(DAILY·RARE·SECRET) + 아래 띠(이름 / 관계 단계 · 처음 본 장소 · MM.DD / 오른쪽 카드 번호)
  //   레어 = 사진 위 옅은 빛 한 줄, 시크릿 = 사진 전체 옅은 오로라 + 작은 반짝이. 테두리 위로 반짝임이 천천히 지나감(CSS 만, 「동작 줄이기」면 멈춤)
  // 아직 모으지 않은 칸(열렸지만 못 본 칸·잠긴 칸 모두) = 포토카드 뒷면: 가운데 캐릭터 영문 이름 그림 + 오른쪽 아래 작은 번호. 눌러도 아무것도 안 뜸
  // 크기는 모두 카드 너비에 대한 비율(collection.json card.photocard, CSS 컨테이너 너비 단위 cqw) → 목록·크게 보기·공유 그림이 같은 모양
  const T=(k,v)=>UI("album.card."+k,v);
  const SIL='<svg class="mcsil" viewBox="0 0 60 90" aria-hidden="true"><circle cx="30" cy="31" r="11.5"/><path d="M6 92c0-22 9.5-38 24-38s24 16 24 38z"/></svg>';
  const GR=["common","rare","special"];
  const G=g=>((((typeof COL!=="undefined"&&COL.grades)||{})[g])||{}).card||{};
  const PC=()=>C().photocard||{};
  const gradCss=(cs,ang)=>!cs||!cs.length?"transparent":cs.length===1?cs[0]:`linear-gradient(${ang!=null?ang:125}deg,${cs.join(",")})`;
  function vars(){const P=PC(),B=C().back||{},v=[],n=(k,x)=>v.push(`--${k}:${x}`),d=(x,y)=>x!=null?x:y;
    n("pcB",d(P.border,.0625));n("pcR",d(P.radius,.07));n("pcr",d(P.photoRadius,.045));n("pcBand",d(P.band,.25));
    n("pcNm",d(P.name,.085));n("pcNmMin",d(P.nameMinPx,10)+"px");n("pcSm",d(P.small,.055));n("pcSmMin",d(P.smallMinPx,7)+"px");
    n("pcNo",d(P.no,.1));n("pcNoMin",d(P.noMinPx,11)+"px");n("pcTag",d(P.tag,.05));n("pcTagMin",d(P.tagMinPx,6.5)+"px");n("pcTrack",d(P.tagTrack,.18)+"em");n("pcY",d(P.photoY,.3)*100+"%");
    n("bkBg",d(B.bg,"#16131f"));n("bkLine",d(B.line,"rgba(255,255,255,.07)"));n("bkName",d(B.name,"#a99fcc"));n("bkW",d(B.nameWidth,.6)*100+"%");n("bkNo",d(B.no,"#6c6585"));
    GR.forEach(g=>{const c=G(g),au=c.aurora||[];
      n("fr-"+g,gradCss(c.frame||["#f4f1ea"],c.frameAngle));n("ink-"+g,c.ink||"#4b4560");n("sub-"+g,c.sub||c.ink||"#8a8398");n("tbg-"+g,c.tagBg||"#fff");n("tink-"+g,c.tagInk||c.ink||"#4b4560");
      n("lt-"+g,c.light||"transparent");n("sh-"+g,c.sheen||"transparent");n("sp-"+g,c.sparkle||"#fff");n("mv-"+g,(c.moveS||8)+"s");
      n("au-"+g,au.length?`linear-gradient(115deg,${[...au,au[0]].join(",")})`:"none")});
    return v.join(";")}
  // 등급마다 사진 위 효과: 레어 빛 한 줄, 시크릿 오로라 + 반짝이(개수 grades.special.card.sparkles)
  function fx(g){const c=G(g);let h="";if(c.light)h+='<i class="pclt"></i>';if(c.aurora&&c.aurora.length)h+='<i class="pcau"></i>';
    for(let i=0;i<Math.min(3,c.sparkles||0);i++)h+=`<i class="pcsp s${i+1}"></i>`;return h?`<span class="pcfx" aria-hidden="true">${h}</span>`:""}
  const no2=x=>String((x&&x.no)||0).padStart(2,"0");
  const tagOf=g=>T("tag."+g);
  const P2=n=>String(n).padStart(2,"0");
  // 아래 띠 작은 줄: 관계 단계 이름 · 처음 본 장소(짧은 이름) · 처음 본 날짜 MM.DD (기록이 없는 것은 뺌)
  function bandLine(a){const d=new Date(a.at),sc=SCENES[a.scene];
    return [a.stage?stageName(a.stage):"",sc?(sc.short||sc.name):"",a.at?T("mmdd",{m:P2(d.getMonth()+1),d:P2(d.getDate())}):""].filter(Boolean).join(T("band"))}
  const band=(x,a)=>`<span class="pcbd"><span class="pctx"><b class="pcnm">${esc(x.name)}</b><small class="pcsub">${esc(bandLine(a))}</small></span><i class="pcno">${no2(x)}</i></span>`;
  const curChar=()=>typeof colChar!=="undefined"?colChar:"seoa";
  function backName(ch){const c=typeof chBy==="function"&&chBy(ch);if(!c||!c.nameEn)return "";
    return `<span class="pcname" style="--nm:url(assets/name_${esc(ch)}.svg)"><span class="sr">${esc(c.nameEn)}</span></span>`}
  function cell(x){const a=S.col[x.id];
    if(a){const u=urlNow(a.char,x.id);
      return `<button class="mc got" data-f="${x.id}" aria-label="${esc(T("open",{name:x.name}))}"><span class="pc g-${x.grade}"><span class="pcph">${u?`<img class="mcimg" src="${u}" alt="">`:`${SIL}<img class="mcimg" alt="" hidden>`}${fx(x.grade)}</span><span class="pctag">${esc(tagOf(x.grade))}</span>${x.pose?`<span class="pcpose">${esc(T("pose"))}</span>`:""}${band(x,a)}</span></button>`}  // 78: 포즈 카드 표시
    // 38: 열렸지만 못 본 칸·잠긴 칸 모두 같은 뒷면. 누를 수 없는 칸(힌트 없음)
    return `<div class="mc back" role="img" aria-label="${esc(T("backAria",{no:no2(x)}))}"><span class="pc">${backName(curChar())}<i class="pcno">${no2(x)}</i></span></div>`}
  const grid=L=>`<div class="mcards" style="${vars()}">${L.map(cell).join("")}</div>`;
  // 49 카드 팩: 뒷면 한 장(번호 없이 「Seoa」 이름만 — 팩 그림·뽑기 연출의 뒷면)
  const backCell=(ch,no)=>`<div class="mc back" aria-hidden="true"><span class="pc">${backName(ch||"seoa")}${no?`<i class="pcno">${no}</i>`:""}</span></div>`;
  // 그림이 아직 주소로 안 꺼내진 카드: 꺼내는 대로 넣음
  // 52: 아래 띠 이름이 넘치면 잘지 않고 글자만 줄임(이름은 그대로). 가장 작은 글자 data/collection.json card.photocard.nameFitMinPx
  // 50-2: min = 이 칸에서 가장 작은 글자(px). 그래도 넘치면 끝을 「…」(.pcnm text-overflow). 50-3: 카드 팩 10장 결과는 이 함수를 안 쓰고 9px 두 줄(pack.css)
  function fitName(e,min){if(!e)return;e.style.fontSize="";const cw=e.clientWidth,sw=e.scrollWidth;if(!cw||sw<=cw+.5)return;
    const fs=parseFloat(getComputedStyle(e).fontSize)||10;min=min||((C().photocard||{}).nameFitMinPx)||6;e.style.fontSize=Math.max(min,Math.floor(fs*cw/sw*96)/100)+"px"}  // 0.96 = 글자 폭 반올림으로 1px 넘치는 것 막기
  const fitNames=(root,min)=>root&&root.querySelectorAll(".pcnm").forEach(e=>fitName(e,min));
  function hydrate(root){fitNames(root);root.querySelectorAll(".mc.got").forEach(b=>{const im=b.querySelector(".mcimg");if(!im||!im.hidden)return;const id=b.dataset.f,a=S.col[id];if(!a)return;
    url(a.char,id).then(u=>{if(!u||!im.isConnected)return;im.src=u;im.hidden=false;const sv=b.querySelector(".mcsil");if(sv)sv.remove()})})}
  subs.push(k=>{const r=document.getElementById("album");if(!r||!k)return;const id=k.slice(k.indexOf(":")+1),b=r.querySelector(`.mc.got[data-f="${id}"]`);if(!b)return;
    const im=b.querySelector(".mcimg"),a=S.col[id];if(im&&!im.hidden&&a){url(a.char,id).then(u=>{if(u&&im.isConnected)im.src=u});return}  // 43: 다시 만든 그림은 보이는 칸에 바로 바꿔 넣음
    hydrate(b.parentNode)});

  // ── 카드 확대(26-1B) ──
  // 카드가 가운데로 커지고(transform 만) 카드 안에서 3D 서아가 그 몸짓을 그때 의상·장소로 반복. 대화방 3D 그림판을 빌려 씀(Stage.borrow, 모델을 두 번 불러오지 않음)
  // 그 의상 모델을 아직 안 불러왔으면 카드 그림 + 짧은 불러오기 표시. 아래: 이름·처음 봤을 때 대사·「단계 · 날짜」, 이전/공유/다음. 바깥 누르기·아래로 밀기 = 닫기
  let vEl=null,vIds=[],vi=0,vTok=0,vOn=false,K=null,shareF=null,box=null,ptr=null;
  const V=()=>C().view||{};
  const $v=s=>vEl.querySelector(s);
  function build(){if(vEl)return;vEl=document.createElement("div");vEl.className="cv";vEl.id="cardView";vEl.setAttribute("role","dialog");vEl.setAttribute("aria-modal","true");vEl.setAttribute("aria-hidden","true");
    vEl.innerHTML=`<div class="cvbg"></div><button class="cvx" data-cv="close" aria-label="${esc(T("close"))}">${Icon.svg("close",22)}</button>
      <div class="cvcard"><div class="cvframe"><div class="pc"><div class="pcph cvin"><div class="cvplace"></div><div class="cvdim"></div><div class="cvgl"></div>${SIL}<img class="cvimg" alt=""><span class="cvfx"></span><span class="cvload"></span></div><span class="pctag"></span><span class="pcbd"><span class="pctx"><b class="pcnm"></b><small class="pcsub"></small></span><i class="pcno"></i></span></div></div></div>
      <div class="cvinfo"><p class="cvln"></p></div>
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
  function open(id,ids){if(typeof Together!=="undefined")Together.close();  // 84: 렌더러를 둘이 같이 쓰지 않게
    build();vIds=ids&&ids.length?ids.slice():[id];vi=vIds.indexOf(id);if(vi<0){vIds.unshift(id);vi=0}
    layout();const c=$v(".cvcard"),ms=V().zoomMs||300,tf=fromTf(cellOf(id));
    vOn=true;vEl.setAttribute("aria-hidden","false");document.querySelector(".app").classList.add("cvon");  // 38: 뒤 목록 카드 빛은 멈춤
    c.style.transition="none";c.style.transformOrigin="0 0";c.style.transform=tf||"translateY(24px) scale(.92)";vEl.classList.add("on");void c.offsetWidth;
    c.style.transition=`transform ${ms}ms cubic-bezier(.2,.8,.2,1),opacity 0s`;c.style.transform="";
    // 3D 뒤 장소 그림 어둡게: 대화 무대(#bgdim)와 같은 층
    const d=document.getElementById("bgdim"),cd=$v(".cvdim");if(d){cd.className=d.className+" cvdim";cd.removeAttribute("id");cd.style.cssText=d.style.cssText}
    Stage.lock(true);Stage.shadow(true,(((DATA.config||{}).camera||{}).photo||{}).shadow||{});Stage.borrow($v(".cvgl"),null,tick);
    show()}
  function tick(now,w,h){if(!vOn||!K||!w||!h)return;const cam=Stage.three().cam;if(cam.view)cam.clearViewOffset();
    const H=Stage.height(),tn=Math.tan(cam.fov*Math.PI/360),cy=(K.top+K.bottom)/2*H,d=Math.max((K.top-K.bottom)*H/2/tn,K.width*H/2/(tn*(w/h))),o=Stage.center(K.center||0);
    cam.position.set(o.x,cy+(K.lift||0)*H,o.z+d);cam.lookAt(o.x,cy,o.z)}
  async function show(){const id=vIds[vi],x=colBy(id),a=S.col[id];if(!x||!a)return close();
    const my=++vTok,mo=motionOf(id),key=a.outfit||C().defaultOutfit||"ops",sc=SCENES[a.scene]||SCENES[0];
    // 38: 목록 칸과 같은 포토카드(테두리·등급 표·아래 띠·번호). 아래 글은 처음 봤을 때 대사만(이름·단계·날짜는 띠 안)
    $v(".cvframe").setAttribute("style",vars());$v(".cvframe>.pc").className="pc g-"+x.grade+(x.pose?" pose":"");$v(".pctag").textContent=tagOf(x.grade);{const pp=$v(".cvframe>.pc");let pb=pp.querySelector(".pcpose");if(x.pose&&!pb){pb=document.createElement("span");pb.className="pcpose";pp.appendChild(pb)}if(pb){pb.textContent=T("pose");pb.hidden=!x.pose}}  // 78
    $v(".cvfx").innerHTML=fx(x.grade);
    $v(".pcnm").textContent=x.name;$v(".pcsub").textContent=bandLine(a);$v(".pcno").textContent=no2(x);fitName($v(".pcnm"));
    const ln=x.line||speechOnly(a.line||a.text||"");$v(".cvln").textContent=ln;$v(".cvln").hidden=!ln;  // 52: 칸에 적힌 한 줄(data/collection.json line, 카드 팩 SECRET 등)이 먼저
    $v('[data-cv="prev"]').disabled=vi<=0;$v('[data-cv="next"]').disabled=vi>=vIds.length-1;
    $v(".cvplace").style.backgroundImage=`url(${sc.img})`;
    // 그림이 아직 없을 때만(만드는 중) 흐린 실루엣
    const im=$v(".cvimg"),cin=$v(".cvin");im.classList.remove("off");const u=urlNow(a.char,id);cin.classList.toggle("noimg",!u);
    if(u)im.src=u;else{im.removeAttribute("src");url(a.char,id).then(v=>{if(v&&my===vTok){im.src=v;cin.classList.remove("noimg")}})}
    K=null;Stage.camLoop(null);Stage.pano.view(SCENES[a.scene]?a.scene:0);if(typeof Look!=="undefined"&&Look.setPlace)Look.setPlace(sc.name);
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
    vEl.classList.remove("on");vEl.setAttribute("aria-hidden","true");document.querySelector(".app").classList.remove("cvon");shareF=null}
  viewOn=()=>vOn;

  // ── 공유: 카드 그림(이름·등급·moti 표시 포함)을 그림으로. 영상 공유는 아직 ──
  const loadImg=b=>new Promise(res=>{const u=URL.createObjectURL(b),i=new Image();i.onload=()=>{URL.revokeObjectURL(u);res(i)};i.onerror=()=>{URL.revokeObjectURL(u);res(null)};i.src=u});
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  // 35: 공유 그림 오른쪽 아래 moti 표시 = 로고 그림(assets/logo_moti.svg 의 경로). 못 읽으면 예전처럼 글자
  let logoP=null;
  const logoPath=()=>logoP||(logoP=fetch("assets/logo_moti.svg").then(r=>r.text()).then(t=>{const d=(t.match(/\sd="([^"]+)"/)||[])[1],vb=((t.match(/viewBox="([^"]+)"/)||[])[1]||"").split(/\s+/).map(Number);return d&&vb.length===4?{p:new Path2D(d),vb}:null}).catch(()=>null));
  // 38: 목록·크게 보기와 같은 포토카드(테두리·사진·등급 표·아래 띠·번호)를 캔버스에 그림. 움직이는 빛은 한 순간으로 멈춰 그림. moti 로고는 카드 바깥 오른쪽 아래
  // CSS linear-gradient(각도) 와 같은 그라데이션
  function cssGrad(g,x,y,w,h,cs,ang){if(cs.length===1)return cs[0];const a=(ang!=null?ang:125)*Math.PI/180,dx=Math.sin(a),dy=-Math.cos(a),L=Math.abs(w*dx)+Math.abs(h*dy),cx=x+w/2,cy=y+h/2;
    const gr=g.createLinearGradient(cx-dx*L/2,cy-dy*L/2,cx+dx*L/2,cy+dy*L/2);cs.forEach((s,i)=>gr.addColorStop(i/(cs.length-1),s));return gr}
  // 비스듬한 빛 띠(가운데 x 비율 at, 너비 비율 wk)
  function lightBand(g,x,y,w,h,col,at,wk){const cx=x+w*at,bw=w*wk,gr=g.createLinearGradient(cx-bw/2,0,cx+bw/2,0);gr.addColorStop(0,"rgba(255,255,255,0)");gr.addColorStop(.5,col);gr.addColorStop(1,"rgba(255,255,255,0)");
    g.save();g.translate(cx,y+h/2);g.transform(1,0,Math.tan(-15*Math.PI/180),1,0,0);g.translate(-cx,-(y+h/2));g.fillStyle=gr;g.fillRect(cx-bw/2,y-h*.3,bw,h*1.6);g.restore()}
  function star(g,cx,cy,s){const r=s/2,q=r*.22;g.beginPath();g.moveTo(cx,cy-r);g.lineTo(cx+q,cy-q);g.lineTo(cx+r,cy);g.lineTo(cx+q,cy+q);g.lineTo(cx,cy+r);g.lineTo(cx-q,cy+q);g.lineTo(cx-r,cy);g.lineTo(cx-q,cy-q);g.closePath();g.fill()}
  const fit=(g,t,w)=>{if(g.measureText(t).width<=w)return t;while(t.length>1&&g.measureText(t+"…").width>w)t=t.slice(0,-1);return t+"…"};
  async function shareImage(id){const a=S.col[id],x=colBy(id);if(!a||!x)return null;const b=await blob(a.char,id);if(!b)return null;const img=await loadImg(b);if(!img)return null;
    const P=PC(),Sh=C().share||{},gc=G(x.grade),d=(v,y)=>v!=null?v:y;
    const Bk=d(P.border,.0625),CW=Math.round(img.naturalWidth/(1-2*Bk)),CH=Math.round(CW*1.5),B=CW*Bk,R=CW*d(P.radius,.07),r=CW*d(P.photoRadius,.045),BH=CW*d(P.band,.25);
    const pad=Math.round(CW*.05),foot=Math.round(CW*.06);
    const c=document.createElement("canvas");c.width=CW+pad*2;c.height=CH+pad*2+foot;const g=c.getContext("2d"),font=(wt,px)=>`${wt} ${px}px "Pretendard","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif`;
    g.fillStyle="#0b0a12";g.fillRect(0,0,c.width,c.height);
    const X=pad,Y=pad;
    // 테두리(등급 색: 일반 크림, 레어 홀로그램, 시크릿 금박) + 테두리 위 반짝임 한 줄
    g.save();rr(g,X,Y,CW,CH,R);g.clip();g.fillStyle=cssGrad(g,X,Y,CW,CH,gc.frame||["#f4f1ea"],gc.frameAngle);g.fillRect(X,Y,CW,CH);
    if(gc.sheen)lightBand(g,X,Y,CW,CH,gc.sheen,.82,.34);
    // 사진(가운데 위쪽 자리 photoY 로 잘라 채움) + 레어 빛 한 줄 / 시크릿 오로라·반짝이
    const px=X+B,py=Y+B,pw=CW-2*B,ph=CH-B-BH,iw=img.naturalWidth,ih=img.naturalHeight,s=Math.max(pw/iw,ph/ih),dw=iw*s,dh=ih*s;
    g.save();rr(g,px,py,pw,ph,r);g.clip();g.fillStyle="#1a1626";g.fillRect(px,py,pw,ph);g.drawImage(img,px+(pw-dw)/2,py+(ph-dh)*d(P.photoY,.3),dw,dh);
    if(gc.light)lightBand(g,px,py,pw,ph,gc.light,.62,.3);
    if(gc.aurora&&gc.aurora.length){g.fillStyle=cssGrad(g,px,py,pw,ph,[...gc.aurora,gc.aurora[0]],115);g.fillRect(px,py,pw,ph)}
    if(gc.sparkles){g.fillStyle=gc.sparkle||"#fff";[[.84,.14,1],[.14,.47,.7],[.74,.8,.85]].slice(0,Math.min(3,gc.sparkles)).forEach(([sx,sy,k])=>star(g,px+pw*sx,py+ph*sy,CW*.07*k))}
    g.restore();
    // 왼쪽 위 등급 표(영문, 자간 넓게)
    const tf=CW*d(P.tag,.05),tr=tf*d(P.tagTrack,.18),tt=tagOf(x.grade);g.font=font(800,tf);g.textBaseline="middle";
    const cw=[...tt].map(ch=>g.measureText(ch).width),tw=cw.reduce((p,q)=>p+q,0)+tr*(cw.length-1),th=tf*1.8,tx=px+CW*.035,ty=py+CW*.035;
    g.fillStyle=gc.tagBg||"#fff";rr(g,tx,ty,tw+tf*1.2,th,th/2);g.fill();g.fillStyle=gc.tagInk||"#4b4560";
    let cx=tx+tf*.6;[...tt].forEach((ch,i)=>{g.fillText(ch,cx,ty+th/2+tf*.04);cx+=cw[i]+tr});
    // 아래 띠: 이름 / 작은 줄 · 오른쪽 번호
    const nf=CW*d(P.name,.085),sf=CW*d(P.small,.055),nof=CW*d(P.no,.1),bt=Y+CH-BH,lx=X+B,blockH=nf*1.2+sf*1.35,top=bt+(BH-blockH)/2;
    g.font=font(800,nof);g.textBaseline="middle";const nt=no2(x),nw=g.measureText(nt).width;g.fillStyle=gc.ink||"#4b4560";g.fillText(nt,X+CW-B-nw,bt+BH/2);
    const tw2=CW-2*B-nw-CW*.04;g.textBaseline="alphabetic";
    g.font=font(800,nf);const nw2=g.measureText(x.name).width;if(nw2>tw2)g.font=font(800,Math.max(nf*.55,nf*tw2/nw2));  // 52: 긴 이름은 글자만 줄임
    g.fillStyle=gc.ink||"#4b4560";g.fillText(fit(g,x.name,tw2),lx,top+nf*.98);
    g.font=font(600,sf);g.fillStyle=gc.sub||gc.ink||"#8a8398";g.fillText(fit(g,bandLine(a),tw2),lx,top+nf*1.2+sf*1.08);
    g.restore();
    // 카드 바깥 오른쪽 아래 moti 로고
    const mf=CW*(Sh.markK||.03);g.fillStyle="rgba(255,255,255,.6)";const lg=await logoPath(),base=Y+CH+(pad+foot)/2+mf*.4;
    if(lg){const [vx,,vw]=lg.vb,lh=mf*(Sh.logoK||.8),k=lh/lg.vb[3];g.save();g.translate(X+CW-vw*k,base);g.scale(k,k);g.translate(-vx,0);g.fill(lg.p);g.restore()}
    else{g.font=font(700,mf);g.textBaseline="alphabetic";const mt=T("mark");g.fillText(mt,X+CW-g.measureText(mt).width,base)}
    return await new Promise(res=>c.toBlob(res,"image/jpeg",.9))}
  const fname=id=>`moti-card-${id}.jpg`;
  // 공유 파일을 미리 만들어 둠(아이폰: 누른 순간 바로 공유 창을 열어야 함)
  async function prep(id,my){try{const b=await shareImage(id);if(!b||(my!=null&&my!==vTok))return null;shareF={id,file:new File([b],fname(id),{type:"image/jpeg"})};return shareF}catch(e){return null}}
  async function share(){const id=vIds[vi];let f=shareF&&shareF.id===id?shareF.file:null;if(!f){const r=await prep(id);f=r&&r.file}if(!f)return;
    if(PhotoUI.canShare(f)){try{await navigator.share({files:[f]})}catch(e){}return}
    PhotoUI.saveFile(f);toast(esc(T("saved")),1800)}

  return{running:()=>running,init,has,url,urlNow,blob,put,remove,clear,capture,fill,refresh,stale,verOf,make,motionOf,frameOf,onChange:f=>subs.push(f),perf,queue:()=>queue.map(q=>q.id),vars,cell,backCell,
    grid,hydrate,fitNames,open,close,isOpen:()=>vOn,shareImage,state:()=>({vOn,id:vIds[vi],K:!!K,outfit:Stage.outfitNow(),playing:Stage.recentMotion(0)})};
})();
