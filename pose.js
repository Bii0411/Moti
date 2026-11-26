// moti 포즈(48단계, 78에서 촬영 전용 포즈만). 포즈 카드(data/collection.json pose true)를 골라 서아에게 포즈를 부탁하고, 그 포즈 그대로 촬영한다.
// 78: 목록 = 포즈 카드만(대화·해금·선물·댄스·일반 카드 팩 몸짓은 빠짐). 순서 = 무료(free) → 가진 포즈 → 못 가진 포즈(뒷면 + 자물쇠, 누르면 「카드팩에서 획득할 수 있어요.」). 고를 때 서버를 부르지 않음(촬영 화면) 문구 data/ui.json pose, 원고 docs/drafts/48-포즈-원고.md
// 입구 두 개, 카드 목록 시트는 하나(#poseSheet):
//   A. 대화: ＋ 기능판 「포즈」 → 카드 → 내 말 「{이름} 해 줄래?」 자동 전송 → 서아 답장 + 그 몸짓 → 답장 아래 「이 포즈로 찍기」 → 그 몸짓을 반복하는 촬영 화면
//   B. 촬영 화면: 멈춤 옆 「포즈」 → 카드 → 바로 그 몸짓 반복
// 카드 칸은 컬렉션과 같은 포토카드(Cards.grid). 모은 카드가 앞, 못 모은 칸은 뒷면 + 자물쇠(누르면 「아직 못 본 포즈예요」만, 힌트 없음 — 38과 같게)
// photos.js·cards.js 다음, index.html 본 스크립트보다 먼저 불린다. S·DATA·UI·Cam·send 등은 함수 안에서만 쓴다.

const Pose=(()=>{
  let from="chat",pending=null;
  const T=(k,v)=>UI("pose."+k,v);
  // 78: 포즈 카드만. 무료 → 가진 것(카드 번호 순) → 못 가진 것
  const poses=()=>colList("all").filter(x=>x.pose);
  function lists(){const L=poses(),mine=x=>{const a=S.col[x.id];return a&&(a.char||"seoa")==="seoa"};
    return{free:L.filter(x=>x.free&&mine(x)),got:L.filter(x=>!x.free&&mine(x)),rest:L.filter(x=>!mine(x))}}
  // 78: 기본 무료 포즈는 누구나 처음부터(새로·예전 사용자 모두). 이미 있으면 그대로(중복 없음)
  function grantFree(){let n=0;poses().filter(x=>x.free).forEach(x=>{if(!S.col[x.id]){S.col[x.id]=seenNow({line:"",free:1});n++}});if(n){save();if(typeof Cards!=="undefined")poses().filter(x=>x.free).forEach(x=>Cards.capture(x.id))}return n}
  // 카드 id → 촬영 화면이 반복할 몸짓. 선물 카드(g01…)는 그 카드의 재생 설정(Cards.motionOf)
  function info(id){const it=colBy(id);if(!it)return null;const m=Cards.motionOf(id)||{};
    return{id:m.m||id,sp:m.sp||1,name:it.name,ref:id,f:m.f||null,pose:true}}
  function sheet(where){
    from=where==="cam"?"cam":"chat";
    grantFree();const {free,got,rest}=lists(),s=$("#poseSheet"),C=from==="cam",n=free.length+got.length;
    s.innerHTML=`<h2>${esc(T(C?"camTitle":"title"))}</h2><p class="sub">${esc(n?T(C?"camSub":"sub",{n,total:n+rest.length}):T("empty"))}</p>${Cards.grid([...free,...got,...rest])}`;
    s.querySelectorAll(".mc.back").forEach(b=>{b.classList.add("plock");b.setAttribute("role","button");b.setAttribute("tabindex","0");
      b.insertAdjacentHTML("beforeend",`<span class="plk">${Icon.svg("lock",15)}</span>`);b.onclick=()=>toast(esc(T("locked")))});
    s.querySelectorAll(".mc.got").forEach(b=>{b.setAttribute("aria-label",T("ariaPick",{name:(colBy(b.dataset.f)||{}).name||""}));b.onclick=()=>pick(b.dataset.f)});
    Cards.hydrate(s);s.scrollTop=0;
    if(typeof Fn!=="undefined")Fn.set(false);
    openSheet("#poseSheet");
  }
  function pick(id){const it=colBy(id);if(!it||!it.pose||!S.col[id])return toast(esc(T("locked")));closeSheets();const x=info(id);if(!x)return;  // 78: 포즈 카드만, 가진 것만
    if(from==="cam"&&Cam.isOpen()){Cam.setPose(x);return}
    ask(id)}
  // A: 대화에서 부탁. 답장 처리(index.html send)가 take() 로 꺼내 그 몸짓을 꼭 재생하고, 답장에 pose 표시를 남김
  function ask(id){const it=colBy(id);if(!it||busy)return;
    if(curTab!=="chat"||(S.room||"seoa")!=="seoa")return;
    pending=id;send(T("ask",{name:it.name}))}
  function take(){const p=pending;pending=null;return p}
  // 답장 아래 「이 포즈로 찍기」(index.html renderLog 가 그림)
  const shootBtn=id=>`<button class="poseshoot" data-pose="${esc(id)}">${icon("camera")}<span>${esc(T("shoot"))}</span></button>`;
  function init(){grantFree();const L=$("#log");if(L)L.addEventListener("click",e=>{const b=e.target.closest("[data-pose]");if(!b)return;const x=info(b.dataset.pose);if(x)Cam.open({pose:x})})}
  return{sheet,info,take,shootBtn,init,grantFree,poses,lists};
})();
