// XSTAGE FBX → moti 모션 JSON (motions/*.json, index.html 의 xsApply 가 읽는 형식)
// 쓰는 법: (한 번만) npm i three@0.160.0  →  node tools/fbx2motion.mjs <입력.fbx> <출력.json>
// 담는 것: 몸의 주요 뼈 20개의 프레임별 세계 회전(기준 자세 대비), 기준 자세의 뼈 방향(dir), 골반 이동(골반 높이 대비 비율)
// 기준 자세 = FBX 의 바인드 자세(T자). 원본 FBX 는 저장소에 넣지 않는다(.gitignore)
// 45-1: 손가락 뼈(엄지·검지·중지·약지·새끼 × 3마디, 양손)도 담는다(fingers). 키는 서아 VRoid 뼈 이름(J_Bip_R_Index1 …).
//   크기 줄이기: 손에 대해 기준 자세에서 FDROP° 넘게 벗어나지 않는 손가락 뼈는 뺌(앱에서 기본 손 그대로), 내내 FHOLD° 안에서만 변하면 한 프레임만(hold),
//   나머지는 FFPS 로 솎음(tracks). 값은 사원수 x·y·z 만 FSCALE 배 정수(w 는 0 이상으로 맞춰 두어 앱이 √(1−x²−y²−z²) 로 되살림).
//   원본에 손가락 뼈가 없으면 fingers 를 넣지 않음(지금처럼 기본 손)
import fs from "fs";
globalThis.self = globalThis;
globalThis.document = { createElementNS: () => ({ style: {}, addEventListener() {}, removeEventListener() {}, setAttribute() {} }) };
const THREE = await import("three");
const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");

const FPS = 30;
// 원본 뼈 이름 → JSON 키 (index.html XORD 와 같은 이름)
const MAP = { Hips: "Hips", Spine: "Spine", Spine1: "Spine01", Spine2: "Spine02", Neck: "neck", Head: "Head",
  RightShoulder: "RightShoulder", RightArm: "RightArm", RightForeArm: "RightForeArm", RightHand: "RightHand",
  LeftShoulder: "LeftShoulder", LeftArm: "LeftArm", LeftForeArm: "LeftForeArm", LeftHand: "LeftHand",
  LeftUpLeg: "LeftUpLeg", LeftLeg: "LeftLeg", LeftFoot: "LeftFoot", RightUpLeg: "RightUpLeg", RightLeg: "RightLeg", RightFoot: "RightFoot" };
// 뼈 방향을 잴 때 쓰는 자식 뼈 (원본 이름)
const CHILD = { Hips: "Spine", Spine: "Spine1", Spine1: "Spine2", Spine2: "Neck", Neck: "Head",
  RightShoulder: "RightArm", RightArm: "RightForeArm", RightForeArm: "RightHand", RightHand: "RightHandMiddle1",
  LeftShoulder: "LeftArm", LeftArm: "LeftForeArm", LeftForeArm: "LeftHand", LeftHand: "LeftHandMiddle1",
  LeftUpLeg: "LeftLeg", LeftLeg: "LeftFoot", LeftFoot: "LeftToeBase", RightUpLeg: "RightLeg", RightLeg: "RightFoot", RightFoot: "RightToeBase" };

// 45-1 손가락: 원본 이름(RightHandIndex1) → 서아 VRoid 이름(J_Bip_R_Index1). 3마디 끝 뼈는 원본·서아 모두 없어서 3마디 방향은 2마디 방향을 씀(앱)
const FDROP = 2, FHOLD = +(process.env.FHOLD || 1.5), FFPS = +(process.env.FFPS || 15), FSCALE = +(process.env.FSCALE || 100);
const FMAP = {}, FCHILD = {};
for (const [S, s] of [["Right", "R"], ["Left", "L"]]) for (const [F, f] of [["Thumb", "Thumb"], ["Index", "Index"], ["Middle", "Middle"], ["Ring", "Ring"], ["Pinky", "Little"]])
  for (let i = 1; i <= 3; i++) { FMAP[`${S}Hand${F}${i}`] = `J_Bip_${s}_${f}${i}`; if (i < 3) FCHILD[`${S}Hand${F}${i}`] = `${S}Hand${F}${i + 1}`; }

const [inp, out] = process.argv.slice(2);
if (!inp || !out) { console.error("쓰는 법: node tools/fbx2motion.mjs <입력.fbx> <출력.json>"); process.exit(1); }
const warn = console.warn; console.warn = (...a) => { if (!String(a[0]).includes("FBXLoader")) warn(...a); };
const buf = fs.readFileSync(inp);
const g = new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "");
const clip = g.animations[0];
if (!clip) { console.error("애니메이션이 없는 FBX"); process.exit(1); }

// 뼈 찾기 (같은 이름이 둘이면 먼저 나온 것)
const bone = {};
g.traverse(o => { if (o.isBone && !bone[o.name]) bone[o.name] = o; });
const found = Object.keys(MAP).filter(n => bone[n]);
const ffound = Object.keys(FMAP).filter(n => bone[n] && bone[n.startsWith("Right") ? "RightHand" : "LeftHand"]);
const missing = Object.keys(MAP).filter(n => !bone[n]);

const r3 = x => Math.round(x * 1000) / 1000 || 0, r4 = x => Math.round(x * 10000) / 10000 || 0;
const wq = n => bone[n].getWorldQuaternion(new THREE.Quaternion());
const wp = n => bone[n].getWorldPosition(new THREE.Vector3());

// 기준 자세(바인드): 애니메이션을 걸기 전
g.updateMatrixWorld(true);
const restQ = {}, dir = {};
for (const n of found) restQ[n] = wq(n).invert();
for (const n of found) if (CHILD[n] && bone[CHILD[n]]) { const d = wp(CHILD[n]).sub(wp(n)).normalize(); dir[MAP[n]] = [r4(d.x), r4(d.y), r4(d.z)]; }
const fdir = {};
for (const n of ffound) { restQ[n] = wq(n).invert(); if (FCHILD[n] && bone[FCHILD[n]]) { const d = wp(FCHILD[n]).sub(wp(n)).normalize(); fdir[FMAP[n]] = [r4(d.x), r4(d.y), r4(d.z)]; } }
const handOf = n => n.startsWith("Right") ? "RightHand" : "LeftHand";
const hipRest = wp("Hips"), hipH = hipRest.y;

const mixer = new THREE.AnimationMixer(g);
mixer.clipAction(clip).play();
const frames = Math.max(1, Math.round(clip.duration * FPS));
const tracks = {}; for (const n of found) tracks[MAP[n]] = [];
const fraw = {}; for (const n of ffound) fraw[n] = [];  // 손가락: 프레임마다 기준 자세 대비 세계 회전(아직 솎지 않음)
const fdev = {}; for (const n of ffound) fdev[n] = 0;   // 손에 대해 기준 자세에서 벗어난 가장 큰 각도
const hip = []; let hip0 = null, f0max = 0;
for (let f = 0; f < frames; f++) {
  mixer.setTime(Math.min(f / FPS, clip.duration - 1e-4));
  g.updateMatrixWorld(true);
  for (const n of found) {
    const q = wq(n).multiply(restQ[n]);  // 기준 자세 대비 세계 회전
    if (q.w < 0) { q.x = -q.x; q.y = -q.y; q.z = -q.z; q.w = -q.w; }
    if (f === 0) f0max = Math.max(f0max, 2 * Math.acos(Math.min(1, q.w)) * 180 / Math.PI);
    tracks[MAP[n]].push(r3(q.x), r3(q.y), r3(q.z), r3(q.w));
  }
  for (const n of ffound) {
    const q = wq(n).multiply(restQ[n]); if (q.w < 0) { q.x = -q.x; q.y = -q.y; q.z = -q.z; q.w = -q.w; }
    const h = handOf(n), qh = bone[h] ? wq(h).multiply(restQ[h]) : new THREE.Quaternion();
    fdev[n] = Math.max(fdev[n], q.angleTo(qh) * 180 / Math.PI); fraw[n].push(q);
  }
  const p = wp("Hips"); if (!hip0) hip0 = p.clone();
  // 앞뒤·좌우는 첫 프레임 대비, 위아래는 기준 자세 대비. 모두 골반 높이로 나눔
  hip.push(r3((p.x - hip0.x) / hipH), r3((p.y - hipRest.y) / hipH), r3((p.z - hip0.z) / hipH));
}
// 45-1 손가락 솎기
const rd = x => Math.round(x * FSCALE) || 0;
const enc = q => { if (q.w < 0) { q = q.clone(); q.x = -q.x; q.y = -q.y; q.z = -q.z; q.w = -q.w; } return [rd(q.x), rd(q.y), rd(q.z)]; };
const fingers = { fps: FFPS, scale: FSCALE, dir: {}, tracks: {}, hold: {} }, fstat = { drop: [], hold: [], track: [] };
const step = Math.max(1, Math.round(FPS / FFPS));
for (const n of ffound) {
  const key = FMAP[n], L = fraw[n];
  if (fdev[n] < FDROP) { fstat.drop.push(key); continue; }
  const var0 = Math.max(...L.map(q => q.angleTo(L[0]) * 180 / Math.PI));
  if (var0 < FHOLD) { const q = L[0]; fingers.hold[key] = enc(q); fstat.hold.push(key); continue; }
  const a = []; for (let f = 0; f < frames; f += step) a.push(...enc(L[f]));
  if ((frames - 1) % step) a.push(...enc(L[frames - 1]));  // 끝 프레임도
  fingers.tracks[key] = a; fstat.track.push(key);
}
// 방향(dir)은 그 뼈나 다음 마디를 쓸 때 담음(3마디는 끝 뼈가 없어 앱이 2마디 방향을 씀)
const used = k => !!(fingers.tracks[k] || fingers.hold[k]);
for (const k in fdir) if (used(k) || used(k.replace(/\d$/, d => +d + 1))) fingers.dir[k] = fdir[k];
const json = { name: clip.name, src: inp.split("/").pop(), fps: FPS, frames, duration: clip.duration, dir, tracks, hip, found, anims: g.animations.length };
if (fstat.hold.length || fstat.track.length) { json.fingers = fingers; json.fingers.frames = Math.ceil(frames / step) + ((frames - 1) % step ? 1 : 0); }
fs.writeFileSync(out, JSON.stringify(json));
// 크기 비교(보고서용): 몸만 / 손가락을 몸처럼 그대로(30fps·소수점 3자리·30개 모두) / 이번 방식
const bodyOnly = JSON.stringify({ ...json, fingers: undefined }).length;
const naive = {}; for (const n of ffound) { const a = []; for (const q of fraw[n]) a.push(r3(q.x), r3(q.y), r3(q.z), r3(q.w)); naive[FMAP[n]] = a; }
const naiveLen = JSON.stringify({ ...json, fingers: { tracks: naive, dir: fdir } }).length;
console.log(JSON.stringify({ 파일: json.src, 길이초: +clip.duration.toFixed(2), 프레임: frames, 뼈: found.length, 없는뼈: missing, 손가락: ffound.length, 손가락_움직임: fstat.track.length, 손가락_고정: fstat.hold.length, 손가락_뺌: fstat.drop.length, 첫프레임_기준자세와_차이도: Math.round(f0max), KB: Math.round(fs.statSync(out).size / 1024), 몸만KB: Math.round(bodyOnly / 1024), 손가락그대로KB: Math.round(naiveLen / 1024) }));
