// 84-1: 변환된 XSTAGE 모션 JSON(tools/fbx2motion.mjs 결과)의 상체·목·머리 앞뒤 기울기만 부드럽게 줄임 → 새 JSON
// 쓰는 법: node tools/xs_upright.mjs <입력.json> <출력.json>
// 왜: AI 생성 웃음(smile_haveto_fix)은 웃을 때 허리·가슴·목을 뒤로 30° 넘게, 머리를 60° 가까이 젖혀 얼굴이 안 보임.
//   index.html xsApply 의 tiltMax 는 「세로에서 기운 각도」를 앞뒤·좌우 가리지 않고 자르고, damp 는 그 뼈의 모든 움직임을 같이 줄임.
//   여기서는 뒤로 젖히는 것(과 깊게 숙이는 것)만 골라 줄이고 좌우 기울기·몸 돌리기·어깨 들썩임은 그대로 둠.
// 방법: 뼈마다 프레임별 세계 회전(기준 자세 대비)의 「앞뒤 기울기」 p(골반이 보는 방향 기준, 앞 + / 뒤 −)를 재서
//   가장 크게 젖힌(숙인) 순간이 L 이 되게 같은 비율로 줄이고(p' = p·L/최대, 뒤는 LB·앞은 LF, 이미 L 안이면 그대로), 그 차이만큼 몸의 옆 축으로 돌림
//   (작은 들썩임도 같은 비율로 남아 웃음 리듬이 살아 있음. tanh 처럼 자르면 젖힌 동안 내내 같은 각도라 리듬이 사라짐).
//   어깨·팔·손·손가락은 가슴(Spine02)과 같은 만큼 같이 돌려 몸에 대한 팔 자세를 그대로 둠. 다리·골반 이동은 손대지 않음.
// 원본 FBX·변환 원본 JSON 은 그대로. 값(LB·LF)은 아래 표(모션마다 다르면 표를 바꿔 다시 만듦)
import fs from "fs";

const LIM = {  // 뼈: [뒤로 최대(도), 앞으로 최대(도)] — 모션 전체에서 가장 크게 기운 순간이 이 값이 됨
  Hips: [4, 8], Spine: [4, 8], Spine01: [4, 10], Spine02: [5, 14], neck: [5, 14], Head: [4, 16] };
const FOLLOW = "Spine02";  // 팔 쪽 뼈가 따라가는 뼈
const ARMS = ["RightShoulder", "RightArm", "RightForeArm", "RightHand", "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand"];

const [inp, out] = process.argv.slice(2);
if (!inp || !out) { console.error("쓰는 법: node tools/xs_upright.mjs <입력.json> <출력.json>"); process.exit(1); }
const d = JSON.parse(fs.readFileSync(inp, "utf8"));

const mul = (a, b) => [a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1], a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0], a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3], a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
const rot = (q, v) => { const p = mul(mul(q, [v[0], v[1], v[2], 0]), [-q[0], -q[1], -q[2], q[3]]); return [p[0], p[1], p[2]]; };
const aa = (ax, a) => { const s = Math.sin(a / 2); return [ax[0]*s, ax[1]*s, ax[2]*s, Math.cos(a / 2)]; };
const norm = q => { const l = Math.hypot(...q) || 1; let r = q.map(x => x / l); if (r[3] < 0) r = r.map(x => -x); return r; };
const r3 = x => Math.round(x * 1000) / 1000 || 0;

const D = r => r * 180 / Math.PI;

const N = d.frames, get = (n, i) => d.tracks[n].slice(i * 4, i * 4 + 4);
const corr = [];  // 프레임별 가슴 보정(팔·손가락이 따라감)
const frame = i => { const fw = rot(get("Hips", i), [0, 0, 1]), yaw = Math.atan2(fw[0], fw[2]);
  return { side: [Math.cos(yaw), 0, -Math.sin(yaw)], fwd: [Math.sin(yaw), 0, Math.cos(yaw)] }; };  // 몸의 옆 축(이 축으로 + 돌리면 앞으로 숙임)·앞
const pitch = (n, i, f) => { const u = rot(get(n, i), [0, 1, 0]); return Math.atan2(u[0]*f.fwd[0] + u[2]*f.fwd[2], u[1]); };
const K = {};  // 뼈마다 [뒤 비율, 앞 비율]
for (const n in LIM) { if (!d.tracks[n]) continue; let b = 0, a = 0;
  for (let i = 0; i < N; i++) { const p = D(pitch(n, i, frame(i))); b = Math.min(b, p); a = Math.max(a, p); }
  K[n] = [b < -LIM[n][0] ? LIM[n][0] / -b : 1, a > LIM[n][1] ? LIM[n][1] / a : 1]; }
const soft = (n, p) => p * (p < 0 ? K[n][0] : K[n][1]);  // 이름은 예전 그대로(부드럽게 줄임)
const stat = {};
for (let i = 0; i < N; i++) {
  const f = frame(i), side = f.side;
  for (const n in LIM) {
    if (!d.tracks[n]) continue;
    const q = get(n, i), p = pitch(n, i, f), p2 = soft(n, p);
    const c = aa(side, p2 - p), nq = norm(mul(c, q));
    d.tracks[n].splice(i * 4, 4, ...nq.map(r3));
    if (n === FOLLOW) corr[i] = c;
    const s = stat[n] || (stat[n] = { back: 0, fwd: 0, back2: 0, fwd2: 0 });
    s.back = Math.min(s.back, D(p)); s.fwd = Math.max(s.fwd, D(p)); s.back2 = Math.min(s.back2, D(p2)); s.fwd2 = Math.max(s.fwd2, D(p2));
  }
  for (const n of ARMS) if (d.tracks[n] && corr[i]) d.tracks[n].splice(i * 4, 4, ...norm(mul(corr[i], get(n, i))).map(r3));
}
// 손가락(fingers: 사원수 x·y·z × scale 정수, fps 가 몸보다 낮음). hold(한 프레임)는 따라 돌릴 수 없어 프레임마다 담는 tracks 로 바꿈
const F = d.fingers;
if (F && corr.length) {
  const s = F.scale || 100, step = Math.max(1, Math.round(d.fps / (F.fps || 15)));
  const dec = (a, k) => { const x = a[k*3]/s, y = a[k*3+1]/s, z = a[k*3+2]/s; return [x, y, z, Math.sqrt(Math.max(0, 1 - x*x - y*y - z*z))]; };
  const enc = q => { q = norm(q); return [Math.round(q[0]*s) || 0, Math.round(q[1]*s) || 0, Math.round(q[2]*s) || 0]; };
  const fi = k => Math.min(N - 1, k * step >= N ? N - 1 : k * step);  // 손가락 프레임 k → 몸 프레임
  for (const n of Object.keys(F.hold || {})) { const h = F.hold[n], a = []; for (let k = 0; k < F.frames; k++) a.push(...h); F.tracks[n] = a; delete F.hold[n]; }
  for (const n in F.tracks) { const a = F.tracks[n], M = a.length / 3, o = [];
    for (let k = 0; k < M; k++) o.push(...enc(mul(corr[k === M - 1 ? N - 1 : fi(k)], dec(a, k))));
    F.tracks[n] = o; }
}
d._upright = { from: inp.split(/[\\/]/).pop(), lim: LIM, k: K, follow: FOLLOW, note: "84-1 tools/xs_upright.mjs: 앞뒤 기울기만 같은 비율로 줄임(가장 큰 기울기 = lim)" };
fs.writeFileSync(out, JSON.stringify(d));
const o = {}; for (const n in stat) o[n] = `뒤 ${Math.round(stat[n].back)}→${Math.round(stat[n].back2)} · 앞 ${Math.round(stat[n].fwd)}→${Math.round(stat[n].fwd2)}`;
console.log(JSON.stringify({ 파일: out.split(/[\\/]/).pop(), 프레임: N, 기울기: o, KB: Math.round(fs.statSync(out).size / 1024) }, null, 1));
