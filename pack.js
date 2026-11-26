// moti 카드 팩(49단계). 컬렉션 「카드 팩」 탭의 배너·확률 보기·뽑기 연출. 값 data/pack.json, 문구 data/ui.json pack, 계산 gacha.js
// 배너: 왼쪽 팩 그림(38 포토카드 「Seoa」 뒷면을 살짝 기울임) · 가운데 「카드 팩」·천장 안내 · 오른쪽 「1장 뽑기」「10장 뽑기」 버튼(위아래). 아래 오른쪽 「확률 보기 ›」
// 뽑기: 다이아 빼기 → gacha.draw(천장은 1장·10장 합쳐 S.packPity) → 새 카드는 S.col 에 기록(본 이야기의 그때 옷·장소, 26·43 방식으로 그림 예약) · 이미 가진 카드는 환급
// 연출(#packFx): 팩이 열림 → 카드가 뒷면으로 나옴 → 눌러서 한 장씩 뒤집기(레어는 뒤집힐 때 홀로그램 빛) → 10장은 「모두 뒤집기」로 한꺼번에 → 결과(NEW·이미 있어요). 87-1: 10장 결과 = 2열 5줄 세로 넘김
// cards.js 다음, index.html 본 스크립트보다 먼저 불린다. S·DATA·COL·UI·Cards 등은 함수 안에서만 쓴다.

const Pack=(()=>{
  const T=(k,v)=>UI("pack."+k,v);
  const P=()=>(DATA.pack)||{price:{one:50,ten:450},odds:{common:85,rare:14,special:1},pity:{count:10,min:"rare"},refund:5,fx:{}};
  const FX=k=>{const f=P().fx||{},d={open:900,deal:70,flip:520,rareHold:900,auto:160};return f[k]!=null?f[k]:d[k]};
  const left=()=>S.packPity==null?P().pity.count:S.packPity;
  const odds=()=>Gacha.odds(P().odds,COL.items);
  const price=n=>(P().price||{})[n===10?"ten":"one"]||0;
  const gk=g=>UI("collection.grade."+g);

  // ── 배너(renderAlbum 이 「카드 팩」 탭 맨 위에 넣음) ──
  function banner(){const p=P();
    const btn=n=>`<button class="pkbtn${n===10?" ten":""}" data-pull="${n}"><span>${esc(T(n===10?"ten":"one"))}</span><em>${Icon.gem(12)}${price(n)}</em></button>`;
    return `<div class="pkban" style="${Cards.vars()}">
      <div class="pkart" role="img" aria-label="${esc(T("artAria"))}"><span class="pkart2">${Cards.backCell("seoa")}</span><span class="pkart1">${Cards.backCell("seoa")}</span></div>
      <div class="pkmid"><b>${esc(T("title"))}</b><small>${esc(T("pity",{n:p.pity.count,min:gk(p.pity.min||"rare")}))}</small></div>
      <div class="pkbtns">${btn(1)}${btn(10)}</div>
    </div>
    <div class="pkoddsrow"><button class="pkodds" data-pkodds="1">${esc(T("odds"))}</button></div>`}
  function bind(root){root.querySelectorAll("[data-pull]").forEach(b=>b.onclick=()=>pull(+b.dataset.pull));
    const o=root.querySelector("[data-pkodds]");if(o)o.onclick=showOdds}

  // ── 확률 보기: 등급별 확률 + 팩에 들어 있는 카드(카드마다 %) ──
  function showOdds(){const p=P(),o=odds(),G=Gacha.grades(COL.items),L=Gacha.pool(COL.items).slice().sort((a,b)=>(a.no||0)-(b.no||0));
    const pct=v=>esc(T("pct",{v:+(+v||0).toFixed(2)}));
    const body=`<div class="pkoz"><h4>${esc(T("oddsGrade"))}</h4>
      <table class="otab"><tbody>${G.map(k=>`<tr><td>${esc(gk(k))}</td><td>${pct(o[k])}</td></tr>`).join("")}</tbody></table>
      <h4>${esc(T("oddsCards",{n:L.length}))}</h4>
      <table class="otab pkol"><tbody>${L.map(x=>`<tr><td><i>${String(x.no||0).padStart(2,"0")}</i> ${esc(x.name)}</td><td>${esc(gk(x.grade))}</td><td>${pct(Gacha.cardPct(x,o,COL.items))}</td></tr>`).join("")}</tbody></table>
      <p class="onote">${esc(T("oddsNote",{n:p.pity.count,min:gk(p.pity.min||"rare"),refund:p.refund||0}))}</p></div>`;
    Mini.open(T("oddsTitle"),body,null,{scroll:true})}  // 87-1: 제목·✕ 고정, 본문만 넘김

  // ── 뽑기 ──
  // 본 이야기의 그때 장소·옷(에피소드 중이면 본 이야기에 두고 온 장소, 26·27 세트 규칙)
  function seen(){const main=Thread.cur()==="main",sc=main?S.scene:(((S.threads||{}).main||{}).scene||0);
    const c=Outfit.cfg(),pl=c.privatePlaces||[0],ow=main?Outfit.want():(curStage()>=(c.comfortStage||3)&&pl.includes(sc)?"private":"ops");
    return seenNow({scene:sc,outfit:outfitForScene(sc,ow),thread:"main",pack:1})}
  let fx=null;  // 연출 상태
  function pull(n){if(fx)return;
    const cost=price(n);
    if(S.dia<cost){toast(esc(T("noDia")));toCharge();return}
    S.dia-=cost;
    const F=S.packNext;S.packNext=null;
    const r=Gacha.draw(n,odds(),P().pity,left(),COL.items,null,F);
    S.packPity=r.left;
    let refund=0;const got=new Set();
    const res=r.cards.filter(c=>c.item).map(c=>{const id=c.item.id,isNew=!S.col[id]&&!got.has(id);
      if(isNew){got.add(id);S.col[id]=seen()}else refund+=P().refund||0;
      return{...c,isNew}});
    S.dia+=refund;
    save();renderTop();
    res.filter(c=>c.isNew).forEach(c=>Cards.capture(c.item.id,{delay:0}));
    show(n,res,refund);
  }
  // 다이아가 모자라면 마이 페이지 충전 칸으로
  function toCharge(){setTab("my");requestAnimationFrame(()=>{const c=document.getElementById("chargeCard");if(c){c.scrollIntoView({block:"center",behavior:"smooth"});c.classList.remove("pkhl");void c.offsetWidth;c.classList.add("pkhl")}})}

  // ── 연출 ──
  let el=null;
  function build(){if(el)return el;el=document.createElement("div");el.id="packFx";el.className="pkfx";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");
    document.querySelector(".app").appendChild(el);
    el.addEventListener("click",onClick);
    // 87-1: 연출 중 손가락 끌기는 10장 묶음 칸(세로 넘김) 안에서만 — 뒤 화면(컬렉션)이 같이 움직이지 않게
    el.addEventListener("touchmove",e=>{if(!fx||!e.target.closest(".pkfx.gridon .pkstage"))e.preventDefault()},{passive:false});
    // 그림이 다 만들어지면 연출 안 카드에도 바로 넣음
    Cards.onChange(k=>{if(!fx||!k)return;const id=k.slice(k.indexOf(":")+1);el.querySelectorAll(`.mc.got[data-f="${id}"] .mcimg`).forEach(im=>{const a=S.col[id];if(!a)return;Cards.url(a.char,id).then(u=>{if(!u||!im.isConnected)return;im.src=u;im.hidden=false;const sv=im.parentNode.querySelector(".mcsil");if(sv)sv.remove()})})});
    return el}
  const card=(c,i)=>`<div class="pkcard g-${c.grade}${c.isNew?" new":" dup"}" data-i="${i}"><div class="pkin"><div class="pkface pkb">${Cards.backCell("seoa")}</div><div class="pkface pkf">${Cards.cell(c.item)}</div></div>
    <span class="pkmark">${c.isNew?`<b class="pknew">${esc(T("new"))}</b>`:`<b class="pkdup" data-s="${esc(T("ownedShort",{refund:P().refund||0}))}">${esc(T("owned",{refund:P().refund||0}))}</b>`}</span></div>`;
  function show(n,res,refund){build();
    fx={n,res,refund,i:0,flipped:new Set(),phase:"open",timers:[]};
    el.style.cssText=Cards.vars();
    el.innerHTML=`<div class="pkbg"></div>
      <div class="pkstage"><div class="pkpack"><span class="pkart2">${Cards.backCell("seoa")}</span><span class="pkart1">${Cards.backCell("seoa")}</span><i class="pkflash"></i></div>
        <div class="pkone"></div><div class="pkgrid" hidden></div></div>
      <div class="pkfoot"><p class="pkhint">${esc(T("tapOpen"))}</p><p class="pkcount"></p><div class="pkacts"></div></div>`;
    el.classList.remove("on","opened","result");void el.offsetWidth;el.classList.add("on");
    if(typeof Fn!=="undefined")Fn.set(false);
    fx.open=()=>{if(!fx||fx.phase!=="open")return;el.classList.add("opened");fx.phase="deal";dealOne()};
    later(fx.open,FX("open"));
  }
  const later=(f,ms)=>{const t=setTimeout(f,ms);fx.timers.push(t);return t};
  const $f=s=>el.querySelector(s);
  // 한 장씩: 가운데 큰 카드(뒷면)
  function dealOne(){const c=fx.res[fx.i],box=$f(".pkone");
    box.innerHTML=card(c,fx.i)+(c.item.line?`<p class="pkln">${esc(c.item.line)}</p>`:"");Cards.hydrate(box);  // 52: 카드 아래 한 줄(뒤집힌 뒤 보임)
    const cd=box.firstElementChild;cd.classList.add("deal");
    $f(".pkhint").textContent=T("tapFlip");
    $f(".pkcount").textContent=fx.n>1?T("count",{i:fx.i+1,n:fx.res.length}):"";
    $f(".pkacts").innerHTML=fx.n>1?`<button class="pkall" data-pk="all">${esc(T("flipAll"))}</button>`:"";
    fx.phase="one"}
  function flip(cd,i){if(!cd||fx.flipped.has(i))return false;fx.flipped.add(i);cd.classList.add("flip");
    const c=fx.res[i];if(c.grade!=="common"){later(()=>cd.classList.add("shine"),Math.round(FX("flip")*.45));later(()=>cd.classList.remove("shine"),Math.round(FX("flip")*.45)+FX("rareHold"))}
    later(()=>cd.classList.add("show"),FX("flip"));
    return true}
  function onClick(e){if(!fx)return;const b=e.target.closest("[data-pk]");
    if(b){const k=b.dataset.pk;if(k==="all")return flipAll();if(k==="done")return close();if(k==="again"){const n=fx.n;close();return pull(n)}return}
    if(fx.phase==="one"){const cd=e.target.closest(".pkone .pkcard")||(e.target.closest(".pkstage")&&$f(".pkone .pkcard"));if(!cd)return;
      if(flip(cd,fx.i)){$f(".pkhint").textContent=fx.n>1&&fx.i<fx.res.length-1?T("tapNext"):"";if(fx.n===1)later(result,FX("flip")+(fx.res[0].grade!=="common"?FX("rareHold"):200));return}
      if(!cd.classList.contains("show"))return;  // 아직 뒤집히는 중
      if(fx.i<fx.res.length-1){fx.i++;dealOne()}else result()}
    else if(fx.phase==="grid"){const cd=e.target.closest(".pkgrid .pkcard");if(cd)flip(cd,+cd.dataset.i)}}
  // 결과 묶음: 10장 = 2열 5줄, 가운데 칸만 세로로 넘김(87-1, 예전 5열 두 줄). 이미 뒤집은 카드는 앞면 그대로, 1장 = 큰 카드 그대로
  function grid(){const g=$f(".pkgrid");g.innerHTML=fx.res.map(card).join("");Cards.hydrate(g);
    g.querySelectorAll(".pkcard").forEach(cd=>{if(fx.flipped.has(+cd.dataset.i))cd.classList.add("flip","show","now")});
    g.hidden=false;$f(".pkone").innerHTML="";el.classList.add("gridon");fx.phase="grid";$f(".pkcount").textContent="";
    $f(".pkstage").scrollTop=0;Cards.fitNames(g);return g}  // 87-1: 보이게 한 뒤에 이름 맞추기(숨긴 채로는 너비가 0)
  function flipAll(){if(fx.phase!=="one")return;const g=grid();$f(".pkacts").innerHTML="";$f(".pkhint").textContent="";
    const rest=[...g.querySelectorAll(".pkcard")].filter(cd=>!fx.flipped.has(+cd.dataset.i));
    rest.forEach((cd,k)=>later(()=>flip(cd,+cd.dataset.i),120+k*FX("auto")));
    later(result,120+rest.length*FX("auto")+FX("flip")+(rest.some(cd=>fx.res[+cd.dataset.i].grade!=="common")?Math.round(FX("rareHold")/2):100))}
  function result(){if(!fx)return;
    if(fx.n>1&&fx.phase!=="grid")grid();
    fx.phase="result";el.classList.add("result");
    const nn=fx.res.filter(c=>c.isNew).length,nd=fx.res.length-nn;
    $f(".pkhint").innerHTML=[nn?`<b>${esc(T("summaryNew",{n:nn}))}</b>`:"",nd?esc(T("summaryDup",{n:nd,refund:fx.refund})):""].filter(Boolean).join("<br>");
    $f(".pkcount").textContent="";
    $f(".pkacts").innerHTML=`<button class="pkagain" data-pk="again">${esc(T("again",{label:T(fx.n===10?"ten":"one")}))}<em>${Icon.gem(12)}${price(fx.n)}</em></button><button class="pkdone" data-pk="done">${esc(T("done"))}</button>`}
  function close(){if(!fx)return;fx.timers.forEach(clearTimeout);fx=null;el.classList.remove("on","opened","result","gridon");el.innerHTML="";
    if(typeof curTab!=="undefined"&&curTab==="album")renderAlbum()}
  const isOpen=()=>!!fx;
  // 확인용(캡처): 팩 열림을 기다리지 않고 바로 다음으로
  const skipOpen=()=>{if(fx&&fx.open)fx.open()};
  return{banner,bind,showOdds,pull,close,isOpen,skipOpen,left,toCharge,state:()=>fx&&{phase:fx.phase,i:fx.i,n:fx.n,flipped:[...fx.flipped],res:fx.res.map(c=>({id:c.item.id,grade:c.grade,isNew:c.isNew,forced:c.forced})),refund:fx.refund}};
})();
