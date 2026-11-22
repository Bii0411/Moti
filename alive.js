// moti 서아를 살아 있게(4-2A): 머리카락 흔들림, 숨쉬기·무게중심 이동, 시선. 값은 data/look.json seoa.alive
// 모두 몸짓(motion.js RIG.pose) 위에 "더하는" 작은 움직임이다. 매 프레임 몸짓이 뼈를 다시 세운 뒤에 부른다.
// 회전 값은 motion.js 와 같은 기준(모델의 기본 자세 기준 +X = 캐릭터 왼쪽, +Y = 위, +Z = 카메라 쪽)으로 준다.
const Alive=(()=>{
  const V=THREE.Vector3,Q=THREE.Quaternion,DEG=Math.PI/180;
  const sm=x=>x<=0?0:x>=1?1:x*x*(3-2*x);
  const tmpQ=new Q(),tmpQ2=new Q(),tmpV=new V(),tmpV2=new V(),tmpS=new V(),tmpP=new V(),tmpM=new THREE.Matrix4();
  const AX={x:new V(1,0,0),y:new V(0,1,0),z:new V(0,0,1)};
  let md=null,cfg=null,restW={},restL={},hair=[],scale=1,last=0;
  // 상태: 숨·흔들림 위상, 시선(지금 값·목표), 잠깐 흔들리는 시선, 피하는 쪽
  const st={sway:0,swayT:7,eyeY:0,eyeP:0,headY:0,headP:0,jitY:0,jitP:0,jitUntil:0,jitNext:2,avSide:1,wasAvert:false,headW:1};
  const rad=(v,d)=>(v!=null?v:d)*DEG;
  // 기본 자세 기준 회전(D)을 뼈에 더한다: local ← local · (W⁻¹ · D · W). motion.js 와 같은 방식이라 몸짓 위에 그대로 얹힌다
  function addRot(b,D){const w=restW[b.name];if(!w)return;tmpQ2.copy(w).invert().multiply(D).multiply(w);b.quaternion.multiply(tmpQ2)}
  const rotQ=(ax,a)=>new Q().setFromAxisAngle(AX[ax],a);
  function init(model,c){
    md=model;cfg=c||{};hair=[];restW={};restL={};
    for(const n in md.rest){const r=md.rest[n];restW[n]=new Q(r.world[0],r.world[1],r.world[2],r.world[3]);restL[n]=new Q(r.local[0],r.local[1],r.local[2],r.local[3])}
    // 머리카락: 이름이 J_Sec_Hair 로 시작하는 뼈 사슬(머리 Head 에 붙은 가닥 15개). 끝점(_end)은 제외.
    // 가닥마다 [뿌리 → 끝] 뼈 목록, 기본 자세에서 늘어진 방향(hang), 길이(L)
    md.root.updateMatrixWorld(true);
    const isHair=o=>o&&o.isBone&&/^J_Sec_Hair\d+_\d+$/.test(o.name);
    (md.bones.Head?md.bones.Head.children:[]).filter(isHair).forEach(r=>{
      const bones=[];let o=r;while(isHair(o)){bones.push(o);o=o.children.find(c=>/^J_Sec_Hair/.test(c.name))}
      const p0=r.getWorldPosition(new V()),p1=(o||bones[bones.length-1]).getWorldPosition(new V());
      const n=bones.length,w=bones.map((b,i)=>(i+1)/(n*(n+1)/2));   // 끝으로 갈수록 더 휨(합 = 1 → 끝의 각도 = θ)
      hair.push({bones,w,hang:p1.clone().sub(p0).normalize(),L:Math.max(.02,p0.distanceTo(p1)),root:r,
        f:1+(Math.random()*2-1)*.1,th:new V(),v:new V(),pp:null});
    });
    last=0;
    return{hairStrands:hair.length,hairBones:hair.reduce((n,h)=>n+h.bones.length,0),eyes:!!(md.bones.J_Adj_L_FaceEye&&md.bones.J_Adj_R_FaceEye)};
  }
  // ── 숨쉬기 + 무게중심 이동 ──
  function body(dt,t,k){
    const br=cfg.breath||{},sw=cfg.sway||{},B=md.bones;
    const s=Math.sin(t*2*Math.PI/(br.periodSec||4));          // 숨: 들이쉴 때 +
    const up=.5+.5*s;
    if(B.Spine02)addRot(B.Spine02,rotQ("x",-rad(br.chestDeg,.8)*s*k));   // 가슴을 살짝 젖혔다 폄(오르내림)
    if(B.Spine01)addRot(B.Spine01,rotQ("x",-rad(br.chestDeg,.8)*.4*s*k));
    const sh=rad(br.shoulderDeg,.6)*up*k;                      // 어깨가 아주 조금 올라감
    if(B.LeftShoulder)addRot(B.LeftShoulder,rotQ("z",sh));
    if(B.RightShoulder)addRot(B.RightShoulder,rotQ("z",-sh));
    // 무게중심: 6~8초 주기(한 바퀴마다 주기를 새로 뽑음)로 골반이 살짝 기울고 상체는 반대로 세워 좌우로 옮겨 감
    const p=sw.periodSec||[6,8];
    st.sway+=dt*2*Math.PI/st.swayT;if(st.sway>2*Math.PI){st.sway-=2*Math.PI;st.swayT=p[0]+Math.random()*(p[1]-p[0])}
    const w=Math.sin(st.sway);
    if(B.Hips)addRot(B.Hips,rotQ("z",rad(sw.hipDeg,.6)*w*k));
    if(B.Spine)addRot(B.Spine,rotQ("z",-rad(sw.hipDeg,.6)*(sw.counter!=null?sw.counter:.8)*w*k));
    md.root.position.x+=(sw.shiftCm!=null?sw.shiftCm:.4)/100*w*k;
  }
  // ── 시선 ──
  // o.cam: 카메라, o.avert: 피하기(감정·몸짓), o.big: 3D 확대 중
  function gaze(dt,t,o,k){
    const g=cfg.gaze||{},B=md.bones,H=B.Head,EL=B.J_Adj_L_FaceEye,ER=B.J_Adj_R_FaceEye;
    if(!H||!EL||!ER||!o.cam)return;
    md.root.updateMatrixWorld(true);
    // 머리가 지금 몸짓 때문에 향한 방향 F(기본 자세 대비)
    H.matrixWorld.decompose(tmpP,tmpQ,tmpS);
    const F=tmpQ.multiply(tmpQ2.copy(restW.Head).invert());
    const eye=EL.getWorldPosition(tmpV).add(ER.getWorldPosition(tmpV2)).multiplyScalar(.5);
    const d=o.cam.position.clone().sub(eye).applyQuaternion(F.clone().invert());
    let ty=Math.atan2(d.x,d.z),tp=-Math.atan2(d.y,Math.hypot(d.x,d.z));   // 카메라 쪽 (yaw: + 캐릭터 왼쪽, pitch: + 아래)
    // 피하기: 카메라에서 옆으로·조금 아래로
    if(o.avert&&!st.wasAvert)st.avSide=Math.random()<.5?-1:1;
    st.wasAvert=!!o.avert;
    if(o.avert){ty+=st.avSide*rad(g.avertYawDeg,30);tp+=rad(g.avertPitchDeg,8)}
    else{
      // 사람처럼 2~5초마다 아주 작게 시선이 흔들렸다 돌아옴
      const j=g.jitter||{};
      if(t>st.jitNext){const a=rad(j.deg,2.5);st.jitY=(Math.random()*2-1)*a;st.jitP=(Math.random()*2-1)*a*.6;
        st.jitUntil=t+(j.holdSec||[.25,.6])[0]+Math.random()*((j.holdSec||[.25,.6])[1]-(j.holdSec||[.25,.6])[0]);
        const ev=j.everySec||[2,5];st.jitNext=t+ev[0]+Math.random()*(ev[1]-ev[0])}
      if(t<st.jitUntil){ty+=st.jitY;tp+=st.jitP}
    }
    // 머리는 눈 움직임의 headFollow(30%)만. 몸짓이 머리를 크게 돌리면(F 각도) 그만큼 줄인다
    const dev=2*Math.acos(Math.min(1,Math.abs(F.w)));
    const rd=g.reduceDeg||[8,25];
    let hw=(1-sm((dev-rd[0]*DEG)/((rd[1]-rd[0])*DEG)))*(o.big?(cfg.bigScale!=null?cfg.bigScale:.4):1);
    st.headW+=(hw-st.headW)*(1-Math.exp(-dt*4));hw=st.headW;
    const hf=g.headFollow!=null?g.headFollow:.3;
    const cl=(x,m)=>Math.max(-m,Math.min(m,x));
    const thy=cl(ty*hf,rad(g.headMaxDeg,12))*hw,thp=cl(tp*hf,rad(g.headMaxDeg,12)*.6)*hw;
    const tey=cl(ty-thy,rad(g.eyeMaxYawDeg,12)),tep=cl(tp-thp,rad(g.eyeMaxPitchDeg,8));
    const ke=1-Math.exp(-dt*(g.eyeSpeed||16)),kh=1-Math.exp(-dt*(g.headSpeed||3));
    st.eyeY+=(tey-st.eyeY)*ke;st.eyeP+=(tep-st.eyeP)*ke;st.headY+=(thy-st.headY)*kh;st.headP+=(thp-st.headP)*kh;
    addRot(H,rotQ("y",st.headY).multiply(rotQ("x",st.headP)));
    const De=rotQ("y",st.eyeY).multiply(rotQ("x",st.eyeP));
    addRot(EL,De);addRot(ER,De);
  }
  // ── 머리카락: 가닥마다 감쇠 스프링 하나 ──
  // 머리가 돌거나 움직이면 그만큼 가닥이 반대로 밀려(늦게 따라옴) 스프링이 제자리로 당기며 몇 번 흔들리다 멈춘다.
  // θ = 머리 기준 가닥 끝의 회전(라디안 벡터). 뼈마다 끝으로 갈수록 더 휘게 나눠 준다.
  const STEP=1/60;
  let acc=0,Fprev=null;
  const tq=new Q(),tv=new V(),tv2=new V();
  function hairAll(dt){
    const c=cfg.hair||{};if(c.on===false||!hair.length||!md.bones.Head)return;
    const H=md.bones.Head;H.updateMatrixWorld(true);
    H.matrixWorld.decompose(tmpP,tmpQ,tmpS);
    const F=tmpQ.clone().multiply(tmpQ2.copy(restW.Head).invert());   // 머리가 지금 향한 회전(기본 자세 대비)
    const Fi=F.clone().invert();
    const jump=dt>.5||!Fprev;                                        // 처음이거나 오래 멈췄다 돌아오면 제자리에서 다시 시작
    // 머리 회전 변화(머리 기준 축) → 가닥은 반대로
    let dRot=new V();
    if(!jump){   // Fprev⁻¹·F
      tq.copy(Fprev).invert().multiply(F);
      const a=2*Math.acos(Math.min(1,Math.abs(tq.w)));
      if(a>1e-6){const sgn=tq.w<0?-1:1;dRot.set(tq.x,tq.y,tq.z).normalize().multiplyScalar(a*sgn)}}
    Fprev=F.clone();
    const fol=c.follow!=null?c.follow:1,mx=rad(c.maxDeg,10),w0=2*Math.PI*(c.freqHz||2.2),z=c.damping!=null?c.damping:.25;
    for(const h of hair){
      const p=h.root.getWorldPosition(tv);
      if(jump||!h.pp){h.th.set(0,0,0);h.v.set(0,0,0);h.pp=p.clone();continue}
      // 뿌리가 움직인 거리(머리 기준) → 끝이 늦게 따라오는 각도 = hang × (−Δp) / L
      const dp=tv2.copy(p).sub(h.pp).applyQuaternion(Fi);h.pp.copy(p);
      const kick=h.hang.clone().cross(dp.negate()).divideScalar(h.L);
      // 머리 회전은 가닥 방향 성분(꼬임)을 빼고 반대로
      const r=dRot.clone();r.addScaledVector(h.hang,-r.dot(h.hang));kick.sub(r);
      h.th.addScaledVector(kick,fol);
    }
    acc=jump?0:Math.min(acc+dt,STEP*6);
    while(acc>=STEP){acc-=STEP;
      for(const h of hair){const w=w0*h.f;
        h.v.addScaledVector(h.th,-w*w*STEP).multiplyScalar(1/(1+2*z*w*STEP));   // 반암시적: 감쇠를 나눠서(큰 간격에도 안정)
        h.th.addScaledVector(h.v,STEP)}}
    // 최대 각도(얼굴·몸 뚫림 방지)와 뼈에 나눠 얹기
    for(const h of hair){
      const a=h.th.length();if(a>mx){h.th.multiplyScalar(mx/a);h.v.multiplyScalar(.5)}
      const ax=a>1e-7?h.th.clone().normalize():null;if(!ax)continue;
      const tot=Math.min(a,mx);
      h.bones.forEach((b,i)=>addRot(b,tq.setFromAxisAngle(ax,tot*h.w[i])));
    }
  }
  // 매 프레임. now(ms), o={cam,mid,avert,big}
  function update(now,o){
    if(!md)return;
    const t=now/1000,dt=last?Math.min(1,t-last):STEP;last=t;
    // 확대(큰 몸짓) 중에는 세기를 bigScale 로 부드럽게 줄임
    const target=o.big?(cfg.bigScale!=null?cfg.bigScale:.4):1;scale+=(target-scale)*(1-Math.exp(-dt*3));
    if(cfg.breath&&cfg.breath.on!==false)body(dt,t,scale);
    if(cfg.gaze&&cfg.gaze.on!==false)gaze(dt,t,o,scale);
    hairAll(dt);
  }
  // 확인용: 머리카락 뼈 회전 값들, 기본 회전에서 벌어진 각도(도)
  function probe(){const o=[];for(const h of hair)for(const b of h.bones){const q=b.quaternion;o.push(q.x,q.y,q.z,q.w)}return o}
  function probeDev(){let mx=0,sum=0;for(const h of hair){const a=h.th.length()/DEG;mx=Math.max(mx,a);sum+=a}return{max:mx,avg:hair.length?sum/hair.length:0}}
  return{init,update,state:()=>({...st,scale}),probe,probeDev};
})();
