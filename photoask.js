// moti 사진 촬영 제안(83). 서버 S5 photo_ask(photo_3 · photo_6) → 서아가 먼저 사진을 부탁하고, 관계 단계에 따라 본편 카메라 권한이 열린다.
// 설정·반응 대사 data/seoa_story.json photoAsk, 화면 문구 data/ui.json photoAsk, 시연 data/demo.json photoAskDemo. 서버 규격 docs/server-sync.md 「83」
// 저장 S.photoAsk (본편 전용, 되감기 지점에 안 들어감 — 되감아도 쓴 촬영 기회는 돌아오지 않음)
//   offered  : 보여 준 제안 id(서버 photo_asks 로 감)
//   used     : 촬영 기회를 쓴 id(그 제안 버튼으로 연 촬영에서 사진을 한 장이라도 정상 저장한 순간 기록 → 새로고침·강제 종료에도 남음)
//   reacted  : 촬영 뒤 반응을 처리한 id(보여 줬거나, 어색해져서 건너뜀)
//   unlocked : 연인(6단계) 자유 촬영 해금(photo_6 이 보인 순간)
//   ev       : 제안 때의 자리 {id: {stage, route, scene, cf}} — 촬영 뒤 반응이 어색한지 볼 때
// 카메라 권한(본편 줄기만. 크리스마스·다른 에피소드는 예전 그대로): gate(o) 가 Fn 카메라·＋ 포즈·제안 버튼·예전 「이 포즈로 찍기」·Cam.open 에서 모두 같은 답
// photos.js·pose.js 다음, index.html 본 스크립트보다 먼저 불린다. S·DATA·UI·story·curStage 등은 함수 안에서만 쓴다.

const PhotoAsk=(()=>{
  const D=()=>((typeof DATA!=="undefined"&&DATA.story)||{}).photoAsk||{};
  const T=(k,v)=>UI("photoAsk."+k,v);
  const IDS=()=>D().ids||["photo_3","photo_6"];
  const POSE=()=>D().pose||"p01";
  const stageOf=id=>+((D().stage||{})[id])||(id==="photo_6"?6:3);
  let epoch=0,ses=null,waitT=null;  // epoch: 초기화·처음부터마다 +1 (그 전에 시작한 저장·반응은 버림). ses: 지금 열린 제안 촬영
  function st(){const p=S.photoAsk&&typeof S.photoAsk==="object"?S.photoAsk:(S.photoAsk={});
    ["offered","used","reacted"].forEach(k=>{if(!Array.isArray(p[k]))p[k]=[]});p.unlocked=!!p.unlocked;if(!p.ev||typeof p.ev!=="object")p.ev={};return p}
  const has=(k,id)=>st()[k].includes(id);
  const add=(k,id)=>{const L=st()[k];if(!L.includes(id))L.push(id)};
  const main=()=>typeof Thread==="undefined"||Thread.cur()==="main";
  const key=(id,route)=>id==="photo_3"?id+"_"+route:id;

  // ── 서버 ──
  // 본편 /chat·/judge state 에 지원 신호와 보여 준 제안 목록. 에피소드 요청은 noNameFlow 가 두 키를 뺌
  function req(o){o.photo_ask_v=1;o.photo_asks=st().offered.filter(id=>IDS().includes(id));return o}
  function strip(o){if(o){delete o.photo_ask_v;delete o.photo_asks}return o}
  // /judge 응답 state: 앱 목록과 합집합(판정 중에 나온 제안을 잃지 않게, 옛 값으로 되돌아가지 않게). story 에는 남기지 않음(되감기가 되돌리지 않게)
  function fromJudge(s){if(!s)return;const L=Array.isArray(s.photo_asks)?s.photo_asks:[];let n=0;L.forEach(id=>{if(IDS().includes(id)&&!has("offered",id)){add("offered",id);n++}});strip(s);return n}

  // ── 제안 받기 ──
  // 서버 photo_ask 확인. 맞으면 {id, route, face, cf} — 아니면 null(무시)
  // 허용: id photo_3·photo_6 · pose p01 · 지금 본편 단계가 그 id 단계 · 아직 안 보인 id. face·camera_face 는 그 갈래 허용 값이면 서버 값, 아니면 data 기본값
  function check(pa){
    if(!pa||typeof pa!=="object"||!main())return null;
    const id=pa.id;if(!IDS().includes(id)||pa.pose!==POSE())return null;
    if(curStage()!==stageOf(id)||has("offered",id))return null;
    const ok=r=>r==="tease"||r==="care",sr=story().route;
    const route=ok(pa.route)?pa.route:ok(sr)?sr:(id==="photo_3"?null:"care");if(!route)return null;
    const F=(D().faces||{})[key(id,route)]||{},A=(D().allowed||{})[id]||{};
    const pick=(v,list,def)=>typeof v==="string"&&(list||[]).includes(v)?v:def;
    return{id,route,face:pick(pa.face,A.face,F.face||"soft"),cf:pick(pa.camera_face,A.camera_face,F.camera_face||"soft")}}
  // 답장을 대화 기록에 넣기 직전: 보여 준 것으로 기록(대화 기록과 같은 save 에 들어감). msg.pa = 말풍선 아래 버튼
  function offer(x,msg){if(!x)return;const p=st();add("offered",x.id);p.ev[x.id]={stage:stageOf(x.id),route:x.route,scene:S.scene||0,cf:x.cf,at:Date.now()};
    if(x.id==="photo_6")p.unlocked=true;  // 연인 자유 촬영은 제안이 보이는 순간 영구 해금
    if(msg)msg.pa={id:x.id,cf:x.cf}}
  // 답장을 넣은 뒤: photo_3 처음이면 손가락 하트 카드(촬영과 상관없이, 이미 가졌으면 없음) · ＋ 기능판 자물쇠
  function after(x){if(!x)return;lockUI();
    if(x.id==="photo_3"&&typeof Pose!=="undefined")Pose.cardEvent("photoAsk")}

  // ── 권한 ──
  // o.ask = 제안 버튼 id. {ok, msg, ses}  ses = 이 촬영이 제안 촬영(반응·기회 소비를 셈)
  function gate(o){
    if(!main())return{ok:true,ses:null};
    const p=st(),n=curStage(),id=o&&o.ask||null;
    if(n>=6){if(p.unlocked)return{ok:true,ses:id==="photo_6"&&has("offered","photo_6")?"photo_6":null};return{ok:false,msg:T("lock.soon")}}
    if(n===3){if(id==="photo_3"&&has("offered","photo_3")&&!has("used","photo_3"))return{ok:true,ses:"photo_3"};
      if(has("used","photo_3"))return{ok:false,msg:T("lock.later")};
      return{ok:false,msg:T(has("offered","photo_3")?"lock.inChat":"lock.closer")}}
    if(n>=4)return{ok:false,msg:T("lock.later")};
    return{ok:false,msg:T("lock.closer")}}
  const locked=()=>!gate().ok;
  // ＋ 기능판 카메라·포즈 칸: 숨기지 않고 작은 자물쇠
  function lockUI(){const on=locked();document.querySelectorAll('#fnPanel [data-fn="camera"],#fnPanel [data-fn="pose"]').forEach(b=>{b.classList.toggle("plocked",on);
    let k=b.querySelector(".fnlock");if(on&&!k){k=document.createElement("span");k.className="fnlock";k.innerHTML=typeof Icon!=="undefined"?Icon.svg("lock",12):"";b.querySelector(".tile").appendChild(k)}else if(!on&&k)k.remove()})}

  // ── 제안 촬영 세션 ──
  // Cam.open 이 gate 를 통과한 뒤 부름. 제안 촬영이 아니면 ses = null
  function begin(id){ses=id?{id,epoch,saved:0,closed:false}:null;return ses}
  const cur=()=>ses;
  const fixed=()=>!!(ses&&ses.id==="photo_3");  // 3단계 제안 촬영: p01 과 정한 표정 그대로(다른 포즈 못 고름)
  // 사진이 실제로 저장됨(Photos.add 성공). s = 셔터를 누른 때의 세션 — 그 사이 초기화·줄기 전환이면 버림(다른 이벤트에 안 셈)
  function saved(s){if(!s||s.epoch!==epoch||!main())return;s.saved++;if(!has("used",s.id)){add("used",s.id);save()}if(s.closed)reaction(s.id)}
  function end(){const s=ses;ses=null;if(!s)return;s.closed=true;if(s.saved)reaction(s.id)}
  // 촬영 뒤 반응: 이벤트마다 한 번. 서아 말로 대화 기록에(다음 /chat history 에 들어감). 서버 호출·호감·대화 횟수·판정 없음
  // 줄기·단계·갈래·장소가 제안 때와 다르면 어색하니 보이지 않고 처리한 것으로
  function reaction(id){clearTimeout(waitT);const e0=epoch;
    const go=(tries)=>{if(e0!==epoch||has("reacted",id)||!has("used",id))return;
      if((typeof busy!=="undefined"&&busy)||(typeof Cam!=="undefined"&&Cam.isOpen())){if(tries>0)waitT=setTimeout(()=>go(tries-1),600);return}  // 답장을 기다리는 중이면 그 뒤에
      const p=st(),e=p.ev[id]||{},line=(D().react||{})[key(id,e.route)];add("reacted",id);
      const fit=main()&&line&&curStage()===(e.stage||stageOf(id))&&(id!=="photo_3"||story().route===e.route)&&(S.scene||0)===(e.scene!=null?e.scene:S.scene||0);
      if(!fit){save();return}
      const f=e.cf||"soft";addReply(line,{pr:id,emo:""},"seoa");
      if(S.room==="seoa"&&curTab==="chat"&&!Cam.isOpen())react({m:IDLE,f,t:line,e:""})};
    go(40)}
  // 새로고침·강제 종료로 세션이 닫히지 않은 채 저장만 된 제안: 다음 실행에서 한 번 마무리
  function init(){const p=st();if(main())p.used.filter(id=>!p.reacted.includes(id)).forEach(reaction);lockUI()}

  // ── 초기화 ── 본편 처음부터 · 서아 초기화 · 관계 초기화 · 전체 초기화
  function reset(){epoch++;ses=null;clearTimeout(waitT);S.photoAsk={offered:[],used:[],reacted:[],unlocked:false,ev:{}};lockUI()}
  // 시연: 그 제안 하나만 처음 상태로(다시 볼 수 있게)
  function forget(id){epoch++;ses=null;const p=st();["offered","used","reacted"].forEach(k=>{p[k]=p[k].filter(x=>x!==id)});delete p.ev[id];if(id==="photo_6")p.unlocked=false;save();lockUI()}

  // 말풍선 아래 「서아 사진 찍어주기」(Pose.shootBtn 과 같은 모양, data-pa 로 일반 포즈 버튼과 구분)
  const btn=pa=>`<button class="poseshoot pask" data-pa="${esc(pa.id)}" data-cf="${esc(pa.cf||"")}">${icon("camera")}<span>${esc(T("shoot"))}</span></button>`;
  function shoot(id,cf){const g=gate({ask:id});if(!g.ok)return toast(esc(g.msg));
    const x=Pose.info(POSE());if(!x)return toast(esc(T("lock.closer")));
    Cam.open({pose:{...x,f:cf||(st().ev[id]||{}).cf||x.f},ask:id})}
  function bind(){const L=document.getElementById("log");if(L)L.addEventListener("click",e=>{const b=e.target.closest("[data-pa]");if(!b)return;shoot(b.dataset.pa,b.dataset.cf)})}

  return{req,strip,fromJudge,check,offer,after,gate,locked,lockUI,begin,cur,fixed,saved,end,reaction,init,reset,forget,btn,shoot,bind,st,stageOf,epoch:()=>epoch};
})();
