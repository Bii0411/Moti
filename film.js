// moti 입장권 배경 필름 띠(7-2). 설정은 data/onboarding.json film (값의 뜻은 _film).
// Film     : 입장권 3D 장면 안에서 서아 뒤를 지나가는 필름 띠 두 줄(휘어진 큰 띠 + 기운 얇은 띠). 펀치 때 잠깐 밝고 빨라짐
// FilmShot : 개발용. 주소 ?filmshot=1&skipintro=1 → 앱의 3D 서아로 film.shots 몸짓을 하나씩 재생해 멈춘 사진을 찍고
//            필름 칸처럼 이어 붙인 webp 를 만든다(화면에 보여 주고 내려받기 버튼). tools/filmshot.mjs 가 이걸로 파일을 저장한다.
// 이 파일은 index.html 본 스크립트보다 먼저 불린다(FilmShot 이 시계를 먼저 바꿔 둬야 해서). Stage·DATA 는 함수 안에서만 쓴다.

const FilmShot=(()=>{
  const on=/[?&]filmshot=1(&|$)/.test(location.search);
  // 같은 결과를 다시 만들 수 있게: 가짜 시계(performance.now·requestAnimationFrame)와 씨앗 있는 난수(눈 깜빡임·머리카락·시선 흔들림)
  let vt=0,queue=[],pump=null,seed=()=>{};
  function step(ms){vt+=ms;const q=queue;queue=[];q.forEach(f=>f(vt))}
  if(on){
    const r0=performance.now();vt=r0;
    performance.now=()=>vt;
    const raf=window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame=f=>{queue.push(f);return queue.length};
    let s=0;seed=()=>{s=20261123>>>0};seed();Math.random=()=>(s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296;
    // 찍기 전까지는 진짜 화면 갱신에 맞춰 실제 시간만큼 흘러감
    let rl=null;pump=true;const loop=r=>{if(!pump)return;if(rl!=null)step(Math.min(100,r-rl));rl=r;raf(loop)};raf(loop);
  }
  const F=()=>((typeof DATA!=="undefined"&&DATA.onboarding)||{}).film||{};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  async function run(){
    const f=F(),cell=f.cell||{},cw=cell.w||244,ch=cell.h||300,gap=cell.gap||12,mg=cell.margin||34;
    const shots=f.shots||[];if(!shots.length)return;
    pump=false;
    // 불러오는 데 걸린 시간과 상관없이 같은 출발점: 시계를 정해진 시각(10분)으로 넘기고 난수 씨앗을 처음으로
    vt=Math.max(vt,600000);seed();
    // 찍는 칸: 화면 맨 위에 cw×ch(CSS px). 픽셀 비율이 2면 두 배 크기로 그려서 줄여 붙임(가장자리가 매끈)
    const ov=document.createElement("div");ov.style.cssText="position:fixed;inset:0;z-index:9999;background:#15101f;overflow:auto;color:#e9e3f7;font:13px/1.5 sans-serif";
    const box=document.createElement("div");box.style.cssText=`position:relative;width:${cw}px;height:${ch}px;background:${cell.bg||"#15101f"}`;
    box.id="filmShotBox";ov.innerHTML="<style>#filmShotBox canvas{position:absolute;inset:0;width:100%!important;height:100%!important}</style>";  // 캔버스 크기를 칸에 고정(픽셀 비율 2에서 커지지 않게)
    ov.appendChild(box);document.body.appendChild(ov);
    Stage.borrow(box,f.shotFrame||{top:1.1,bottom:.42,width:.5,lift:0});
    if(typeof Look!=="undefined")Look.setPlace(null);
    const R=Stage.three().R,src=R.domElement;
    const n=shots.length,pitch=cw+gap,W=n*pitch,H=ch+2*mg;
    const c=document.createElement("canvas");c.width=W;c.height=H;
    const g=c.getContext("2d");g.imageSmoothingQuality="high";
    g.fillStyle=cell.base||"#0b0911";g.fillRect(0,0,W,H);
    const dt=1000/60,settle=(f.shotSettleSec!=null?f.shotSettleSec:1)*1000;
    // 가짜 시계로 ms 만큼 1/60초씩 그림. 몇 걸음마다 쉬어서 브라우저가 멈춘 것처럼 되지 않게(느린 소프트웨어 렌더링)
    let cnt=0;const run=async ms=>{let k=0;while(k+dt<ms){step(dt);k+=dt;if(++cnt%8===0)await wait(0)}return ms-k};
    Stage.setFace("soft");await run(3000);           // 처음 3초: 머리카락·시선이 이전 상태를 잊게
    for(let i=0;i<n;i++){
      const s=shots[i];window.__filmProgress=i+"/"+n;
      Stage.setFace(s.face||"soft");
      await run(settle);                              // 표정·머리카락이 자리 잡게
      Stage.play(s.id,{quiet:true});
      const at=Stage.dur(s.id)*1000*(s.at!=null?s.at:50)/100;
      step(await run(at));                            // 마지막 걸음이 정확히 그 순간
      const x=Math.round(gap/2+i*pitch);
      g.fillStyle=cell.bg||"#15101f";g.fillRect(x,mg,cw,ch);
      g.drawImage(src,x,mg,cw,ch);                   // 방금 그린 화면(같은 작업 안이라 지워지기 전)
      await run(1200);                                // 몸짓을 흘려보냄(다음 몸짓이 이어받음)
    }
    Stage.release();
    // 필름 구멍(투명). 칸마다 holesPerCell 개, 간격이 칸 폭과 맞아서 이어 붙여도(반복) 끊기지 않음
    const hp=cell.holesPerCell||6,hw=cell.holeW||14,hh=cell.holeH||10,hr=cell.holeR||2.5,hpitch=pitch/hp;
    g.globalCompositeOperation="destination-out";g.fillStyle="#000";
    for(let k=0;k<n*hp;k++){const hx=k*hpitch+(hpitch-hw)/2;
      for(const hy of [(mg-hh)/2,H-mg+(mg-hh)/2]){g.beginPath();g.roundRect?g.roundRect(hx,hy,hw,hh,hr):g.rect(hx,hy,hw,hh);g.fill()}}
    g.globalCompositeOperation="source-over";
    const url=c.toDataURL("image/webp",f.quality!=null?f.quality:.8);
    const bytes=Math.round((url.length-url.indexOf(",")-1)*3/4);
    window.__film={url,bytes,w:W,h:H};
    ov.innerHTML=`<p style="padding:10px 12px">필름 사진 ${n}장 · ${W}×${H} · ${(bytes/1024).toFixed(0)}KB · 저장 위치 ${f.image||""}</p>
      <img src="${url}" style="display:block;max-width:none;height:${H}px;background:repeating-conic-gradient(#333 0 25%,#555 0 50%) 0 0/16px 16px">
      <p style="padding:10px 12px"><a download="${(f.image||"film.webp").split("/").pop()}" href="${url}" style="color:#c4b5fd">내려받기</a></p>`;
    return window.__film;
  }
  function start(){
    if(!on)return;
    Promise.all([Stage.ready,typeof dataReady!=="undefined"?dataReady:null]).then(()=>wait(300)).then(run)
      .catch(e=>{window.__film={error:String(e&&e.stack||e)}});
  }
  return{on,start,step};
})();

const Film=(()=>{
  const F=()=>((typeof DATA!=="undefined"&&DATA.onboarding)||{}).film||{};
  let group=null,loading=null,shown=false,bands=[],last=0,punchAt=-1e9;
  const V=a=>new THREE.Vector3(a[0],a[1],a[2]);
  // 곡선을 따라가는 띠. 길이 방향으로 같은 간격(호 길이)으로 점을 찍어서 휘어진 곳에서도 사진이 늘어나거나 눌리지 않게.
  // 폭 방향 = 앞(카메라 쪽 +Z) × 진행 방향 → 띠 면이 늘 카메라를 향하고, 사진 위쪽이 띠의 위쪽 가장자리
  function ribbon(curve,width,seg){
    const N=Math.max(2,seg|0),pts=curve.getSpacedPoints(N),L=curve.getLength();
    const pos=new Float32Array((N+1)*2*3),uv=new Float32Array((N+1)*2*2),idx=[];
    const fwd=new THREE.Vector3(0,0,1),t=new THREE.Vector3(),w=new THREE.Vector3();
    for(let i=0;i<=N;i++){
      t.subVectors(pts[Math.min(N,i+1)],pts[Math.max(0,i-1)]).normalize();
      w.crossVectors(fwd,t).normalize().multiplyScalar(width/2);
      const p=pts[i];
      pos.set([p.x-w.x,p.y-w.y,p.z-w.z,p.x+w.x,p.y+w.y,p.z+w.z],i*6);
      const u=i/N*L;uv.set([u,0,u,1],i*4);  // u 는 미터 단위, 나중에 사진 한 벌 길이로 나눔
      if(i<N){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3)}
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute("position",new THREE.BufferAttribute(pos,3));geo.setAttribute("uv",new THREE.BufferAttribute(uv,2));geo.setIndex(idx);
    return{geo,L};
  }
  function make(tex,b,curve,tint){
    const img=tex.image,tileLen=b.width*img.width/img.height;  // 사진 비율 그대로: 띠 폭 = 사진 높이
    const {geo,L}=ribbon(curve,b.width,b.segments||(curve.isLineCurve3?1:96));
    const uv=geo.attributes.uv.array;for(let i=0;i<uv.length;i+=2)uv[i]/=tileLen;
    const t=tex.clone();t.needsUpdate=true;t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.ClampToEdgeWrapping;
    const col=new THREE.Color(tint);
    const m=new THREE.MeshBasicMaterial({map:t,color:col.clone().multiplyScalar(b.brightness!=null?b.brightness:.5),transparent:true,
      opacity:b.opacity!=null?b.opacity:.8,depthWrite:false,side:THREE.DoubleSide,fog:true});
    const mesh=new THREE.Mesh(geo,m);mesh.renderOrder=-2;mesh.frustumCulled=false;mesh.name="obFilm";
    return{mesh,t,m,col,b,tileLen,L};
  }
  // 빈 필름(7-3): 사진 없이 어두운 칸 하나 + 위아래 구멍(투명). 크기·구멍은 사진 필름과 같은 cell 값이라 같은 모양
  function blankTex(f){
    const cell=f.cell||{},cw=cell.w||244,ch=cell.h||300,gap=cell.gap||12,mg=cell.margin||34,pitch=cw+gap,H=ch+2*mg;
    const hp=cell.holesPerCell||6,hw=cell.holeW||14,hh=cell.holeH||10,hr=cell.holeR||2.5,hpitch=pitch/hp;
    const c=document.createElement("canvas");c.width=pitch;c.height=H;const g=c.getContext("2d");
    g.fillStyle=cell.base||"#0b0911";g.fillRect(0,0,pitch,H);
    g.fillStyle=(f.thin&&f.thin.blankColor)||cell.bg||"#15101f";g.fillRect(gap/2,mg,cw,ch);
    g.globalCompositeOperation="destination-out";g.fillStyle="#000";
    for(let k=0;k<hp;k++){const hx=k*hpitch+(hpitch-hw)/2;
      for(const hy of [(mg-hh)/2,H-mg+(mg-hh)/2]){g.beginPath();g.roundRect?g.roundRect(hx,hy,hw,hh,hr):g.rect(hx,hy,hw,hh);g.fill()}}
    const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;
  }
  function build(){
    if(loading||typeof THREE==="undefined")return loading;
    const f=F();if(!f.image)return null;
    loading=new Promise(res=>new THREE.TextureLoader().load(f.image,tex=>{
      tex.encoding=THREE.sRGBEncoding;
      try{tex.anisotropy=Math.min(8,Stage.three().R.capabilities.getMaxAnisotropy())}catch(e){}
      group=new THREE.Group();group.name="obFilmGroup";
      const big=f.big||{},thin=f.thin||{};
      const bigC=new THREE.CatmullRomCurve3((big.points||[[-1.6,.9,-1],[0,1.3,-2],[1.6,2,-3.5]]).map(V),false,"centripetal");
      const thinC=new THREE.LineCurve3(V(thin.from||[-2,.8,-2.4]),V(thin.to||[2,1,-2.8]));
      // 사진은 큰 띠에만. 얇은 띠는 빈 필름(thin.blank 가 false 면 사진)
      const thinTex=thin.blank===false?tex:blankTex(f);thinTex.anisotropy=tex.anisotropy;
      bands=[make(tex,big,bigC,f.tint||"#9b80d6"),make(thinTex,thin,thinC,f.tint||"#9b80d6")];
      bands.forEach((x,i)=>{x.off=i*.37;group.add(x.mesh)});
      res(group)},undefined,()=>res(null)));
    return loading;
  }
  // 첫 화면이 뜨는 동안 미리: 사진을 불러오고 셰이더까지 준비(입장권이 처음 보일 때 멈칫하지 않게)
  function prepare(){const p=build();if(!p)return;p.then(g=>{if(!g)return;const T3=Stage.three();T3.scene.add(g);try{T3.R.compile(T3.scene,T3.cam)}catch(e){}if(!shown)T3.scene.remove(g)})}
  function show(){shown=true;last=0;punchAt=-1e9;const p=build();if(p)p.then(g=>{if(g&&shown)Stage.three().scene.add(g)})}
  function hide(){shown=false;if(group)Stage.three().scene.remove(group)}
  function punch(){punchAt=performance.now()}
  // 매 프레임(입장권 화면에서만 불림): 사진을 미끄러지게. 펀치 뒤 ms 동안 밝기·속도 배율이 빠르게 올랐다가 천천히 1로
  function tick(now){
    if(!shown||!bands.length)return;
    const dt=last?Math.min(.1,(now-last)/1000):0;last=now;
    const p=F().punch||{},ms=p.ms||1200,k=(now-punchAt)/ms;
    let boost=0;if(k>=0&&k<1){const up=p.rise!=null?p.rise:.08;boost=k<up?k/up:Math.pow(1-(k-up)/(1-up),2)}
    const bm=1+((p.brightness!=null?p.brightness:2)-1)*boost,sm=1+((p.speed!=null?p.speed:4)-1)*boost;
    for(const x of bands){
      x.off=(x.off+(x.b.speed||0)*sm*dt/x.tileLen)%1;x.t.offset.x=x.off;
      x.m.color.copy(x.col).multiplyScalar((x.b.brightness!=null?x.b.brightness:.5)*bm);
    }
  }
  return{prepare,show,hide,punch,tick,info:()=>({bands:bands.length,shown})};
})();
