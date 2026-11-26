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
  const st={sway:0,swayT:7,eyeY:0,eyeP:0,eyeW:1,headY:0,headP:0,jitY:0,jitP:0,jitUntil:0,jitNext:2,avSide:1,wasAvert:false,headW:1};
  const rad=(v,d)=>(v!=null?v:d)*DEG;
  // 기본 자세 기준 회전(D)을 뼈에 더한다: local ← local · (W⁻¹ · D · W). motion.js 와 같은 방식이라 몸짓 위에 그대로 얹힌다
  function addRot(b,D){const w=restW[b.name];if(!w)return;tmpQ2.copy(w).invert().multiply(D).multiply(w);b.quaternion.multiply(tmpQ2)}
  const rotQ=(ax,a)=>new Q().setFromAxisAngle(AX[ax],a);
  function init(model,c,opt){
    md=model;cfg=c||{};hair=[];restW={};restL={};showCols=!!(opt&&opt.colliders);colMesh=null;Fprev=null;
    for(const n in md.rest){const r=md.rest[n];restW[n]=new Q(r.world[0],r.world[1],r.world[2],r.world[3]);restL[n]=new Q(r.local[0],r.local[1],r.local[2],r.local[3])}
    // 머리카락: 이름이 J_Sec_Hair 로 시작하는 뼈 사슬(머리 Head 에 붙은 가닥 15개). 끝점(_end)은 제외.
    // 가닥마다 [뿌리 → 끝] 뼈 목록, 기본 자세에서 늘어진 방향(hang), 길이(L)
    md.root.updateMatrixWorld(true);
    const isHair=o=>o&&o.isBone&&/^J_Sec_Hair\d+_\d+$/.test(o.name);
    (md.bones.Head?md.bones.Head.children:[]).filter(isHair).forEach(r=>{
      const bones=[];let o=r;while(isHair(o)){bones.push(o);o=o.children.find(c=>/^J_Sec_Hair/.test(c.name))}
      const p0=r.getWorldPosition(new V()),p1=(o||bones[bones.length-1]).getWorldPosition(new V());
      const n=bones.length,w=bones.map((b,i)=>(i+1)/(n*(n+1)/2));   // 끝으로 갈수록 더 휨(합 = 1 → 끝의 각도 = θ)
      const cw=[0];w.forEach((x,i)=>cw.push(cw[i]+x));                  // 점 j(뼈 j 의 시작, 마지막은 끝점)까지 쌓인 휨 비율
      hair.push({bones,w,cw,end:o||null,hang:p1.clone().sub(p0).normalize(),L:Math.max(.02,p0.distanceTo(p1)),root:r,
        f:1+(Math.random()*2-1)*.1,th:new V(),v:new V(),pp:null,g:null,col:null});
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
    // 79: 몸짓이 고개를 돌리거나 숙이면(F 각도가 eyeReduceDeg 를 넘으면) 눈도 카메라를 쫓지 않고 고개가 향한 쪽을 봄(눈만 치켜뜨거나 옆으로 몰리지 않게)
    const er=g.eyeReduceDeg;let ew=er?1-sm((dev-er[0]*DEG)/((er[1]-er[0])*DEG)):1;st.eyeW+=(ew-st.eyeW)*(1-Math.exp(-dt*4));ew=st.eyeW;
    // 80: 눈은 위로 eyeMaxUpDeg(기본 1°)까지만 — 위로 굴리면 치켜뜬 얼굴이 됨. 아래로는 예전처럼 eyeMaxPitchDeg
    const tep=Math.max(-rad(g.eyeMaxUpDeg!=null?g.eyeMaxUpDeg:1,1),Math.min(rad(g.eyeMaxPitchDeg,8),tp-thp))*ew;
    const tey=cl(ty-thy,rad(g.eyeMaxYawDeg,12))*ew;
    const ke=1-Math.exp(-dt*(g.eyeSpeed||16)),kh=1-Math.exp(-dt*(g.headSpeed||3));
    st.eyeY+=(tey-st.eyeY)*ke;st.eyeP+=(tep-st.eyeP)*ke;st.headY+=(thy-st.headY)*kh;st.headP+=(thp-st.headP)*kh;
    addRot(H,rotQ("y",st.headY).multiply(rotQ("x",st.headP)));
    const De=rotQ("y",st.eyeY).multiply(rotQ("x",st.eyeP));
    addRot(EL,De);addRot(ER,De);
  }
  // ── 머리카락: 가닥마다 감쇠 스프링 하나 + 중력 + 몸 충돌(6-A) ──
  // 머리가 돌거나 움직이면 그만큼 가닥이 반대로 밀려(늦게 따라옴) 스프링이 제자리로 당기며 몇 번 흔들리다 멈춘다.
  // θ = 머리 기준 가닥 끝의 회전(라디안 벡터). 뼈마다 끝으로 갈수록 더 휘게 나눠 준다.
  // 중력: 머리가 기본 자세에서 기운 만큼(월드 아래 방향이 머리 기준으로 돈 만큼) × strength 를 스프링의 "제자리"로 삼는다.
  //       똑바로 서 있으면 0 이라 지금처럼 거의 안 움직이고, 숙일수록 가닥 끝이 월드 아래(몸에서 떨어지는 쪽)로 늘어진다.
  // 충돌: 가슴·어깨·위팔 뼈에 붙인 구(colliders) 안으로 가닥 점이 들어가면 뿌리를 축으로 가닥을 돌려 구 밖으로 민다.
  //       민 양(col)은 relaxSec 동안 천천히 풀리고, 다시 닿으면 또 민다(매 프레임 밀고 당기며 떨리지 않게).
  const STEP=1/60;
  let acc=0,Fprev=null,cols=[],colMesh=null,showCols=false;
  const tq=new Q(),tv=new V(),tv2=new V(),tv3=new V(),tv4=new V(),DOWN=new V(0,-1,0);
  // 충돌 구 위치: 뼈(bone) 위치에서 to 뼈 쪽으로 along 만큼 간 점 + offset(기본 자세 기준 축, m). 뼈가 돌면 offset 도 같이 돈다
  function colliders(){
    const L=(cfg.hair&&cfg.hair.colliders)||[],B=md.bones,out=[];
    for(const c of L){const b=B[c.bone];if(!b||!restW[c.bone])continue;
      const p=b.getWorldPosition(new V());
      if(c.to&&B[c.to]&&c.along)p.lerp(B[c.to].getWorldPosition(tv),c.along);
      if(c.offset){b.matrixWorld.decompose(tmpP,tmpQ,tmpS);tmpQ.multiply(tmpQ2.copy(restW[c.bone]).invert());p.add(tv.set(c.offset[0],c.offset[1],c.offset[2]).applyQuaternion(tmpQ))}
      out.push({name:c.name||c.bone,c:p,r:c.r||.05})}
    return out;
  }
  function drawCols(){
    if(!showCols||!md.root.parent)return;
    if(!colMesh){colMesh=cols.map(()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),new THREE.MeshBasicMaterial({color:0x8cff5a,transparent:true,opacity:.35,depthWrite:false,depthTest:false}));m.renderOrder=10;md.root.parent.add(m);return m})}
    cols.forEach((s,i)=>{const m=colMesh[i];if(!m)return;m.position.copy(s.c);m.scale.setScalar(s.r)});
  }
  function hairAll(dt){
    const c=cfg.hair||{};if(c.on===false||!hair.length||!md.bones.Head)return;
    const G=c.gravity||{},X=c.collide||{};
    const H=md.bones.Head;md.root.updateMatrixWorld(true);
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
    // 중력 목표: 월드 아래 방향을 머리 기준으로 옮긴 g 와 기본 자세 아래(0,−1,0) 사이의 회전 × strength
    const gOn=G.on!==false&&(G.strength||0)>0;
    const gAx=new V(),g=DOWN.clone().applyQuaternion(Fi);
    // deadDeg 보다 작게 기운 것(숨쉬기·무게중심·시선으로 생기는 작은 기울기)은 무시 → 가만히 있을 때는 지금처럼 거의 안 움직임
    if(gOn){gAx.crossVectors(DOWN,g);const s=gAx.length(),ang=Math.max(0,Math.atan2(s,DOWN.dot(g))-rad(G.deadDeg,3));if(s>1e-6&&ang>0)gAx.multiplyScalar(ang*G.strength/s);else gAx.set(0,0,0)}
    const gMax=rad(G.maxDeg,40),relax=1-Math.exp(-dt/(X.relaxSec||.4));
    const fol=c.follow!=null?c.follow:1,mx=rad(c.maxDeg,10),w0=2*Math.PI*(c.freqHz||2.2),z=c.damping!=null?c.damping:.25;
    for(const h of hair){
      // 가닥마다 중력 목표(가닥 방향으로 꼬는 성분은 뺌), 부드럽게 따라감
      const tg=tv3.copy(gAx);tg.addScaledVector(h.hang,-tg.dot(h.hang));if(tg.length()>gMax)tg.setLength(gMax);
      if(jump||!h.g)h.g=tg.clone();else h.g.lerp(tg,1-Math.exp(-dt*(G.followHz||6)));
      if(!h.col)h.col=new V();
      const p=h.root.getWorldPosition(tv);
      if(jump||!h.pp){h.th.copy(h.g);h.v.set(0,0,0);h.col.set(0,0,0);h.pp=p.clone();continue}
      // 뿌리가 움직인 거리(머리 기준) → 끝이 늦게 따라오는 각도 = hang × (−Δp) / L
      const dp=tv2.copy(p).sub(h.pp).applyQuaternion(Fi);h.pp.copy(p);
      const kick=h.hang.clone().cross(dp.negate()).divideScalar(h.L);
      // 머리 회전은 가닥 방향 성분(꼬임)을 빼고 반대로
      const r=dRot.clone();r.addScaledVector(h.hang,-r.dot(h.hang));kick.sub(r);
      h.th.addScaledVector(kick,fol);
      if(!h.touch)h.col.multiplyScalar(1-relax);                        // 충돌로 민 양은 몸에서 떨어졌을 때만 천천히 풀림(닿아 있는 동안은 그대로 → 떨림 없음)
    }
    acc=jump?0:Math.min(acc+dt,STEP*6);
    while(acc>=STEP){acc-=STEP;
      for(const h of hair){const w=w0*h.f;
        h.v.addScaledVector(tv.copy(h.th).sub(h.g),-w*w*STEP).multiplyScalar(1/(1+2*z*w*STEP));   // 반암시적: 감쇠를 나눠서(큰 간격에도 안정)
        h.th.addScaledVector(h.v,STEP)}}
    // 흔들림 최대 각도(중력 자리 기준)와 뼈에 나눠 얹기
    for(const h of hair){
      const d=tv.copy(h.th).sub(h.g),a=d.length();if(a>mx){h.th.copy(h.g).addScaledVector(d,mx/a);h.v.multiplyScalar(.5)}
      const ta=h.th.length();if(ta>1e-7){const T=tv2.copy(h.th).divideScalar(ta);h.bones.forEach((b,i)=>addRot(b,tq.setFromAxisAngle(T,ta*h.w[i])))}
      const ca=h.col.length();if(ca>1e-7)addRot(h.bones[0],tq.setFromAxisAngle(tv2.copy(h.col).divideScalar(ca),ca));   // 충돌로 민 양은 뿌리에서 가닥 전체를 통째로 돌림
    }
    // 몸 충돌: 가닥 점(뿌리 제외)이 구 안이면 가장 깊은 점을 구 밖으로 내보내는 회전을 col 에 더함 (iter 번 반복)
    cols=colliders();drawCols();                                       // ?colliders=1 이면 충돌을 꺼도 구는 보여 줌
    if(X.on===false||!cols.length){for(const h of hair)h.touch=false;return}
    const margin=X.margin!=null?X.margin:.008,iter=X.iter||2,cmax=rad(X.maxDeg,70),minW=X.minWeight!=null?X.minWeight:.3,touchD=X.touch!=null?X.touch:.002;
    for(const h of hair){
      h.touch=false;
      for(let it=0;it<iter;it++){
        h.root.updateMatrixWorld(true);
        const R0=h.root.getWorldPosition(tv4);
        let best=null;
        for(let j=1;j<=h.bones.length;j++){
          const W=h.cw[j];if(W<minW)continue;
          const o=j<h.bones.length?h.bones[j]:h.end;if(!o)continue;
          const pt=o.getWorldPosition(tv);
          for(const s of cols){const dv=tv2.copy(pt).sub(s.c),dist=dv.length(),R=s.r+margin;
            if(dist<R+touchD)h.touch=true;                                 // 구 표면에 닿아 있음(밀 필요는 없을 수도)
            if(dist<R&&(!best||R-dist>best.depth)){
              const to=dv.lengthSq()>1e-10?dv.setLength(R).add(s.c):s.c.clone().add(new V(0,0,R));
              best={depth:R-dist,a:pt.clone().sub(R0),b:to.clone().sub(R0),W}}}
        }
        if(!best)break;
        const ax=new V().crossVectors(best.a,best.b),sn=ax.length();if(sn<1e-9)break;
        const phi=Math.atan2(sn,best.a.dot(best.b));                     // 뿌리를 축으로 가닥 전체를 돌리면 그 점도 같은 각도만큼 돈다
        ax.divideScalar(sn).applyQuaternion(Fi);                          // 월드 축 → 머리 기준 축
        const D=ax.clone().multiplyScalar(phi);
        const nc=h.col.clone().add(D);if(nc.length()>cmax){nc.setLength(cmax);D.copy(nc).sub(h.col)}
        h.col.copy(nc);
        const vin=h.v.dot(ax);if(vin<0)h.v.addScaledVector(ax,-vin);          // 몸 쪽으로 가던 흔들림은 없앰
        const da=D.length();if(da<1e-7)break;
        addRot(h.bones[0],tq.setFromAxisAngle(D.clone().divideScalar(da),da));
      }
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
  // 확인용: 충돌 구, 가닥 점 중 구 안에 들어간 깊이(mm, 가장 깊은 것), 충돌로 민 각도(도)
  function probeCol(){
    const cs=md?colliders():[];let worst=0,who="";
    for(const h of hair){h.root.updateMatrixWorld(true);
      for(let j=1;j<=h.bones.length;j++){const o=j<h.bones.length?h.bones[j]:h.end;if(!o)continue;const pt=o.getWorldPosition(new V());
        for(const s of cs){const d=s.r-pt.distanceTo(s.c);if(d>worst){worst=d;who=h.root.name+"@"+s.name}}}}
    let cm=0;for(const h of hair)if(h.col)cm=Math.max(cm,h.col.length()/DEG);
    return{colliders:cs.map(s=>({name:s.name,c:s.c.toArray().map(x=>+x.toFixed(3)),r:s.r})),insideMm:+(worst*1000).toFixed(1),who,colMaxDeg:+cm.toFixed(1)}
  }
  // 확인용: 뼈 위치(m), 가닥 뿌리·끝
  function bonePos(names){md.root.updateMatrixWorld(true);const o={};for(const n of names){const b=md.bones[n];if(b)o[n]=b.getWorldPosition(new V()).toArray().map(x=>+x.toFixed(3))}return o}
  function hairInfo(){md.root.updateMatrixWorld(true);return hair.map(h=>({name:h.root.name,n:h.bones.length,root:h.root.getWorldPosition(new V()).toArray().map(x=>+x.toFixed(3)),tip:(h.end||h.bones[h.bones.length-1]).getWorldPosition(new V()).toArray().map(x=>+x.toFixed(3)),L:+h.L.toFixed(3)}))}
  const probeHair=()=>hair.map(h=>({n:h.root.name.slice(-2),th:h.th.toArray().map(x=>+(x/DEG).toFixed(2)),g:(h.g||new V()).toArray().map(x=>+(x/DEG).toFixed(2)),col:(h.col||new V()).toArray().map(x=>+(x/DEG).toFixed(2)),touch:!!h.touch}));
  return{init,update,state:()=>({...st,scale}),probe,probeDev,probeCol,bonePos,hairInfo,probeHair};
})();
