// 86-1: 변환된 XSTAGE 모션 JSON(tools/fbx2motion.mjs 결과)에서 정한 구간 동안 두 팔을 어깨를 축으로 바깥쪽으로 조금 벌림 → 새 JSON
// 쓰는 법: node tools/xs_arms_out.mjs <입력.json> <출력.json> <시작초> <다 벌린 초> <벌림 도> [<거둘 초> <다 거둔 초>] [<팔꿈치 들기 도>]
// 왜: 「Lovely - Receive candy 1」(x31 반지 반응)은 원본 배우가 사탕을 가슴 앞에서 두 손을 거의 맞붙여 쥠(손 사이 약 7cm).
//   서아는 어깨가 좁고 소매가 두꺼워 같은 세계 회전을 주면 두 아래팔이 가슴 앞에서 X 자로 겹쳐(팔짱·거절처럼 보임) 관통함.
// 방법: 왼팔·오른팔 각각 상완(Arm)·하완(ForeArm)·손(Hand)·그 손의 손가락(fingers)의 프레임별 세계 회전(기준 자세 대비) 앞에
//   세로축 회전(왼팔 +, 오른팔 −: 손이 바깥으로)과 몸의 앞축 회전(팔꿈치를 옆으로 조금 듦)을 곱함 = 어깨 관절을 축으로 팔 전체를 그대로 돌림
//   (팔 안의 굽힘·손목·손가락 자세는 그대로). 몸의 방향(골반 yaw)을 따라 축을 돌림. 구간 앞뒤는 부드럽게(smoothstep) 들어가고 빠짐.
//   어깨(Shoulder)·몸통·다리·골반 이동은 손대지 않음. 원본 FBX·변환 원본 JSON 은 그대로.
import fs from "fs";

const [inp, out, a0, a1, deg, b0, b1, liftDeg] = process.argv.slice(2);
if (!inp || !out || a0 == null || a1 == null || deg == null) { console.error("쓰는 법: node tools/xs_arms_out.mjs <입력.json> <출력.json> <시작초> <다 벌린 초> <벌림 도> [<거둘 초> <다 거둔 초>] [<팔꿈치 들기 도>]"); process.exit(1); }
const d = JSON.parse(fs.readFileSync(inp, "utf8"));
const T0 = +a0, T1 = +a1, AMT = +deg * Math.PI / 180, LIFT = (+liftDeg || 0) * Math.PI / 180, has = v => v != null && v !== "", E0 = has(b0) ? +b0 : Infinity, E1 = has(b1) ? +b1 : Infinity;

const mul = (a, b) => [a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1], a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0], a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3], a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
const rot = (q, v) => { const p = mul(mul(q, [v[0], v[1], v[2], 0]), [-q[0], -q[1], -q[2], q[3]]); return [p[0], p[1], p[2]]; };
const aa = (ax, a) => { const s = Math.sin(a / 2); return [ax[0]*s, ax[1]*s, ax[2]*s, Math.cos(a / 2)]; };
const norm = q => { const l = Math.hypot(...q) || 1; let r = q.map(x => x / l); if (r[3] < 0) r = r.map(x => -x); return r; };
const r3 = x => Math.round(x * 1000) / 1000 || 0;
const ss = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

const N = d.frames, get = (n, i) => d.tracks[n].slice(i * 4, i * 4 + 4);
const w = t => ss((t - T0) / Math.max(1e-6, T1 - T0)) * (Number.isFinite(E0) ? 1 - ss((t - E0) / Math.max(1e-6, E1 - E0)) : 1);
// 프레임별 보정 회전(왼팔·오른팔). 앞축 = 골반이 보는 방향
const C = { L: [], R: [] };
for (let i = 0; i < N; i++) {
  const k = w(i / d.fps), fw = rot(get("Hips", i), [0, 0, 1]), yaw = Math.atan2(fw[0], fw[2]), f = [Math.sin(yaw), 0, Math.cos(yaw)];
  // 왼팔(배우 +x 쪽): 세로축 + 로 돌리면 앞(+z)에 있던 손이 +x(바깥)로. 팔꿈치 들기 = 앞축으로 바깥이 위로
  C.L[i] = mul(aa([0, 1, 0], AMT * k), aa(f, -LIFT * k));
  C.R[i] = mul(aa([0, 1, 0], -AMT * k), aa(f, LIFT * k));
}
const SIDE = { L: ["LeftArm", "LeftForeArm", "LeftHand"], R: ["RightArm", "RightForeArm", "RightHand"] };
for (const s in SIDE) for (const n of SIDE[s]) for (let i = 0; i < N; i++) d.tracks[n].splice(i * 4, 4, ...norm(mul(C[s][i], get(n, i))).map(r3));
// 손가락(J_Bip_L_* / J_Bip_R_*): 사원수 x·y·z × scale 정수, fps 가 몸보다 낮음. hold(한 프레임)는 프레임마다 담는 tracks 로 바꿈
const F = d.fingers;
if (F) {
  const sc = F.scale || 100, step = Math.max(1, Math.round(d.fps / (F.fps || 15)));
  const dec = (a, k) => { const x = a[k*3]/sc, y = a[k*3+1]/sc, z = a[k*3+2]/sc; return [x, y, z, Math.sqrt(Math.max(0, 1 - x*x - y*y - z*z))]; };
  const enc = q => { q = norm(q); return [Math.round(q[0]*sc) || 0, Math.round(q[1]*sc) || 0, Math.round(q[2]*sc) || 0]; };
  const M = Math.ceil(N / step);
  for (const n of Object.keys(F.hold || {})) { const h = F.hold[n], a = []; for (let k = 0; k < M; k++) a.push(...h); F.tracks[n] = a; delete F.hold[n]; }
  for (const n in F.tracks) { const s = /_L_/.test(n) ? "L" : /_R_/.test(n) ? "R" : null; if (!s) continue; const a = F.tracks[n], K = a.length / 3, o = [];
    for (let k = 0; k < K; k++) o.push(...enc(mul(C[s][k === K - 1 ? N - 1 : Math.min(N - 1, k * step)], dec(a, k))));
    F.tracks[n] = o; }
}
d._armsOut = { from: inp.split(/[\\/]/).pop(), in: [T0, T1], out: [E0, E1].filter(Number.isFinite), deg: +deg, lift: +liftDeg || 0, note: "86-1 tools/xs_arms_out.mjs: 구간 동안 두 팔을 어깨를 축으로 바깥으로 벌림(세로축 deg, 앞축 lift)" };
fs.writeFileSync(out, JSON.stringify(d));
console.log(JSON.stringify({ 파일: out.split(/[\\/]/).pop(), 프레임: N, 구간: [T0, T1, E0, E1], 벌림: +deg, 팔꿈치: +liftDeg || 0, KB: Math.round(fs.statSync(out).size / 1024) }));
