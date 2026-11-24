// moti 서아가 먼저 보내는 사진(12단계). 원고·값 data/seoa_photo.json, 화면 문구 data/ui.json seoaPhoto
// SeoaPhoto : 사진 만들기(열린 몸짓의 한 순간 + 장소, 셀카·풍경) → 대화 기록의 사진 말풍선 + 사진 저장소(종류 received)
//             보내는 때: 단계 사진(관계 2~6단계로 오를 때) · 오랜만 사진 · 대화 중 가끔 · 시연 패널 「서아 사진 지금 받기」
// 사진과 함께 오는 말은 원고에서만 고른다(대화 AI 가 만들지 않음). 서아 혼자, blur·filter 효과 없음.
// 사진은 화면 밖에서 만든다: 대화 무대 그림판을 같은 작업 안에서 잠깐 큰 크기로 한 번 더 그리고 바로 되돌림(Stage.still, photos.js Shot 과 같은 방식)
// photos.js 다음, index.html 본 스크립트보다 먼저 불린다. S·DATA·Stage·UI 등은 함수 안에서만 쓴다.

const SeoaPhoto=(()=>{
  const D=()=>(typeof DATA!=="undefined"&&DATA.seoaPhoto)||{};
  const T=(k,v)=>UI("seoaPhoto."+k,v);
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const pick=a=>a&&a.length?a[Math.floor(Math.random()*a.length)]:undefined;
  // 저장값 S.sp: got = 받은 단계 사진 {단계: 사진 id}, pend = 보낼 차례(대화방에서 조건이 맞으면 보냄), since = 마지막 사진 뒤 서아 답장 수,
  // shot = 대화 중 사진의 마지막 종류(번갈아), last = 묶음별 마지막 메시지 번호, away = 마지막 오랜만 메시지 번호, note = 다음 서버 요청에 덧붙일 한 줄
  const st=()=>{const s=S.sp||(S.sp={});s.got=s.got||{};s.pend=s.pend||[];s.last=s.last||{};if(s.since==null)s.since=0;return s};
  const sceneOf=name=>{const i=SCENES.findIndex(x=>x.name===name);return i>=0?i:(S.scene||0)};
  let sending=false,loopT=null;
  const perf=[];

  // ── 사진 만들기 ──
  const filmShot=m=>((((DATA.onboarding||{}).film||{}).shots)||[]).find(s=>s.id===m);
  function moment(mid){const fs=filmShot(mid);if(fs&&fs.at!=null)return fs.at;const M=D().moment||{},bm=M.byId||{};if(bm[mid]!=null)return bm[mid];return M.default!=null?M.default:50}
  // 지금 열린 몸짓 중 하나(이 종류에서 피할 몸짓 빼고, 바로 앞 사진의 몸짓은 되도록 빼고)
  function pickMotion(K){const av=new Set(K.avoid||[]),s=st();
    let ids=unlockedIds().filter(id=>canPlay(id)&&!av.has(id));if(ids.length>1)ids=ids.filter(id=>id!==s.lastMid);
    return pick(ids)||IDLE}
  // 구도: 키 비율 top·bottom·width 가 들어오게 거리를 잡음(11단계 포토부스 구도와 같은 계산) + lift(위에서 내려다보기) + shift(서아를 옆으로 비킴)
  function setCam(cam,aspect,K,yaw,shift){
    const H=Stage.height(),tn=Math.tan(cam.fov*Math.PI/360),top=K.top,bot=K.bottom,cy=(top+bot)/2*H;
    const d=Math.max((top-bot)*H/2/tn,K.width*H/2/(tn*aspect)),r=yaw*Math.PI/180,o=Stage.center(K.center||0);
    const rx=Math.cos(r)*shift*H,rz=-Math.sin(r)*shift*H;  // 카메라 오른쪽 방향으로 shift 만큼(서아는 사진에서 왼쪽으로)
    cam.position.set(o.x+Math.sin(r)*d+rx,cy+(K.lift||0)*H,o.z+Math.cos(r)*d+rz);cam.lookAt(o.x+rx,cy,o.z+rz)}
  // spec: {scene, shot}. 돌려주는 값: 큰 사진·작은 사진(jpeg), 고른 몸짓, 걸린 시간
  // 26-1 무빙 카드(cards.js)도 이것을 씀: spec.mid 몸짓 고정 · spec.face 표정 · spec.K 구도 직접 · spec.image {aspect, longPx, quality, minQuality, maxKB} 크기 ·
  //   spec.outfit 그 의상 모델로(대화 무대의 의상은 그대로) · spec.card 면 큰 사진 한 장만(작은 사진 없음, 마지막 몸짓 기록 안 바꿈)
  async function make(spec){
    await Stage.ready;
    const P={...(((DATA.photos||{}).image)||{}),...(spec.image||{})},A=P.aspect||[3,4],H=P.longPx||1440,W=Math.round(H*A[0]/A[1]);
    const K=spec.K||((D().kinds||{})[spec.shot])||{top:1.07,bottom:.6,width:.46},sc=SCENES[spec.scene]||SCENES[0],img=await Shot.loadImg(sc.img),pi=SCENES[spec.scene]?spec.scene:0,pano=await Stage.pano.ready(pi);  // 30: 360도 배경
    // 26-2: 다른 의상 모델은 그리는 동안 붙잡아 둠(내려놓기 prune 에서 빠짐). 다 그리면 놓고, 쓰지 않으면 바로 내려놓음
    const pin=spec.outfit&&spec.outfit!==Stage.outfitNow()?spec.outfit:null;if(pin)Stage.use(pin,1);
    try{  // 30-1: 360도 그림도 다 그릴 때까지 붙잡아 둠(끝나면 pano.done)
    const model=pin?await Stage.model(pin).catch(()=>null):null;
    const mid=spec.mid||pickMotion(K);if(spec.mid)await Stage.xs(mid);
    const mt=(spec.at!=null?spec.at:moment(mid))/100*Stage.dur(mid),ff=filmShot(mid),faces=K.faces||["soft"],face=spec.face||(ff&&faces.includes(ff.face)?ff.face:pick(faces));
    const yaw=pick(K.yaw)||0,shift=pick(K.shift)||0,bgX=pick(K.bgX);
    // 32-A: 확대(View)가 커지거나 줄어드는 중이면 끝날 때까지 미룸(그림판 크기가 매 프레임 바뀌는 중에 크기를 빌리지 않게)
    for(let i=0;i<20&&typeof View!=="undefined"&&View.moving&&View.moving()>0;i++)await wait(View.moving()+60);
    const t0=performance.now(),c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
    g.fillStyle="#140a24";g.fillRect(0,0,W,H);if(img&&!pano){Shot.cover(g,img,W,H,bgX!=null?bgX:.5,.4);Shot.dimLayer(g,W,H)}
    const ok=Stage.still(mid,mt,face,()=>{
      const {R,scene,cam}=Stage.three(),pr=R.getPixelRatio(),sz=R.getSize(new THREE.Vector2()),asp=cam.aspect,kp=cam.position.clone(),kq=cam.quaternion.clone(),vw=cam.view&&cam.view.enabled?{...cam.view}:null;  // 32-A: 꺼진 시야 자르기(온보딩이 남긴 값)를 되살리지 않음
      try{if(vw)cam.clearViewOffset();R.setPixelRatio(1);R.setSize(W,H,false);cam.aspect=W/H;cam.updateProjectionMatrix();setCam(cam,W/H,K,yaw,shift);
        if(K.lens)Stage.aimAt(cam.position,K.lens);  // 셀카: 목·머리·눈을 렌즈 쪽으로
        const back=pano?Stage.pano.use(pi):null;try{R.render(scene,cam)}finally{if(back)back()}g.drawImage(R.domElement,0,0,W,H)}  // 같은 작업 안에서 바로 옮겨 그림(그림판이 지워지기 전)
      finally{R.setPixelRatio(pr);R.setSize(sz.x,sz.y,false);cam.aspect=asp;if(vw)cam.setViewOffset(vw.fullWidth,vw.fullHeight,vw.offsetX,vw.offsetY,vw.width,vw.height);cam.updateProjectionMatrix();cam.position.copy(kp);cam.quaternion.copy(kq)}
    },{shadow:(((DATA.config||{}).camera||{}).photo||{}).shadow||{},place:sc.name,model});
    if(!ok)throw new Error("서아 모델이 아직 없음");
    const t1=performance.now(),type=P.type||"image/jpeg";
    const full=await Shot.encode(c,type,P.quality||.86,P.minQuality||.5,P.maxKB||300);
    if(spec.card)return{full,w:W,h:H,mid,face,ms:{render:Math.round(t1-t0),encode:Math.round(performance.now()-t1)}};
    const thumb=await Shot.encode(Shot.scaled(c,P.thumbPx||400),type,P.thumbQuality||.72,.4,P.thumbMaxKB||60);
    st().lastMid=mid;
    return{full,thumb,w:W,h:H,mid,face,yaw,shift,ms:{render:Math.round(t1-t0),encode:Math.round(performance.now()-t1)}};
    }finally{if(pin)Stage.use(pin,-1);Stage.pano.done(pi)}
  }

  // ── 보낼 사진 고르기(원고에서만) ──
  const bundleOf=n=>((D().casual||{}).bundles||[]).findIndex(b=>(b.stages||[]).includes(n));
  // 같은 목록에서 바로 앞 번호는 빼고 고름
  function pickIdx(n,lastI){const a=[...Array(n).keys()];const b=n>1?a.filter(i=>i!==lastI):a;return pick(b)}
  function resolve(it){const s=st();
    if(it.type==="stage"){const x=(D().stage||[]).find(o=>o.stage===it.stage);if(!x)return null;return{...it,scene:sceneOf(x.place),shot:x.shot,msg:x.msg,name:x.name}}
    if(it.type==="away"){const L=(D().away||{}).list||[];if(!L.length)return null;const i=pickIdx(L.length,s.away);s.away=i;const x=L[i];return{...it,scene:sceneOf(x.place),shot:x.shot,msg:x.msg}}
    // 대화 중 가끔(시연 「지금 받기」도 같음): 지금 관계 단계 묶음, 지금 장소, 셀카·풍경 번갈아
    const bi=bundleOf(curStage()),B=((D().casual||{}).bundles||[])[bi];if(!B||!(B.msgs||[]).length)return null;
    const i=pickIdx(B.msgs.length,s.last[bi]);s.last[bi]=i;const shot=s.shot==="selfie"?"landscape":"selfie";s.shot=shot;
    return{...it,scene:S.scene||0,shot,msg:B.msgs[i]}}

  // ── 보내기 ──
  const stageGot=()=>Photos.list().filter(m=>m.kind==="received"&&m.stage).length;
  async function deliver(it){
    const x=resolve(it);if(!x)return;
    sending=true;renderLog();const my=GEN,t0=performance.now();
    let fps=null;
    try{
      await wait(80);  // 「보내는 중…」이 먼저 그려지게
      fps=frameWatch();
      const r=await make(x);
      const left=(D().sendingMs||1500)-(performance.now()-t0);if(left>0)await wait(left);
      const fw=fps.stop();
      if(my!==GEN)return;  // 그사이 시연 패널에서 초기화·장면 이동
      // 단계 사진은 단계마다 한 장: 시연 장면으로 다시 받으면 예전 것을 지우고 새것으로
      if(x.type==="stage"){const old=Photos.list().filter(m=>m.kind==="received"&&m.stage===x.stage);for(const m of old)await Photos.remove(m.id)}
      const sc=SCENES[x.scene]||SCENES[0];
      const meta={id:Photos.newId(),kind:"received",from:x.type,at:Date.now(),stage:x.type==="stage"?x.stage:null,title:x.name||null,msg:x.msg,
        scene:x.scene,place:sc.name,shot:x.shot,mid:r.mid,mname:MNAME[r.mid]||r.mid,liked:false,w:r.w,h:r.h};
      const sv=await Photos.add(meta,r.full,r.thumb);
      if(my!==GEN){await Photos.remove(meta.id);return}
      const s=st();if(x.type==="stage")s.got[x.stage]=meta.id;s.since=0;
      s.note=(D().serverLine||"").replace("{place}",sc.name).replace("{msg}",x.msg);
      perf.push({type:x.type,shot:x.shot,place:sc.name,mid:r.mid,face:r.face,...r.ms,save:sv.ms,kb:Math.round(r.full.size/1024),thumbKb:Math.round(r.thumb.size/1024),total:Math.round(performance.now()-t0),...fw});
      sending=false;
      addMsg("ph",x.msg,{pid:meta.id,...(x.type==="stage"?{stage:x.stage,sn:stageGot()}:{})},"seoa");
    }catch(e){console.error("서아 사진을 만들지 못함",e)}
    finally{if(fps&&fps.on)fps.stop();sending=false;renderLog()}
  }
  // 사진을 만드는 동안 대화 무대 프레임 간격(가장 긴 간격 = 멈칫한 정도)
  function frameWatch(){const o={on:true,max:0,n:0};let last=performance.now();
    (function f(now){if(!o.on)return;o.max=Math.max(o.max,now-last);o.n++;last=now;requestAnimationFrame(f)})(last);
    o.stop=()=>{o.on=false;return{frames:o.n,maxGapMs:Math.round(o.max)}};return o}

  // ── 보낼 때 고르기 ──
  // 대화방에 있고, 다른 일이 끝났을 때만 보냄: 답장 기다리는 중·인트로·해금 연출·몸짓 재생 중·카메라·온보딩이면 기다림
  const inRoom=()=>curTab==="chat"&&S.room==="seoa";
  const idle=()=>inRoom()&&!Cam.isOpen()&&!(typeof Onboard!=="undefined"&&Onboard.isOpen())&&!busy&&!unlockBusy&&!unlockQ.length&&!Stage.recentMotion(0)&&!sending;
  function kick(ms){clearTimeout(loopT);loopT=setTimeout(check,ms!=null?ms:(D().waitMs||700))}
  function check(){const s=st();if(!s.pend.length||sending)return;
    if(!inRoom())return;  // 대화방에 들어오면 enter() 가 다시 부름
    if(!idle())return kick();
    const it=s.pend.shift();save();
    // 대화 중 사진은 보낼 때 다시 확인: 시연 장면이 시작됐으면 버림
    if(it.type==="casual"&&typeof Scenes!=="undefined"&&Scenes.cur())return kick(0);
    deliver(it).then(()=>{if(st().pend.length)kick(1500)});
  }
  // 1절: 관계 단계가 n 으로 오름(stageUp). 이미 받은 단계·이미 기다리는 단계는 빼고. 대표 몸짓 연출이 끝난 뒤 보냄
  function stageUp(n){const s=st();if(!(D().stage||[]).some(o=>o.stage===n)||s.got[n]||s.pend.some(p=>p.type==="stage"&&p.stage===n))return;
    s.pend=s.pend.filter(p=>p.type==="stage");s.pend.push({type:"stage",stage:n});s.pend.sort((a,b)=>a.stage-b.stage);save();kick(D().afterStageMs||900)}
  // 2절: 서아 대화방에 들어올 때(openRoom)
  function lastTalk(){let t=0;for(const m of chatOf("seoa"))if((m.r==="u"||m.r==="c"||m.r==="ph"||m.r==="g")&&m.at)t=Math.max(t,m.at);return t}
  function enter(){const s=st(),A=D().away||{};
    const lt=lastTalk();
    if(curStage()>=(A.minStage||3)&&lt&&Date.now()-lt>=(A.hours||6)*3600e3&&!s.pend.length){s.pend.push({type:"away"});save();return kick(A.delayMs||1500)}
    if(s.pend.length)kick(A.delayMs||1500)}
  // 3절: 서아 답장마다(send). 시연 장면 중에는 세지 않음
  function afterReply(){const s=st(),C=D().casual||{};
    if(typeof Scenes!=="undefined"&&Scenes.cur())return;
    s.since=(s.since||0)+1;save();
    if(s.since<(C.minGapTurns!=null?C.minGapTurns:10)||s.pend.length)return;
    if(Math.random()<(C.chance!=null?C.chance:.2)){s.pend.push({type:"casual"});save();kick()}}
  // 시연 패널 「서아 사진 지금 받기」: 지금 단계 묶음에서 바로 한 장(대화방으로 가서)
  function now(){const s=st();s.pend=s.pend.filter(p=>p.type==="stage");s.pend.push({type:"demo"});save();kick(400)}
  // 시연 장면으로 들어갈 때: 이 장면 단계보다 위의 단계 사진 기록을 지워 예약된 단계 상승 때 다시 오게
  function sceneReset(stage){const s=st();for(const k in s.got)if(+k>stage)delete s.got[k];s.pend=[];s.since=0;s.note=null;sending=false;save()}

  // ── 서버에 알리는 한 줄(5절) ──
  const note=()=>st().note||null;
  function noteDone(){const s=st();if(s.note){s.note=null;save()}}

  // ── 대화 기록의 사진 말풍선 ──
  const stageTotal=()=>(D().stage||[]).length||5;
  function bubble(m){const p=Photos.list().find(x=>x.id===m.pid);
    const line=T("saved")+(m.stage?T("savedStage",{n:m.sn||1,total:stageTotal()}):"");
    return `<button class="phmsg${p?"":" gone"}" data-ph="${esc(m.pid||"")}" aria-label="${esc(T("aria"))}">${p?`<img src="${Photos.thumbUrl(p)}" alt="">`:""}</button>`+
      `<div class="msg c">${esc(m.t)}</div><div class="phsave">${esc(line)}</div>`}
  const sendingHtml=()=>sending?`<div class="msg c typing">${esc(T("sending"))}</div>`:"";
  function onLogClick(e){const b=e.target.closest("[data-ph]");if(!b)return;const id=b.dataset.ph;if(!Photos.list().some(x=>x.id===id))return;
    PhotoUI.view(id,Photos.list().filter(x=>x.kind==="received").map(x=>x.id))}
  function init(){const L=document.getElementById("log");if(L)L.addEventListener("click",onLogClick);
    Photos.onChange(()=>{if(inRoom())renderLog()})}

  return{init,make,deliver,stageUp,enter,afterReply,now,sceneReset,note,noteDone,bubble,sendingHtml,isSending:()=>sending,kick,perf,stageTotal,state:()=>JSON.parse(JSON.stringify(st()))};
})();
