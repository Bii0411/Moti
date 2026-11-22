// moti 캐릭터 3D 모습: 만화풍 명암 재질·조명 (값은 data/look.json)
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
  // 얼굴 얼룩 방지: 얼굴 피부의 면 방향(노멀)을 머리 중심에서 바깥으로 향하는 방향 쪽으로 섞어 명암 경계를 둥글고 매끈하게.
  // blend 0 = 원래 노멀, 1 = 완전히 공 모양. 머리 중심은 얼굴 메시(뼈대에 붙기 전 좌표)의 상자 중심
  function smoothFace(m,geo,blend){
    if(!blend)return;
    geo.computeBoundingBox();const c=geo.boundingBox.getCenter(new THREE.Vector3());
    m.onBeforeCompile=sh=>{
      sh.uniforms.uHeadC={value:c};sh.uniforms.uFaceBlend={value:blend};
      sh.vertexShader="uniform vec3 uHeadC;\nuniform float uFaceBlend;\n"+sh.vertexShader.replace("#include <beginnormal_vertex>",
        "vec3 objectNormal = normalize( mix( vec3( normal ), normalize( position - uHeadC ), uFaceBlend ) );\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3( tangent.xyz );\n#endif");
    };
    m.customProgramCacheKey=()=>"faceSmooth";
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
  // root: 불러온 모델, L: {hemi,key,back} 조명. 반환: 바꾼 재질 수 등 (보고서·확인용)
  function apply(cfg,root,L){
    if(!cfg)return null;
    lights(cfg,L);
    const grads={},made={},info={toon:0,kept:0};
    root.traverse(o=>{
      if(!o.isMesh)return;
      const kind=kindOf(cfg,o.material.name||"");
      if(!kind){info.kept++;return}
      const g=grads[kind.key]||(grads[kind.key]=gradient(cfg,kind));
      let m=made[o.material.uuid];
      if(!m){m=made[o.material.uuid]=toon(o.material,g);smoothFace(m,o.geometry,kind.normalBlend||0)}
      m.userData.kind=kind.key;o.material=m;info.toon++;
    });
    return info;
  }
  return{apply};
})();
