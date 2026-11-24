// moti 포즈(41단계). 모은 무빙 카드를 골라 서아에게 포즈를 부탁하고, 그 포즈 그대로 촬영한다. 문구 data/ui.json pose, 원고 docs/drafts/41-포즈-원고.md
// 입구 두 개, 카드 목록 시트는 하나(#poseSheet):
//   A. 대화: ＋ 기능판 「포즈」 → 카드 → 내 말 「{이름} 해 줄래?」 자동 전송 → 서아 답장 + 그 몸짓 → 답장 아래 「이 포즈로 찍기」 → 그 몸짓을 반복하는 촬영 화면
//   B. 촬영 화면: 멈춤 옆 「포즈」 → 카드 → 바로 그 몸짓 반복
// 카드 칸은 컬렉션과 같은 포토카드(Cards.grid). 모은 카드가 앞, 못 모은 칸은 뒷면 + 자물쇠(누르면 「아직 못 본 포즈예요」만, 힌트 없음 — 38과 같게)
// photos.js·cards.js 다음, index.html 본 스크립트보다 먼저 불린다. S·DATA·UI·Cam·send 등은 함수 안에서만 쓴다.

const Pose=(()=>{
  let from="chat",pending=null;
  const T=(k,v)=>UI("pose."+k,v);
  // 서아 카드: 모은 것(컬렉션 번호 순) → 못 모은 것
  function lists(){const L=colList("all"),mine=x=>{const a=S.col[x.id];return a&&(a.char||"seoa")==="seoa"};
    return{got:L.filter(mine),rest:L.filter(x=>!S.col[x.id])}}
  // 카드 id → 촬영 화면이 반복할 몸짓. 선물 카드(g01…)는 그 카드의 재생 설정(Cards.motionOf)
  function info(id){const it=colBy(id);if(!it)return null;const m=Cards.motionOf(id)||{};
    return{id:m.m||id,sp:m.sp||1,name:it.name,ref:id,f:m.f||null,pose:true}}
  function sheet(where){
    from=where==="cam"?"cam":"chat";
    const {got,rest}=lists(),s=$("#poseSheet"),C=from==="cam";
    s.innerHTML=`<h2>${esc(T(C?"camTitle":"title"))}</h2><p class="sub">${esc(got.length?T(C?"camSub":"sub",{n:got.length}):T("empty"))}</p>${Cards.grid([...got,...rest])}`;
    s.querySelectorAll(".mc.back").forEach(b=>{b.classList.add("plock");b.setAttribute("role","button");b.setAttribute("tabindex","0");
      b.insertAdjacentHTML("beforeend",`<span class="plk">${Icon.svg("lock",15)}</span>`);b.onclick=()=>toast(esc(T("locked")))});
    s.querySelectorAll(".mc.got").forEach(b=>{b.setAttribute("aria-label",T("ariaPick",{name:(colBy(b.dataset.f)||{}).name||""}));b.onclick=()=>pick(b.dataset.f)});
    Cards.hydrate(s);s.scrollTop=0;
    if(typeof Fn!=="undefined")Fn.set(false);
    openSheet("#poseSheet");
  }
  function pick(id){closeSheets();const x=info(id);if(!x)return;
    if(from==="cam"&&Cam.isOpen()){Cam.setPose(x);return}
    ask(id)}
  // A: 대화에서 부탁. 답장 처리(index.html send)가 take() 로 꺼내 그 몸짓을 꼭 재생하고, 답장에 pose 표시를 남김
  function ask(id){const it=colBy(id);if(!it||busy)return;
    if(curTab!=="chat"||(S.room||"seoa")!=="seoa")return;
    pending=id;send(T("ask",{name:it.name}))}
  function take(){const p=pending;pending=null;return p}
  // 답장 아래 「이 포즈로 찍기」(index.html renderLog 가 그림)
  const shootBtn=id=>`<button class="poseshoot" data-pose="${esc(id)}">${icon("camera")}<span>${esc(T("shoot"))}</span></button>`;
  function init(){const L=$("#log");if(L)L.addEventListener("click",e=>{const b=e.target.closest("[data-pose]");if(!b)return;const x=info(b.dataset.pose);if(x)Cam.open({pose:x})})}
  return{sheet,info,take,shootBtn,init};
})();
