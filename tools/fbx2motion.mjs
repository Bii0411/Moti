// XSTAGE FBX → moti 모션 JSON (motions/*.json, index.html 의 xsApply 가 읽는 형식)
// 쓰는 법: (한 번만) npm i three@0.160.0  →  node tools/fbx2motion.mjs <입력.fbx> <출력.json>
// 담는 것: 몸의 주요 뼈 20개의 프레임별 세계 회전(기준 자세 대비), 기준 자세의 뼈 방향(dir), 골반 이동(골반 높이 대비 비율)
// 기준 자세 = FBX 의 바인드 자세(T자). 원본 FBX 는 저장소에 넣지 않는다(.gitignore)
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
const missing = Object.keys(MAP).filter(n => !bone[n]);

const r3 = x => Math.round(x * 1000) / 1000 || 0, r4 = x => Math.round(x * 10000) / 10000 || 0;
const wq = n => bone[n].getWorldQuaternion(new THREE.Quaternion());
const wp = n => bone[n].getWorldPosition(new THREE.Vector3());

// 기준 자세(바인드): 애니메이션을 걸기 전
g.updateMatrixWorld(true);
const restQ = {}, dir = {};
for (const n of found) restQ[n] = wq(n).invert();
for (const n of found) if (CHILD[n] && bone[CHILD[n]]) { const d = wp(CHILD[n]).sub(wp(n)).normalize(); dir[MAP[n]] = [r4(d.x), r4(d.y), r4(d.z)]; }
const hipRest = wp("Hips"), hipH = hipRest.y;

const mixer = new THREE.AnimationMixer(g);
mixer.clipAction(clip).play();
const frames = Math.max(1, Math.round(clip.duration * FPS));
const tracks = {}; for (const n of found) tracks[MAP[n]] = [];
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
  const p = wp("Hips"); if (!hip0) hip0 = p.clone();
  // 앞뒤·좌우는 첫 프레임 대비, 위아래는 기준 자세 대비. 모두 골반 높이로 나눔
  hip.push(r3((p.x - hip0.x) / hipH), r3((p.y - hipRest.y) / hipH), r3((p.z - hip0.z) / hipH));
}
const json = { name: clip.name, src: inp.split("/").pop(), fps: FPS, frames, duration: clip.duration, dir, tracks, hip, found, anims: g.animations.length };
fs.writeFileSync(out, JSON.stringify(json));
console.log(JSON.stringify({ 파일: json.src, 길이초: +clip.duration.toFixed(2), 프레임: frames, 뼈: found.length, 없는뼈: missing, 첫프레임_기준자세와_차이도: Math.round(f0max), KB: Math.round(fs.statSync(out).size / 1024) }));
