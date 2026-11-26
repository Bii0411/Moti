// 86-2: 변환된 XSTAGE 모션 JSON(tools/fbx2motion.mjs 결과)에서 뼈마다 「세로에서 기운 각도」를 같은 비율로 줄임 → 새 JSON
// 쓰는 법: node tools/xs_tilt_scale.mjs <입력.json> <출력.json> '{"뼈":최대도,…}' [따라갈 뼈=Spine02]
// 왜: index.html xsApply 의 tiltMax 는 넘는 만큼 「잘라」 버려서, 고개를 깊이 숙였다(80°) → 들었다(20°) → 다시 숙이는(87°) 모션(x26 구급상자)이
//   26° → 19° → 26° 로 납작해져 움직임이 거의 안 보임. 여기서는 모션 전체에서 가장 크게 기운 순간이 그 값이 되도록 모든 프레임을 같은 비율로 줄여
//   숙였다 드는 폭(리듬)이 남게 함.
// 방법: 뼈의 세계 위쪽 방향 u 가 세로에서 기운 각 θ 를 재서 θ' = θ·k(k = 최대도 / 모션 전체 최대 θ, 이미 안이면 1)가 되게
//   「u 와 세로가 이루는 면에 수직인 가로축」으로 돌림(tiltMax 와 같은 축 — 고개를 옆으로 돌린 것(세로축 회전)은 그대로 남음. xs_upright 처럼 몸의 옆 축으로 돌리면
//   옆으로 돌린 고개가 갸웃(roll)으로 바뀌어서 이 방식). 어깨·팔·손·손가락은 「따라갈 뼈」와 같은 만큼 같이 돌려 몸에 대한 팔 자세를 그대로 둠.
//   다리·골반 이동은 손대지 않음. 원본 FBX·입력 JSON 은 그대로.
import fs from "fs";

const [inp, out, limArg, followArg] = process.argv.slice(2);
if (!inp || !out || !limArg) { console.error("쓰는 법: node tools/xs_tilt_scale.mjs <입력.json> <출력.json> '{\"뼈\":최대도,…}' [따라갈 뼈]"); process.exit(1); }
const LIM = JSON.parse(limArg), FOLLOW = followArg || "Spine02";
const ARMS = ["RightShoulder", "RightArm", "RightForeArm", "RightHand", "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand"];
const d = JSON.parse(fs.readFileSync(inp, "utf8"));

const mul = (a, b) => [a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1], a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0], a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3], a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
const rot = (q, v) => { const p = mul(mul(q, [v[0], v[1], v[2], 0]), [-q[0], -q[1], -q[2], q[3]]); return [p[0], p[1], p[2]]; };
const aa = (ax, a) => { const s = Math.sin(a / 2); return [ax[0]*s, ax[1]*s, ax[2]*s, Math.cos(a / 2)]; };
const norm = q => { const l = Math.hypot(...q) || 1; let r = q.map(x => x / l); if (r[3] < 0) r = r.map(x => -x); return r; };
const r3 = x => Math.round(x * 1000) / 1000 || 0;
const D = r => r * 180 / Math.PI;

const N = d.frames, get = (n, i) => d.tracks[n].slice(i * 4, i * 4 + 4);
const tilt = q => { const u = rot(q, [0, 1, 0]); return { th: Math.acos(Math.max(-1, Math.min(1, u[1]))), u }; };
const K = {};
for (const n in LIM) { if (!d.tracks[n]) continue; let mx = 0; for (let i = 0; i < N; i++) mx = Math.max(mx, tilt(get(n, i)).th);
  K[n] = { k: D(mx) > LIM[n] ? LIM[n] / D(mx) : 1, max: D(mx) }; }
const corr = [], stat = {};
for (let i = 0; i < N; i++) {
  for (const n in K) {
    const q = get(n, i), { th, u } = tilt(q), ax = [-u[2], 0, u[0]], l = Math.hypot(ax[0], ax[2]);
    let c = [0, 0, 0, 1];
    if (l > 1e-6 && K[n].k < 1) c = aa([ax[0] / l, 0, ax[2] / l], th * (1 - K[n].k));  // u 를 세로 쪽으로 th·(1−k) 만큼
    d.tracks[n].splice(i * 4, 4, ...norm(mul(c, q)).map(r3));
    if (n === FOLLOW) corr[i] = c;
    const s = stat[n] || (stat[n] = { a: 0, b: 0 }); s.a = Math.max(s.a, D(th)); s.b = Math.max(s.b, D(tilt(get(n, i)).th));
  }
  if (corr[i]) for (const n of ARMS) if (d.tracks[n]) d.tracks[n].splice(i * 4, 4, ...norm(mul(corr[i], get(n, i))).map(r3));
}
// 손가락(사원수 x·y·z × scale 정수, 몸보다 낮은 fps). hold(한 프레임)는 따라 돌릴 수 없어 프레임마다 담는 tracks 로 바꿈
const F = d.fingers;
if (F && corr.length) {
  const s = F.scale || 100, step = Math.max(1, Math.round(d.fps / (F.fps || 15))), M = Math.ceil(N / step);
  const dec = (a, k) => { const x = a[k*3]/s, y = a[k*3+1]/s, z = a[k*3+2]/s; return [x, y, z, Math.sqrt(Math.max(0, 1 - x*x - y*y - z*z))]; };
  const enc = q => { q = norm(q); return [Math.round(q[0]*s) || 0, Math.round(q[1]*s) || 0, Math.round(q[2]*s) || 0]; };
  for (const n of Object.keys(F.hold || {})) { const h = F.hold[n], a = []; for (let k = 0; k < M; k++) a.push(...h); F.tracks[n] = a; delete F.hold[n]; }
  for (const n in F.tracks) { const a = F.tracks[n], Kf = a.length / 3, o = [];
    for (let k = 0; k < Kf; k++) o.push(...enc(mul(corr[k === Kf - 1 ? N - 1 : Math.min(N - 1, k * step)] || [0, 0, 0, 1], dec(a, k))));
    F.tracks[n] = o; }
}
d._tiltScale = { from: inp.split(/[\\/]/).pop(), lim: LIM, follow: FOLLOW, note: "86-2 tools/xs_tilt_scale.mjs: 뼈마다 세로에서 기운 각도를 같은 비율로 줄임(가장 큰 기울기 = lim, 옆으로 돌린 것은 그대로)" };
fs.writeFileSync(out, JSON.stringify(d));
const o = {}; for (const n in stat) o[n] = `${Math.round(stat[n].a)}°→${Math.round(stat[n].b)}° (×${K[n].k.toFixed(2)})`;
console.log(JSON.stringify({ 파일: out.split(/[\\/]/).pop(), 프레임: N, 최대기울기: o, KB: Math.round(fs.statSync(out).size / 1024) }));
