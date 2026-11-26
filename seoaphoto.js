// moti 서아가 먼저 보내는 사진(12단계). 원고·값 data/seoa_photo.json, 화면 문구 data/ui.json seoaPhoto
// SeoaPhoto : 사진 만들기(열린 몸짓의 한 순간 + 장소, 셀카·풍경) → 대화 기록의 사진 말풍선 + 사진 저장소(종류 received)
//             68: 보내는 때는 「부재중 셀카」 하나. 서아 대화방을 떠난 지 10분(data away.minutes)이 지나면 한 장(떠난 한 번에 한 장, 이야기 줄기마다 따로).
//             81: 한 장을 보낸(예약한) 뒤에는 유저가 다시 실제 대화를 하기 전까지 더 보내지 않음(S.sp.can, 줄기마다).
//             대화방이 아닌 화면이면 앱 안 알림 배너. 단계 사진·대화 중 가끔 사진은 끔(stageUp·afterReply 는 아무것도 안 함). 시연 패널 「10분 지난 뒤 셀카 받기」
// 45-B: 셀카는 셀카 모션(x25)의 한 순간 + 폰을 든 손에 붙인 카메라(data kinds.selfie.hand·types). 모션을 못 받으면 32-B 팔 뻗기 셀카(armTypes)
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
  // 68: leave = 줄기별 떠남 {at 떠난 시각, done 이번 떠남에 이미 받음, demo 시연(단계 상관없음)}, awayLast = 바로 앞 부재중 문구 번호
  // 81: can = 줄기별 부재중 셀카를 보낼 수 있는지 {줄기: bool}(talked·arrive·initCan 참고)
  //     pend 의 부재중 사진에는 th(줄기)가 붙음 → 그 줄기에 있을 때만 그림을 만듦. 예전 저장값의 단계·대화 중 사진 차례는 버림
  const st=()=>{const s=S.sp||(S.sp={});s.got=s.got||{};s.pend=(s.pend||[]).filter(p=>p.type==="away");s.last=s.last||{};s.leave=s.leave||{};if(s.since==null)s.since=0;return s};
  const thKey=()=>typeof Thread!=="undefined"?Thread.cur():"main";
  const sceneOf=name=>{if(!name||name===(D().here||"지금 장소"))return S.scene||0;const i=SCENES.findIndex(x=>x.name===name);return i>=0?i:(S.scene||0)};  // 32: 「지금 장소」 = 지금 대화 장소
  let sending=false,silent=false,quiet=false,loopT=null;  // quiet = 사진 저장 알림으로 기록을 다시 그리지 않음(32-1)  // silent = 오랜만 사진(이미 받은 메시지로 끼워 넣음, 「보내는 중」 없음)
  const perf=[];

  // ── 사진 만들기 ──
  const filmShot=m=>((((DATA.onboarding||{}).film||{}).shots)||[]).find(s=>s.id===m);
  function moment(mid){const fs=filmShot(mid);if(fs&&fs.at!=null)return fs.at;const M=D().moment||{},bm=M.byId||{};if(bm[mid]!=null)return bm[mid];return M.default!=null?M.default:50}
  // 지금 열린 몸짓 중 하나(이 종류에서 피할 몸짓 빼고, 바로 앞 사진의 몸짓은 되도록 빼고)
  function pickMotion(K){const av=new Set(K.avoid||[]),s=st();
    if(K.mids&&K.mids.length){const m=pick(K.mids.filter(id=>id===IDLE||canPlay(id)));if(m)return m}  // 32-B 셀카: 종류마다 정한 몸 자세(팔은 따로 뻗음)
    let ids=unlockedIds().filter(id=>canPlay(id)&&!av.has(id));if(ids.length>1)ids=ids.filter(id=>id!==s.lastMid);
    return pick(ids)||IDLE}
  // 구도: 키 비율 top·bottom·width 가 들어오게 거리를 잡음(11단계 포토부스 구도와 같은 계산) + lift(위에서 내려다보기) + shift(서아를 옆으로 비킴)
  function setCam(cam,aspect,K,yaw,shift){
    const H=Stage.height(),tn=Math.tan(cam.fov*Math.PI/360),top=K.top,bot=K.bottom,cy=(top+bot)/2*H;
    const d=Math.max((top-bot)*H/2/tn,K.width*H/2/(tn*aspect)),r=yaw*Math.PI/180,o=Stage.center(K.center||0);
    const rx=Math.cos(r)*shift*H,rz=-Math.sin(r)*shift*H;  // 카메라 오른쪽 방향으로 shift 만큼(서아는 사진에서 왼쪽으로)
    cam.position.set(o.x+Math.sin(r)*d+rx,cy+(K.lift||0)*H,o.z+Math.cos(r)*d+rz);cam.lookAt(o.x+rx,cy,o.z+rz)}
  // 32-B 진짜 셀카(data/seoa_photo.json kinds.selfie.types): 종류 하나를 뽑음(직전 셀카와 같은 종류는 피함). 종류 값이 kinds.selfie 기본값을 덮음
  const range=a=>Array.isArray(a)?(a.length>1?a[0]+Math.random()*(a[1]-a[0]):a[0]||0):(+a||0);
  // 45-B: hand = 손이 폰이 되는 셀카(셀카 모션을 받았을 때, types). 못 받았으면 32-B 팔 뻗기 셀카(armTypes)
  function pickSelfie(K,id,hand){const L=(hand?K.types:K.armTypes)||[];if(!L.length)return null;const s=st();
    let t=id&&L.find(x=>x.id===id);if(!t){const c=L.length>1?L.filter(x=>x.id!==s.lastSelfie):L;t=pick(c)}
    const T={...K,...(hand?K.hand:{}),...t},sg=()=>Math.random()<.5?-1:1;
    if(hand)return{T,id:t.id,hand:true,at:range(T.at),roll:range(T.roll)*(T.rollSide?T.rollSide:sg()),side:T.side||"R",tilt:range(T.headTilt)*sg(),pitch:0,yaw:0};
    return{T,id:t.id,pitch:range(T.pitch),roll:range(T.roll)*sg(),yaw:pick(T.yaw)||0,side:pick(T.arm&&T.arm.side)||"R",tilt:range(T.headTilt)*sg()}}
  // 45-B 손이 폰이 되는 셀카 카메라: 손목에서 손끝 쪽으로 along, 얼굴 쪽으로 out(−면 얼굴에서 멀어짐), 위로 up(키 비율) 띄운 자리 = 폰 렌즈.
  //   얼굴(두 눈 사이)에서 look(키 비율)만큼 아래를 봄(얼굴이 사진 위쪽 1/3 쯤). 얼굴까지 거리가 minDist 보다 가까우면 얼굴 반대쪽으로 물림. 사진 기울기 roll°
  function setHandCam(cam,sf){const T=sf.T,H=Stage.height(),hp=Stage.handPose(sf.side);if(!hp)return false;
    const fing=hp.finger.clone().sub(hp.hand).normalize(),tof=hp.face.clone().sub(hp.hand).normalize();
    const c=hp.hand.clone().addScaledVector(fing,(T.along||0)*H).addScaledVector(tof,(T.out||0)*H);c.y+=(T.up||0)*H;
    const md=(T.minDist||0)*H,away=c.clone().sub(hp.face),dd=away.length();if(md&&dd<md)c.copy(hp.face).addScaledVector(away.normalize(),md);
    cam.position.copy(c);cam.up.set(0,1,0);const aim=new THREE.Vector3(hp.face.x,hp.face.y-(T.look||0)*H,hp.face.z);cam.lookAt(aim);
    // shift = 렌즈를 카메라 기준 [팔 반대쪽, 위]로 옮김(키 비율): 폰 렌즈는 손목보다 폰 위쪽 끝에 있으니 뻗은 팔이 사진 아래 옆 모서리로 빠지게
    const sh=T.shift||[0,0];if(sh[0]||sh[1]){const q=cam.quaternion,sx=sf.side==="L"?-1:1;cam.position.addScaledVector(new THREE.Vector3(1,0,0).applyQuaternion(q),sx*sh[0]*H).addScaledVector(new THREE.Vector3(0,1,0).applyQuaternion(q),(sh[1]||0)*H);cam.lookAt(aim)}
    if(sf.roll)cam.rotateZ(sf.roll*Math.PI/180);cam.updateMatrixWorld(true);
    sf.dist=+(cam.position.distanceTo(hp.face)/H).toFixed(3);const rel=cam.position.clone().sub(hp.face);sf.elev=+(Math.asin(rel.y/rel.length())*180/Math.PI).toFixed(1);return true}
  // 셀카 카메라: 넓은 렌즈(fov), 구도 top·bottom·width 가 들어오는 거리, 눈 높이에서 pitch° 위(살짝 내려다봄), 좌우 yaw°, 사진 기울기 roll°
  function setSelfieCam(cam,aspect,sf){const T=sf.T,H=Stage.height(),tn=Math.tan(cam.fov*Math.PI/360),cy=(T.top+T.bottom)/2*H;
    const d=Math.max((T.top-T.bottom)*H/2/tn,(T.width||0)*H/2/(tn*aspect)),o=Stage.center(T.center!=null?T.center:1),ey=Stage.eyeY();
    const p=sf.pitch*Math.PI/180,r=sf.yaw*Math.PI/180;
    cam.position.set(o.x+Math.sin(r)*Math.cos(p)*d,ey+Math.sin(p)*d,o.z+Math.cos(r)*Math.cos(p)*d);cam.lookAt(o.x,cy,o.z);
    if(sf.roll)cam.rotateZ(sf.roll*Math.PI/180);cam.updateMatrixWorld(true)}
  // 팔 끝(폰을 든 손)의 자리 = 카메라 자리에서 카메라 기준 옆(팔 쪽)·아래·뒤로 조금(키 비율). 팔은 사진 아래 옆 모서리 밖으로 나감
  function armTarget(cam,sf){const A=sf.T.arm||{},H=Stage.height(),o=A.offset||[.05,-.04,.04],sx=sf.side==="L"?1:-1;
    const q=cam.quaternion,rt=new THREE.Vector3(1,0,0).applyQuaternion(q),up=new THREE.Vector3(0,1,0).applyQuaternion(q),bk=new THREE.Vector3(0,0,1).applyQuaternion(q);
    return cam.position.clone().addScaledVector(rt,sx*o[0]*H).addScaledVector(up,o[1]*H).addScaledVector(bk,o[2]*H)}
  // spec: {scene, shot}. 돌려주는 값: 큰 사진·작은 사진(jpeg), 고른 몸짓, 걸린 시간
  // 26-1 무빙 카드(cards.js)도 이것을 씀: spec.mid 몸짓 고정 · spec.face 표정 · spec.K 구도 직접 · spec.image {aspect, longPx, quality, minQuality, maxKB} 크기 ·
  //   spec.outfit 그 의상 모델로(대화 무대의 의상은 그대로) · spec.card 면 큰 사진 한 장만(작은 사진 없음, 마지막 몸짓 기록 안 바꿈)
  async function make(spec){
    await Stage.ready;
    const P={...(((DATA.photos||{}).image)||{}),...(spec.image||{})},A=P.aspect||[3,4],H=P.longPx||1440,W=Math.round(H*A[0]/A[1]);
    const K0=spec.K||((D().kinds||{})[spec.shot])||{top:1.07,bottom:.6,width:.46},selfie=!spec.K&&spec.shot==="selfie";
    // 45-B: 셀카면 셀카 모션(kinds.selfie.hand.motion)을 받아 둠. 못 받으면 32-B 셀카(팔 뻗기)로
    const hm=selfie&&K0.hand&&K0.hand.motion,hand=!!(hm&&typeof XS!=="undefined"&&XS[hm]&&await Stage.xs(hm));
    const sf=selfie?pickSelfie(K0,spec.selfie,hand):null,K=sf?sf.T:K0,sc=SCENES[spec.scene]||SCENES[0],img=await Shot.loadImg(sc.img),pi=SCENES[spec.scene]?spec.scene:0,pano=await Stage.pano.ready(pi);  // 30: 360도 배경
    // 26-2: 다른 의상 모델은 그리는 동안 붙잡아 둠(내려놓기 prune 에서 빠짐). 다 그리면 놓고, 쓰지 않으면 바로 내려놓음
    const pin=spec.outfit&&spec.outfit!==Stage.outfitNow()?spec.outfit:null;if(pin)Stage.use(pin,1);
    try{  // 30-1: 360도 그림도 다 그릴 때까지 붙잡아 둠(끝나면 pano.done)
    const model=pin?await Stage.model(pin).catch(()=>null):null;
    const mid=sf&&sf.hand?hm:spec.mid||pickMotion(K);if(spec.mid)await Stage.xs(mid);
    // 45-B: 손 셀카의 at = 셀카 모션 원본 파일 시각(초) → 재생 시각(from 을 뺌)
    const mt=sf&&sf.hand?Math.max(0,sf.at-(XS[mid].from||0)):(spec.at!=null?spec.at:moment(mid))/100*Stage.dur(mid),ff=filmShot(mid),faces=K.faces||["soft"],face=spec.face||(ff&&faces.includes(ff.face)?ff.face:pick(faces));
    const yaw=pick(K.yaw)||0,shift=pick(K.shift)||0,bgX=pick(K.bgX);
    // 32-A: 확대(View)가 커지거나 줄어드는 중이면 끝날 때까지 미룸(그림판 크기가 매 프레임 바뀌는 중에 크기를 빌리지 않게)
    for(let i=0;i<20&&typeof View!=="undefined"&&View.moving&&View.moving()>0;i++)await wait(View.moving()+60);
    const t0=performance.now(),c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
    g.fillStyle="#140a24";g.fillRect(0,0,W,H);if(img&&!pano){Shot.cover(g,img,W,H,bgX!=null?bgX:.5,.4);Shot.dimLayer(g,W,H)}
    const ok=Stage.still(mid,mt,face,()=>{
      const {R,scene,cam}=Stage.three(),pr=R.getPixelRatio(),sz=R.getSize(new THREE.Vector2()),asp=cam.aspect,fov=cam.fov,kp=cam.position.clone(),kq=cam.quaternion.clone(),vw=cam.view&&cam.view.enabled?{...cam.view}:null;  // 32-A: 꺼진 시야 자르기(온보딩이 남긴 값)를 되살리지 않음
      const near=cam.near;let unhide=null;
      try{if(vw)cam.clearViewOffset();R.setPixelRatio(1);R.setSize(W,H,false);cam.aspect=W/H;if(sf&&K.fov)cam.fov=K.fov;if(sf&&sf.hand&&K.near)cam.near=K.near;cam.updateProjectionMatrix();
        if(sf&&sf.hand){if(!setHandCam(cam,sf))throw new Error("손 뼈가 없음");unhide=Stage.hideBones(K.hide)}  // 45-B: 카메라 = 폰을 든 손. 가리는 뼈는 숨김(data hide)
        else if(sf){setSelfieCam(cam,W/H,sf);Stage.reach(sf.side,armTarget(cam,sf),K.arm||{})}else setCam(cam,W/H,K,yaw,shift);
        if(K.lens)Stage.aimAt(cam.position,K.lens);  // 셀카: 목·머리·눈을 렌즈 쪽으로
        if(sf&&sf.tilt)Stage.tiltHead(sf.tilt,cam.position);
        const back=Stage.pano.use(pano?pi:-1);/* 32-C: 360도 그림이 없는 장소면 지금 장소의 구를 모두 숨김(평평한 그림이 가려지지 않게) */try{R.render(scene,cam)}finally{if(back)back()}g.drawImage(R.domElement,0,0,W,H)}  // 같은 작업 안에서 바로 옮겨 그림(그림판이 지워지기 전)
      finally{if(unhide)unhide();R.setPixelRatio(pr);R.setSize(sz.x,sz.y,false);cam.aspect=asp;cam.fov=fov;cam.near=near;cam.up.set(0,1,0);if(vw)cam.setViewOffset(vw.fullWidth,vw.fullHeight,vw.offsetX,vw.offsetY,vw.width,vw.height);cam.updateProjectionMatrix();cam.position.copy(kp);cam.quaternion.copy(kq)}
    },{shadow:(((DATA.config||{}).camera||{}).photo||{}).shadow||{},place:sc.name,model});
    if(!ok)throw new Error("서아 모델이 아직 없음");
    const t1=performance.now(),type=P.type||"image/jpeg";
    const full=await Shot.encode(c,type,P.quality||.86,P.minQuality||.5,P.maxKB||300);
    if(spec.card)return{full,w:W,h:H,mid,face,ms:{render:Math.round(t1-t0),encode:Math.round(performance.now()-t1)}};
    const thumb=await Shot.encode(Shot.scaled(c,P.thumbPx||400),type,P.thumbQuality||.72,.4,P.thumbMaxKB||60);
    st().lastMid=mid;if(sf)st().lastSelfie=sf.id;
    return{full,thumb,w:W,h:H,mid,face,yaw:sf?sf.yaw:yaw,shift,selfie:sf?{type:sf.id,hand:!!sf.hand,side:sf.side,...(sf.hand?{at:+sf.at.toFixed(2),dist:sf.dist,elev:sf.elev}:{pitch:+sf.pitch.toFixed(1)}),roll:+sf.roll.toFixed(1),tilt:+sf.tilt.toFixed(1)}:null,ms:{render:Math.round(t1-t0),encode:Math.round(performance.now()-t1)}};
    }finally{if(pin)Stage.use(pin,-1);Stage.pano.done(pi)}
  }

  // ── 보낼 사진 고르기(원고에서만) ──
  const bundleOf=n=>((D().casual||{}).bundles||[]).findIndex(b=>(b.stages||[]).includes(n));
  // 같은 목록에서 바로 앞 번호는 빼고 고름
  function pickIdx(n,lastI){const a=[...Array(n).keys()];const b=n>1?a.filter(i=>i!==lastI):a;return pick(b)}
  // 32-B: 사진 종류 비중(data shotWeight). pref 의 비중이 0 보다 크면 그대로, 아니면 비중대로 뽑음
  const weights=()=>D().shotWeight||{selfie:1,landscape:1};
  function shotOf(pref){const w=weights();if(pref&&(w[pref]==null||w[pref]>0))return pref;
    const L=Object.keys(w).filter(k=>w[k]>0),sum=L.reduce((a,k)=>a+w[k],0);let r=Math.random()*sum;for(const k of L){r-=w[k];if(r<0)return k}return L[0]||"selfie"}
  function resolve(it){const s=st();
    if(it.type==="stage"){const x=(D().stage||[]).find(o=>o.stage===it.stage);if(!x)return null;return{...it,scene:sceneOf(x.place),shot:shotOf(x.shot),msg:x.msg,name:x.name}}
    if(it.type==="away"){const A=D().away||{},L=A.lines||[];if(!L.length)return null;const i=pickIdx(L.length,s.awayLast);s.awayLast=i;return{...it,scene:sceneOf(A.place),shot:shotOf(A.shot||"selfie"),msg:L[i]}}  // 68: 바로 앞 문구는 빼고
    // 대화 중 가끔(시연 「지금 받기」도 같음): 지금 관계 단계 묶음, 지금 장소, 셀카·풍경 번갈아
    const bi=bundleOf(curStage()),B=((D().casual||{}).bundles||[])[bi];if(!B||!(B.msgs||[]).length)return null;
    const i=pickIdx(B.msgs.length,s.last[bi]);s.last[bi]=i;const alt=s.shot==="selfie"?"landscape":"selfie",shot=shotOf(alt);s.shot=shot;  // 번갈아(비중 0 인 종류는 건너뜀)
    return{...it,scene:S.scene||0,shot,msg:B.msgs[i]}}

  // ── 보내기 ──
  const stageGot=()=>Photos.list().filter(m=>m.kind==="received"&&m.stage).length;
  async function deliver(it){
    const x=it.pid?it:resolve(it);if(!x)return;  // 32-1: 오랜만 사진은 들어갈 때(enter) 이미 골라 자리까지 잡아 둠
    const away=x.type==="away"&&x.at;sending=true;silent=!!away;if(!away)renderLog();const my=GEN,t0=performance.now();
    let fps=null;
    try{
      await wait(80);  // 「보내는 중…」이 먼저 그려지게
      fps=frameWatch();
      const r=await make(x);
      const left=away?0:(D().sendingMs||1500)-(performance.now()-t0);if(left>0)await wait(left);
      const fw=fps.stop();
      if(my!==GEN)return;  // 그사이 시연 패널에서 초기화·장면 이동
      if(typeof End!=="undefined"&&End.locked()){if(x.type==="stage"){st().pend.unshift(it);save()}return}  // 51: 그사이 실패해 잠김 → 단계 사진은 다시 기다리고, 그 밖은 버림
      // 단계 사진은 단계마다 한 장: 시연 장면으로 다시 받으면 예전 것을 지우고 새것으로
      if(x.type==="stage"){const old=Photos.list().filter(m=>m.kind==="received"&&m.stage===x.stage);for(const m of old)await Photos.remove(m.id)}
      const sc=SCENES[x.scene]||SCENES[0];
      const meta={id:x.pid||Photos.newId(),kind:"received",from:x.type,at:away?x.at:Date.now(),stage:x.type==="stage"?x.stage:null,title:x.name||null,msg:x.msg,
        scene:x.scene,place:sc.name,shot:x.shot,mid:r.mid,mname:MNAME[r.mid]||r.mid,liked:false,w:r.w,h:r.h};
      quiet=!!away;let sv;try{sv=await Photos.add(meta,r.full,r.thumb)}finally{quiet=false}
      if(my!==GEN){await Photos.remove(meta.id);return}
      const s=st();if(x.type==="stage")s.got[x.stage]=meta.id;s.since=0;
      const ln=((away&&D().serverLineAway)||D().serverLine||"").replace("{place}",sc.name).replace("{msg}",x.msg);
      const nk=x.th||thKey(),ns=s.notes||(s.notes={});ns[nk]=[...(ns[nk]||[]),ln].slice(-3);  // 68: 줄기마다 따로. 대화하기 전에 여러 장을 받았으면 최근 3줄까지(줄 모양은 그대로)
      perf.push({type:x.type,shot:x.shot,selfie:r.selfie,place:sc.name,mid:r.mid,face:r.face,...r.ms,save:sv.ms,kb:Math.round(r.full.size/1024),thumbKb:Math.round(r.thumb.size/1024),total:Math.round(performance.now()-t0),...fw});
      sending=false;silent=false;
      if(away)fill(meta.id);
      else addMsg("ph",x.msg,{pid:meta.id,...(x.type==="stage"?{stage:x.stage,sn:stageGot()}:{})},"seoa");
    }catch(e){console.error("서아 사진을 만들지 못함",e);if(away){for(const m of msgsOf(x.pid))delete m.wait;save();silent=false}}  // 32-1: 못 만들면 자리를 거둠(말풍선·시각만)
    finally{if(fps&&fps.on)fps.stop();sending=false;if(!silent)renderLog();silent=false}
  }
  // 32-1: 자리만 잡아 둔 오랜만 사진 말풍선에 그림을 조용히 채움(기록을 다시 그리지 않음 → 스크롤·자리 그대로)
  // 81: 사진 말풍선은 그 사진을 예약한 줄기의 기록에 있음(만드는 사이 줄기를 바꿨으면 S.threads 쪽) → 다른 줄기 기록에 넣지 않고 그 자리만 찾음
  function msgsOf(pid){const out=[],seen=new Set(),scan=L=>{if(!L||seen.has(L))return;seen.add(L);for(const x of L)if(x.pid===pid)out.push(x)};
    for(const k in S.chats)scan(S.chats[k]);for(const k in (S.threads||{}))scan(S.threads[k].chat);return out}
  function fill(pid){const p=Photos.list().find(x=>x.id===pid);let ch=false;for(const m of msgsOf(pid))if(m.wait){delete m.wait;ch=true}if(ch)save();
    const b=p&&document.querySelector(`#log .phmsg[data-ph="${CSS.escape(pid)}"]`);if(!b)return;
    b.classList.remove("wait");b.innerHTML=`<img src="${Photos.thumbUrl(p)}" alt="">`}
  // 32: 대화 기록의 그 시각 자리에 끼워 넣음(addMsg 는 맨 끝에 붙임). 대화방에 있으면 읽은 것으로
  function insertMsg(m,cid){const L=chatOf(cid);if(L.some(x=>x.pid&&x.pid===m.pid))return;let i=L.length;while(i>0&&(L[i-1].at||0)>m.at)i--;L.splice(i,0,m);
    if(L.length>60)S.chats[cid]=L.slice(-60);if(S.room===cid&&curTab==="chat")S.read[cid]=chatOf(cid).length;save();if(S.room===cid)renderLog();renderUnread()}
  // 말풍선 옆 시각: 오늘이면 「오후 11:42」, 어제면 「어제 오후 11:42」, 그 전이면 「11월 22일 오후 11:42」(문구 data/ui.json seoaPhoto)
  function timeLabel(t){const d=new Date(t),h=d.getHours(),hm=T("time",{ap:T(h<12?"am":"pm"),h:h%12||12,mm:String(d.getMinutes()).padStart(2,"0")});
    const day=x=>{const y=new Date(x);y.setHours(0,0,0,0);return y.getTime()},k=Math.round((day(Date.now())-day(t))/864e5);
    return k<=0?hm:k===1?T("yesterday",{time:hm}):T("date",{m:d.getMonth()+1,d:d.getDate(),time:hm})}
  // 사진을 만드는 동안 대화 무대 프레임 간격(가장 긴 간격 = 멈칫한 정도)
  function frameWatch(){const o={on:true,max:0,n:0};let last=performance.now();
    (function f(now){if(!o.on)return;o.max=Math.max(o.max,now-last);o.n++;last=now;requestAnimationFrame(f)})(last);
    o.stop=()=>{o.on=false;return{frames:o.n,maxGapMs:Math.round(o.max)}};return o}

  // ── 보낼 때 고르기 ──
  // 대화방에 있고, 다른 일이 끝났을 때만 보냄: 답장 기다리는 중·인트로·해금 연출·몸짓 재생 중·카메라·온보딩이면 기다림
  const inRoom=()=>curTab==="chat"&&S.room==="seoa";
  const idle=()=>inRoom()&&!Cam.isOpen()&&!(typeof Onboard!=="undefined"&&Onboard.isOpen())&&!busy&&!unlockBusy&&!unlockQ.length&&!Stage.recentMotion(0)&&!sending;
  function kick(ms){clearTimeout(loopT);loopT=setTimeout(check,ms!=null?ms:(D().waitMs||700))}
  // 68: 부재중 사진(th 가 지금 줄기인 것)만. 다른 줄기의 것은 그 줄기 대화방에 들어올 때
  function check(){const s=st();if(sending)return;const k=thKey(),i=s.pend.findIndex(p=>(p.th||"main")===k);if(i<0)return;
    if(!inRoom())return;  // 대화방에 들어오면 enter() 가 다시 부름
    if(typeof End!=="undefined"&&End.locked())return;  // 51: 실패해 잠긴 줄기에는 안 보냄
    if(!idle())return kick();
    const it=s.pend.splice(i,1)[0];save();
    deliver(it).then(()=>{if(st().pend.length)kick(1500)});
  }
  // 68: 단계 사진·대화 중 가끔 사진은 끔(호출 자리는 index.html 에 남김)
  function stageUp(){}
  function afterReply(){}

  // ── 68 부재중 셀카 ──
  const AW=()=>D().away||{};
  const gapMs=()=>(AW().minutes!=null?AW().minutes:10)*60e3;
  const stageNow=()=>typeof EpStage!=="undefined"&&EpStage.on()?EpStage.n():curStage();
  // 끝난 줄기: 실패해 잠김(End) · 그 줄기의 장면 엔딩을 받음(크리스마스 6단계 = xmasWin, data/endings.json when.scene)
  function ended(k){if(typeof End!=="undefined"&&End.locked(k))return true;const got=S.endings||{};
    return ((((DATA.endings||{}).when||{}).scene)||[]).some(w=>w.thread===k&&got[w.ending])}
  // 81: can = 줄기별 부재중 셀카를 보낼 수 있는지 {줄기: true|false}. 실제 대화(talked: send() 가 내 말을 기록한 때)에서만 true,
  //     셀카를 예약(arrive)하는 순간 false → 다음 실제 대화 전까지 떠남 타이머도 시작하지 않음. 입장·이동·새로고침·인사·선물·포즈·밤 넘기기·되감기로는 안 바뀜
  const realTalk=m=>!!m&&m.r==="u"&&!m.gift&&!m.srv&&!m.poseAsk;  // 선물(gift·srv)·포즈 부탁(poseAsk) 줄은 실제 대화가 아님
  const chatTh=k=>k===thKey()?(S.chats.seoa||[]):(((S.threads||{})[k]||{}).chat||[]);
  // 예전 저장값(can 이 없는 줄기): 마지막 실제 대화 뒤에 부재중 사진·예약 사진·이번 떠남에 받음(leave.done)이 있으면 false. 실제 대화가 없으면 false
  function initCan(k){const s=st(),L=chatTh(k);let u=-1;for(let i=L.length-1;i>=0;i--)if(realTalk(L[i])){u=i;break}
    if(u<0)return false;const ut=L[u].at||0;
    if(L.some((m,i)=>m.r==="ph"&&m.away&&(i>u||(m.at||0)>=ut)))return false;
    if(s.pend.some(p=>p.type==="away"&&(p.th||"main")===k))return false;
    if(s.leave[k]&&s.leave[k].done)return false;
    return true}
  function canOf(k){const s=st(),c=s.can||(s.can={});if(c[k]==null){c[k]=initCan(k);save()}return c[k]}
  function setCan(k,v){const s=st();(s.can||(s.can={}))[k]=v;save()}
  // send(): 입력 제한·밤 넘기기 관문을 지나 내 말이 기록된 때(선물·포즈 부탁·밤 넘기기 요청은 부르지 않음)
  function talked(){setCan(thKey(),true)}
  // 81: 떠난 시각은 이미 세는 중이면 덮어쓰지 않음(백그라운드·pagehide 가 겹쳐 불러도). 보낼 수 없는 줄기면 세지 않음
  function markLeave(k){const s=st();if(s.leave[k]||!canOf(k))return;s.leave[k]={at:Date.now()};save()}
  // 지금 줄기에서 이번 떠남의 셀카를 받을 때인지(시연 demo 는 단계·can 상관없음)
  function due(){const k=thKey(),L=st().leave[k];
    return !!(L&&!L.done&&Date.now()-L.at>=gapMs()&&(L.demo||(canOf(k)&&stageNow()>=(AW().minStage||2)))&&!ended(k))}
  // 받은 시각(떠난 시각 + minutes 분) 자리에 말풍선·시각과 사진 자리를 넣고, 그림은 대화방에서 만듦(fill). 앱이 꺼져 있었어도 그 시각
  // 81: 예약하는 순간 이 줄기는 보낼 수 없음(그림을 만드는 중·실패해도 다음 실제 대화 전까지 다시 예약 안 함)
  function arrive(){const s=st(),k=thKey(),L=s.leave[k];setCan(k,false);
    const x=resolve({type:"away",at:L.at+gapMs(),th:k});L.done=true;if(!x){save();return null}
    x.pid=Photos.newId();s.pend.unshift(x);insertMsg({r:"ph",t:x.msg,at:x.at,pid:x.pid,away:1,wait:1},"seoa");save();return x}
  // 대화방에 들어올 때(openRoom) · 대화방에서 앱이 다시 앞으로 올 때: 받을 때면 넣고, 이번 떠남은 끝(다시 떠나야 다음 한 장)
  function enter(){const s=st(),k=thKey();wasIn=true;inTh=k;
    if(due())arrive();
    if(s.leave[k]){delete s.leave[k];save()}
    if(s.pend.some(p=>(p.th||"main")===k))kick(AW().delayMs!=null?AW().delayMs:300)}
  // 대화방을 나가면(1초마다 살핌) 떠난 시각. 대화방이 아닌 화면이면 10분이 된 때 배너
  let wasIn=false,inTh=null,banT=[];
  const blocked=()=>(typeof Onboard!=="undefined"&&Onboard.isOpen());
  function tick(){if(document.hidden)return;
    if(inRoom()){wasIn=true;inTh=thKey();return}
    if(wasIn){wasIn=false;markLeave(inTh||thKey())}
    if(!blocked()&&due()){const x=arrive();if(x)banner(x.msg)}}
  function onVis(){
    if(document.hidden){if(inRoom()){markLeave(thKey());wasIn=false}return}  // 대화방에 있다가 백그라운드로
    if(inRoom()){enter();return}  // 대화방 그대로 앞으로: 들어온 것과 같음
    tick()}
  // ── 앱 안 알림 배너 ──
  function banner(msg){const A=AW();let b=document.getElementById("spBanner");
    if(!b){b=document.createElement("button");b.id="spBanner";b.type="button";b.className="spban";(document.querySelector(".app")||document.body).appendChild(b);
      b.addEventListener("click",()=>{hideBanner();if(typeof setTab==="function"){setTab("chat");openRoom("seoa")}})}
    const c=(typeof chBy==="function"&&chBy("seoa"))||{};banT.forEach(clearTimeout);banT=[];
    b.innerHTML=`<span class="spav" style="background-image:url('${esc(c.img||"")}')"></span><span class="sptx"><b>${esc(T("bannerName"))}</b><span class="spl">${esc(T("banner"))}</span></span>`;
    b.classList.remove("on");void b.offsetWidth;b.classList.add("on");
    banT.push(setTimeout(()=>{const l=b.querySelector(".spl");if(l)l.textContent=msg},A.bannerSwapMs!=null?A.bannerSwapMs:1500));
    banT.push(setTimeout(hideBanner,A.bannerMs!=null?A.bannerMs:4000))}
  function hideBanner(){banT.forEach(clearTimeout);banT=[];const b=document.getElementById("spBanner");if(b)b.classList.remove("on")}
  // 시연 패널 「10분 지난 뒤 셀카 받기」: 지금 줄기의 떠난 시각을 demoMinutes 분 전으로(단계 상관없음). 대화방이면 홈으로 나가고 배너
  function now(){const s=st(),k=thKey();if(inRoom())setTab("home");wasIn=false;
    s.leave[k]={at:Date.now()-(AW().demoMinutes||11)*60e3,demo:1};save();setTimeout(tick,300)}
  // 시연 장면으로 들어갈 때: 이 장면 단계보다 위의 단계 사진 기록을 지움(예전 값), 기다리던 사진은 버림
  // 81: 그 줄기의 처음부터(되감기 처음부터·시연 에피소드 처음부터·서아 초기화): 보낼 수 있음·떠난 시각·예약 사진·서버 한 줄을 지움(can 은 빈 기록으로 다시 정함 → false)
  function resetThread(k){const s=st();if(s.can)delete s.can[k];delete s.leave[k];s.pend=s.pend.filter(p=>(p.th||"main")!==k);if(s.notes)delete s.notes[k];save()}
  function sceneReset(stage){const s=st();for(const k in s.got)if(+k>stage)delete s.got[k];s.pend=[];s.since=0;s.note=null;s.notes={};sending=false;save()}

  // ── 서버에 알리는 한 줄(5절) ──
  // 68: 지금 줄기의 줄만(예전 저장값 note 는 지금 줄기 것으로 봄)
  function note(){const s=st(),L=(s.notes||{})[thKey()]||[];return [s.note,...L].filter(Boolean).join("\n")||null}
  function noteDone(){const s=st();if(s.note||(s.notes||{})[thKey()]){s.note=null;if(s.notes)delete s.notes[thKey()];save()}}

  // ── 대화 기록의 사진 말풍선 ──
  const stageTotal=()=>(D().stage||[]).length||5;
  // 68: 부재중 셀카(away)는 카톡처럼 사진 말풍선 → 바로 아래 문구 말풍선 두 개, 받은 시각은 문구 옆 하나(저장 알림 줄 없음)
  function bubble(m){const p=Photos.list().find(x=>x.id===m.pid),hold=!p&&m.wait;  // 32-1: wait = 그림을 만드는 중(자리만)
    const line=m.away?"":T("saved")+(m.stage?T("savedStage",{n:m.sn||1,total:stageTotal()}):"");
    const msg=m.away?`<div class="phrow"><div class="msg c">${esc(m.t)}</div><span class="phtime">${esc(timeLabel(m.at))}</span></div>`:`<div class="msg c">${esc(m.t)}</div>`;  // 32: 오랜만 사진은 받은 시각을 말풍선 옆에
    return `<button class="phmsg${p?"":hold?" wait":" gone"}" data-ph="${esc(m.pid||"")}" aria-label="${esc(T("aria"))}">${p?`<img src="${Photos.thumbUrl(p)}" alt="">`:""}</button>`+
      msg+(line?`<div class="phsave">${esc(line)}</div>`:"")}
  const sendingHtml=()=>sending&&!silent?`<div class="msg c typing">${esc(T("sending"))}</div>`:"";
  function onLogClick(e){const b=e.target.closest("[data-ph]");if(!b)return;const id=b.dataset.ph;if(!Photos.list().some(x=>x.id===id))return;
    PhotoUI.view(id,Photos.list().filter(x=>x.kind==="received").map(x=>x.id))}
  function init(){const L=document.getElementById("log");if(L)L.addEventListener("click",onLogClick);
    Photos.onChange(()=>{if(inRoom()&&!quiet)renderLog()});
    for(const k of new Set(["main",thKey(),...Object.keys(S.threads||{})]))canOf(k);  // 81: 예전 저장값의 줄기별 처음 상태를 한 번 정해 저장
    wasIn=inRoom();inTh=thKey();setInterval(tick,AW().checkMs||1000);document.addEventListener("visibilitychange",onVis);window.addEventListener("pagehide",()=>{if(inRoom())markLeave(thKey())})}

  return{init,make,deliver,stageUp,enter,afterReply,now,sceneReset,talked,resetThread,note,noteDone,bubble,sendingHtml,timeLabel,tick,isSending:()=>sending,awayPending:()=>st().pend.some(p=>p.type==="away"),kick,perf,stageTotal,state:()=>JSON.parse(JSON.stringify(st()))};
})();
