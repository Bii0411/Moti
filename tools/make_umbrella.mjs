// 50-2: x30 우산 반응 모션 만들기 — 걷기 한 걸음 → 멈춤 → 올려다보며 씩 (약 3초, 한 파일)
// 쓰는 법: node tools/make_umbrella.mjs  →  motions/xstage_gift_umbrella.json
// 재료(이미 변환된 모션 JSON, 원본 FBX 필요 없음):
//   걷기 motions/xstage_walk.json(x22)  — 한 걸음만. 배우가 앞(+z, 화면 쪽)으로 걸으므로 turn 없이 그대로 다가옴
//   서기 motions/xstage_shake_head_up_down.json(x27 의 원본) — 고개를 끄덕이기 전 가만히 선 구간(2.0초~). 배우가 −7° 를 봐서 +7° 돌려 정면
// 두 파일은 배우(뼈대 기준 방향 dir)가 달라서, 서기 쪽 회전을 걷기 쪽 기준 방향에 맞게 바꿔 담는다(q · R, R = 걷기 dir → 서기 dir).
// 발 고정: 매 프레임 다리 길이로 두 발 위치를 셈하고, 땅에 디딘 발(더 낮은 발)이 제자리에 있도록 골반 앞뒤·좌우를 정한다 → 멈추며 섞을 때 발이 미끄러지지 않음.
//   다리 길이는 골반 높이 대비 허벅지 0.47·정강이 0.47(근사). 앱이 서아 골반 높이를 곱함.
// 숫자는 아래 C 에서 바꿈.
import fs from "fs";
const THREE = await import("three");
const { Quaternion: Q, Vector3: V } = THREE;

const C = {
  walk: "motions/xstage_walk.json", stand: "motions/xstage_shake_head_up_down.json", out: "motions/xstage_gift_umbrella.json",
  walkFrom: 0.567,   // 걷기 파일 시각: 오른발을 디딘 채 왼발이 떨어지는 때(첫 걸음 시작)
  stepEnd: 1.30,     // 걷기 파일 시각: 오른발이 왼발 옆을 지나는 때(멈추기 시작)
  stop: 0.6,         // 걷던 자세 → 서기 자세 섞는 시간(초). 그동안 걷기 시간도 계속 흐름(갑자기 얼지 않게)
  standFrom: 2.0,    // 서기 파일 시각(이 뒤 2.3초는 고개가 거의 가만히 있음)
  standTurn: 7,      // 서기 파일 배우 방향 바로잡기(도)
  legK: 0.5,         // 걷기 다리 각도를 서기 쪽으로 줄이는 몫(1 = 걷기 그대로). 걸음 폭이 줄어 덜 다가옴
  look: { at: 0.45, ramp: 0.5, head: 9, neck: 5, spine: 2 },  // 멈추기 시작 at 초 뒤부터 ramp 초 동안 고개를 듦(도)
  total: 3.0, fps: 30,
  thigh: 0.47, shin: 0.47, hipW: 0.1,
  footZ0: 0.07,      // 기본 자세(앱 코드 자세)에서 발목이 골반보다 앞에 있는 거리(골반 높이 단위, 서아 재어 봄 약 6cm)
};

const W = JSON.parse(fs.readFileSync(C.walk)), S = JSON.parse(fs.readFileSync(C.stand));
const BONES = Object.keys(W.tracks);
const sm = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const UP = new V(0, 1, 0), RX = new V(1, 0, 0);
function sample(J, n, t) { const f = Math.max(0, Math.min(J.frames - 1, t * J.fps)), i = Math.floor(f), j = Math.min(J.frames - 1, i + 1), u = f - i, a = J.tracks[n];
  return new Q(a[i * 4], a[i * 4 + 1], a[i * 4 + 2], a[i * 4 + 3]).slerp(new Q(a[j * 4], a[j * 4 + 1], a[j * 4 + 2], a[j * 4 + 3]), u); }
function hipAt(J, t) { const f = Math.max(0, Math.min(J.frames - 1, t * J.fps)), i = Math.floor(f), j = Math.min(J.frames - 1, i + 1), u = f - i, h = J.hip;
  return [0, 1, 2].map(k => h[i * 3 + k] + (h[j * 3 + k] - h[i * 3 + k]) * u); }
// 서기 → 걷기 기준 방향
const R = {}; for (const n of BONES) R[n] = W.dir[n] && S.dir[n] ? new Q().setFromUnitVectors(new V(...W.dir[n]).normalize(), new V(...S.dir[n]).normalize()) : new Q();
const qTurn = new Q().setFromAxisAngle(UP, C.standTurn * Math.PI / 180);
const standQ = (n, t) => sample(S, n, t).multiply(R[n]).premultiply(qTurn);
const LEG = /UpLeg|Leg|Foot/;

const N = Math.round(C.total * C.fps) + 1, tStop = C.stepEnd - C.walkFrom;
const tracks = {}; for (const n of BONES) tracks[n] = [];
// 멈추는 동안 걷기 시간은 섞는 몫만큼 느려짐(서기 쪽으로 갈수록 걷기가 덜 흐름) → 지나가던 발이 앞으로 너무 나갔다가 끌려 돌아오지 않게
const walkT = t => { if (t <= tStop) return C.walkFrom + t; let w = C.walkFrom + tStop; const dt = 1 / 240; for (let x = tStop; x < t; x += dt) w += dt * (1 - sm((x - tStop) / C.stop)); return w; };
const poses = [];
for (let f = 0; f < N; f++) {
  const t = f / C.fps, wt = walkT(t), st = C.standFrom + Math.max(0, t - tStop), b = sm((t - tStop) / C.stop);
  const lk = sm((t - tStop - C.look.at) / C.look.ramp);
  const P = {};
  for (const n of BONES) {
    const s = standQ(n, st);
    let q = sample(W, n, Math.min(wt, W.duration - .01));
    if (LEG.test(n)) q.slerp(s, 1 - C.legK);
    q.slerp(s, b);
    const lift = { Head: C.look.head, neck: C.look.neck, Spine02: C.look.spine }[n];
    if (lift && lk > 0) q.premultiply(new Q().setFromAxisAngle(RX, -lift * lk * Math.PI / 180));  // 앞(+z)을 볼 때 −x 축 = 고개 들기
    if (q.w < 0) q.set(-q.x, -q.y, -q.z, -q.w);
    P[n] = q;
  }
  const hw = hipAt(W, Math.min(wt, W.duration - .01)), hs = hipAt(S, st);
  poses.push({ P, hy: hw[1] + (hs[1] - hw[1]) * b });
}
// 발 위치(골반 기준, 골반 높이 단위)
const foot = (P, s) => { const d = n => new V(...W.dir[n]).applyQuaternion(P[n]);
  return new V(s === "Left" ? C.hipW : -C.hipW, 0, 0).applyQuaternion(P.Hips).addScaledVector(d(s + "UpLeg"), C.thigh).addScaledVector(d(s + "Leg"), C.shin); };
// 발 고정: 디딘 발(더 낮은 발, 1cm 넘게 낮아질 때만 바꿈)이 땅에서 제자리
let hip = new V(0, 0, 0), stance = null, anchor = null; const hipT = [], log = [];
for (let f = 0; f < N; f++) {
  const { P } = poses[f], L = foot(P, "Left"), Rt = foot(P, "Right");
  const lower = L.y < Rt.y ? "Left" : "Right", off = { Left: L, Right: Rt };
  if (!stance) { stance = lower; hip = new V(0, 0, C.footZ0 - off[stance].z); anchor = hip.clone().add(off[stance]); }  // 첫 프레임 디딘 발을 기본 자세 발 자리(footZ0)에 → 처음 섞기 동안 덜 미끄러짐
  else if (lower !== stance && Math.abs(L.y - Rt.y) > 0.01) { stance = lower; anchor = hip.clone().add(off[stance]); }  // 새 디딘 발 = 지난 골반 기준 지금 자리
  hip = new V(anchor.x - off[stance].x, 0, anchor.z - off[stance].z);
  hipT.push(hip.x, poses[f].hy, hip.z);
  const other = stance === "Left" ? "Right" : "Left", ow = hip.clone().add(off[other]);
  log.push({ t: +(f / C.fps).toFixed(2), stance, hipZ: +hip.z.toFixed(3), footY: { L: +(L.y + 1).toFixed(3), R: +(Rt.y + 1).toFixed(3) }, otherZ: +ow.z.toFixed(3) });
}
const r3 = x => Math.round(x * 1000) / 1000 || 0;
for (let f = 0; f < N; f++) for (const n of BONES) { const q = poses[f].P[n]; tracks[n].push(r3(q.x), r3(q.y), r3(q.z), r3(q.w)); }

// 손가락: 두 파일 모두 15fps. 서기 쪽은 손가락 기준 방향도 걷기 쪽에 맞춤
function fq(J, n, t) { const F = J.fingers, s = F.scale || 100, un = (a, i) => { const x = a[i * 3] / s, y = a[i * 3 + 1] / s, z = a[i * 3 + 2] / s; return new Q(x, y, z, Math.sqrt(Math.max(0, 1 - x * x - y * y - z * z))); };
  if (F.hold && F.hold[n]) return un(F.hold[n], 0); const a = F.tracks && F.tracks[n]; if (!a) return null;
  const M = F.frames || 1, ff = Math.max(0, Math.min(M - 1, t * F.fps)), i = Math.floor(ff), j = Math.min(M - 1, i + 1); return un(a, i).slerp(un(a, j), ff - i); }
const fdirOf = (J, n) => { const k = n.endsWith("3") ? n.replace(/3$/, "2") : n; return J.fingers.dir[k]; };
const fingers = { fps: 15, scale: 100, dir: {}, tracks: {}, hold: {} };
const FN = Object.keys({ ...(W.fingers.tracks || {}), ...(W.fingers.hold || {}) }).filter(n => (S.fingers.tracks || {})[n] || (S.fingers.hold || {})[n]);
const FM = Math.round(C.total * 15) + 1, rd = x => Math.round(x * 100) || 0;
for (const n of FN) {
  const dw = fdirOf(W, n), ds = fdirOf(S, n), Rf = dw && ds ? new Q().setFromUnitVectors(new V(...dw).normalize(), new V(...ds).normalize()) : new Q();
  const a = [];
  for (let k = 0; k < FM; k++) { const t = k / 15, b = sm((t - tStop) / C.stop);
    const q = fq(W, n, Math.min(walkT(t), W.duration - .01)).slerp(fq(S, n, C.standFrom + Math.max(0, t - tStop)).multiply(Rf).premultiply(qTurn), b);
    if (q.w < 0) q.set(-q.x, -q.y, -q.z, -q.w); a.push(rd(q.x), rd(q.y), rd(q.z)); }
  fingers.tracks[n] = a;
}
for (const k in W.fingers.dir) fingers.dir[k] = W.fingers.dir[k];
fingers.frames = FM;
const json = { name: "gift_umbrella", src: `${W.src} ${C.walkFrom}~${C.stepEnd}s + ${S.src} ${C.standFrom}s~ (tools/make_umbrella.mjs)`, fps: C.fps, frames: N, duration: (N - 1) / C.fps,
  dir: W.dir, tracks, hip: hipT.map(r3), found: W.found, anims: 1, fingers };
fs.writeFileSync(C.out, JSON.stringify(json));
if (process.argv.includes("--log")) for (const l of log) if (Math.round(l.t * 30) % 3 === 0) console.log(JSON.stringify(l));
console.log(JSON.stringify({ 파일: C.out, 초: json.duration, KB: Math.round(fs.statSync(C.out).size / 1024), 멈추기시작: +tStop.toFixed(2), 다가온거리_골반높이: r3(hipT[hipT.length - 1]) }));
