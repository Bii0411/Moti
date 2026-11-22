// moti 캐릭터 3D 모습: 만화풍 명암 재질·조명, 외곽선·장소별 테두리 빛 (값은 data/look.json)
// 원본 모델은 재질이 모두 조명 무시(KHR_materials_unlit)라서, 불러온 뒤 피부·옷·머리카락 재질만
// MeshToonMaterial 로 바꾼다. 눈·눈썹·속눈썹·입은 그대로 둔다.
// 그림자 색은 명암 단계 텍스처(gradientMap) 자체에 구워 넣는다:
//   텍스처 값 = 그림자 단계에서는 그림자 색, 중간 단계는 그림자 색과 흰색 사이, 밝은 단계는 흰색.
//   MeshToonMaterial 은 주 조명 세기에 이 값을 곱하므로 "그림자 부분에 곱해지는 색"이 된다(셰이더 수정 없음).
const Look=(()=>{
  const hex=h=>new THREE.Color(h||"#ffffff");
  // 화면색(sRGB) → 셰이더 안의 값(선형). 곱하는 색을 선형으로 바꿔 두면 화면에서도 그 색을 곱한 것처럼 보인다
  const lin=c=>c.clone().convertSRGBToLinear();
  function gradient(cfg,mat){
    const N=64,data=new Uint8Array(N*4),e=(cfg.bands&&cfg.bands.edges)||[0,.3],mid=cfg.bands&&cfg.bands.mid!=null?cfg.bands.mid:.5;
    const sh=lin(new THREE.Color(1,1,1).lerp(hex(mat.shadow),mat.mix!=null?mat.mix:1));
    for(let i=0;i<N;i++){
      const dot=(i+.5)/N*2-1,lv=dot<e[0]?0:dot<e[1]?mid:1;
      data[i*4]=Math.round((sh.r+(1-sh.r)*lv)*255);data[i*4+1]=Math.round((sh.g+(1-sh.g)*lv)*255);data[i*4+2]=Math.round((sh.b+(1-sh.b)*lv)*255);data[i*4+3]=255}
    const t=new THREE.DataTexture(data,N,1,THREE.RGBAFormat);
    t.minFilter=t.magFilter=THREE.NearestFilter;t.generateMipmaps=false;t.needsUpdate=true;
    return t;
  }
  const kindOf=(cfg,name)=>(cfg.materials||[]).find(m=>name.indexOf(m.match)>=0)||null;
  function toon(src,grad){
    const m=new THREE.MeshToonMaterial({map:src.map,color:src.color.clone(),gradientMap:grad,
      transparent:src.transparent,opacity:src.opacity,alphaTest:src.alphaTest,side:src.side,depthWrite:src.depthWrite});
    m.name=src.name;m.skinning=src.skinning;m.morphTargets=src.morphTargets;m.morphNormals=src.morphNormals;
    return m;
  }
  // 테두리 빛(4-B): 모든 바뀐 재질이 같은 uniform 객체를 나눠 써서, 색을 한 곳에서 바꾸면 전부 바뀐다
  const RIM={color:{value:new THREE.Color(0,0,0)},edges:{value:new THREE.Vector2(.62,.82)},strength:{value:0}};
  const rimNow=new THREE.Color(0,0,0),rimFrom=new THREE.Color(),rimTo=new THREE.Color();
  let rimCfg=null,rimT0=0,rimDur=0,rimOn=false,rimName=null,rimSet=false;
  // 셰이더 고치기: 얼굴 얼룩 방지(blend>0일 때) + 테두리 빛(rim 켜졌을 때)
  // 얼굴 얼룩 방지: 얼굴 피부의 면 방향(노멀)을 머리 중심에서 바깥으로 향하는 방향 쪽으로 섞어 명암 경계를 둥글고 매끈하게.
  // blend 0 = 원래 노멀, 1 = 완전히 공 모양. 머리 중심은 얼굴 메시(뼈대에 붙기 전 좌표)의 상자 중심
  function patch(m,geo,blend,rim){
    if(!blend&&!rim)return;
    const c=new THREE.Vector3();
    if(blend){geo.computeBoundingBox();geo.boundingBox.getCenter(c)}
    m.onBeforeCompile=sh=>{
      if(blend){
        sh.uniforms.uHeadC={value:c};sh.uniforms.uFaceBlend={value:blend};
        sh.vertexShader="uniform vec3 uHeadC;\nuniform float uFaceBlend;\n"+sh.vertexShader.replace("#include <beginnormal_vertex>",
          "vec3 objectNormal = normalize( mix( vec3( normal ), normalize( position - uHeadC ), uFaceBlend ) );\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3( tangent.xyz );\n#endif");
      }
      if(rim){
        sh.uniforms.uRimColor=RIM.color;sh.uniforms.uRimEdges=RIM.edges;sh.uniforms.uRimStrength=RIM.strength;
        sh.fragmentShader="uniform vec3 uRimColor;\nuniform vec2 uRimEdges;\nuniform float uRimStrength;\n"+sh.fragmentShader.replace("#include <output_fragment>",
          "float rimF = 1.0 - clamp( dot( normal, normalize( vViewPosition ) ), 0.0, 1.0 );\noutgoingLight += uRimColor * ( uRimStrength * smoothstep( uRimEdges.x, uRimEdges.y, rimF ) );\n#include <output_fragment>");
      }
    };
    m.customProgramCacheKey=()=>"look"+(blend?"F":"")+(rim?"R":"");
  }
  // 외곽선(4-B): 같은 뼈대를 쓰는 복제 메시 + 뒷면만 그리는 재질. 화면에서 px 만큼 노멀 방향으로 부풀린다.
  // 머리카락·옷의 비치는 부분(알파)을 따라가도록 원래 텍스처의 알파만 쓴다
  const OL={px:{value:1.25},res:{value:new THREE.Vector2(390,600)}};
  function outlineMat(src,cfg){
    const m=new THREE.MeshBasicMaterial({color:hex(cfg.color),map:src.map||null,side:THREE.BackSide,
      alphaTest:src.map?Math.max(.5,src.alphaTest||0):0,skinning:true,morphTargets:!!src.morphTargets,morphNormals:!!src.morphNormals});
    m.onBeforeCompile=sh=>{
      sh.uniforms.uOlPx=OL.px;sh.uniforms.uOlRes=OL.res;
      sh.vertexShader="uniform float uOlPx;\nuniform vec2 uOlRes;\n"+sh.vertexShader
        .replace("#include <begin_vertex>","#ifndef USE_ENVMAP\n#include <beginnormal_vertex>\n#include <morphnormal_vertex>\n#include <skinnormal_vertex>\n#endif\n#include <begin_vertex>")
        .replace("#include <project_vertex>","#include <project_vertex>\nvec4 olN = projectionMatrix * vec4( normalize( normalMatrix * objectNormal ), 0.0 );\nif ( dot( olN.xy, olN.xy ) > 1e-8 ) gl_Position.xy += normalize( olN.xy ) * ( 2.0 * uOlPx / uOlRes ) * gl_Position.w;");
      sh.fragmentShader=sh.fragmentShader.replace("#include <map_fragment>","#ifdef USE_MAP\ndiffuseColor.a *= texture2D( map, vUv ).a;\n#endif");
    };
    m.customProgramCacheKey=()=>"outline";
    return m;
  }
  function addOutline(o,mat){
    const ol=new THREE.SkinnedMesh(o.geometry,mat);
    ol.name=o.name+"_outline";ol.frustumCulled=false;ol.renderOrder=-1;
    ol.position.copy(o.position);ol.quaternion.copy(o.quaternion);ol.scale.copy(o.scale);
    if(o.morphTargetInfluences){ol.morphTargetInfluences=o.morphTargetInfluences;ol.morphTargetDictionary=o.morphTargetDictionary}
    o.parent.add(ol);ol.updateMatrixWorld(true);
    ol.bind(o.skeleton,o.bindMatrix);
    return ol;
  }
  // 조명: 주 조명 방향(위 elevationDeg, 옆 sideDeg), 환경광, 뒤 조명
  function lights(cfg,L){
    const c=cfg.lights||{},k=c.key||{},h=c.hemi||{},b=c.back||{};
    if(L.key){const el=(k.elevationDeg||45)*Math.PI/180,sd=(k.sideDeg||35)*Math.PI/180;
      L.key.color=hex(k.color);L.key.intensity=k.intensity!=null?k.intensity:.8;
      L.key.position.set(Math.sin(sd)*Math.cos(el),Math.sin(el),Math.cos(sd)*Math.cos(el)).multiplyScalar(3);L.key.target.position.set(0,0,0)}
    if(L.hemi){L.hemi.color=hex(h.sky);L.hemi.groundColor=hex(h.ground);L.hemi.intensity=h.intensity!=null?h.intensity:.6}
    if(L.back)L.back.intensity=b.intensity!=null?b.intensity:0;
  }
  // root: 불러온 모델, L: {hemi,key,back} 조명, opt.extra=false 면 4-B(외곽선·테두리 빛) 끔. 반환: 바꾼 재질 수 등 (보고서·확인용)
  function apply(cfg,root,L,opt){
    if(!cfg)return null;
    lights(cfg,L);
    const extra=!opt||opt.extra!==false;
    const olCfg=extra&&cfg.outline,parts=olCfg?(olCfg.parts||[]):[];
    rimCfg=extra?cfg.rim||null:null;rimOn=!!rimCfg;
    if(rimOn){const e=rimCfg.edges||[.62,.82];RIM.edges.value.set(e[0],e[1]);RIM.strength.value=rimCfg.strength!=null?rimCfg.strength:.5}
    if(olCfg)OL.px.value=olCfg.px||1.25;
    const grads={},made={},olMade={},info={toon:0,kept:0,outline:0,outlineParts:{}};
    const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o)});
    meshes.forEach(o=>{
      const kind=kindOf(cfg,o.material.name||"");
      if(!kind){info.kept++;return}
      const g=grads[kind.key]||(grads[kind.key]=gradient(cfg,kind));
      let m=made[o.material.uuid];
      if(!m){m=made[o.material.uuid]=toon(o.material,g);patch(m,o.geometry,kind.normalBlend||0,rimOn)}
      if(o.isSkinnedMesh&&parts.indexOf(kind.key)>=0){
        const om=olMade[o.material.uuid]||(olMade[o.material.uuid]=outlineMat(o.material,olCfg));
        addOutline(o,om);info.outline++;info.outlineParts[kind.key]=(info.outlineParts[kind.key]||0)+1}
      m.userData.kind=kind.key;o.material=m;info.toon++;
    });
    rimSet=false;if(rimOn)setPlace(rimName);
    return info;
  }
  // 장소 이름 → 테두리 빛 색 (화면에 지금 보이는 장소). 처음엔 바로, 그다음부터 fadeSec 동안 부드럽게
  function setPlace(name){
    rimName=name;
    const c=rimCfg;if(!c)return;
    const h=(c.byLocation&&c.byLocation[name])||c.default;
    const target=lin(hex(h));
    if(!rimSet){rimTo.copy(target);rimNow.copy(target);RIM.color.value.copy(target);rimSet=true;return}
    rimFrom.copy(rimNow);rimTo.copy(target);rimT0=performance.now();rimDur=(c.fadeSec!=null?c.fadeSec:1.2)*1000;
  }
  // 매 프레임: 색 바꾸기 진행, 외곽선 굵기 기준 화면 크기(CSS px)
  function tick(now,w,h){
    if(w&&h)OL.res.value.set(w,h);
    if(!rimOn)return;
    if(rimDur>0){const k=Math.min(1,(now-rimT0)/rimDur),e=k*k*(3-2*k);rimNow.copy(rimFrom).lerp(rimTo,e);if(k>=1)rimDur=0}
    else rimNow.copy(rimTo);
    RIM.color.value.copy(rimNow);
  }
  return{apply,setPlace,tick};
})();
