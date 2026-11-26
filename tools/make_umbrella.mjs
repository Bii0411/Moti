// x30 우산 반응 모션 만들기 (50-2 처음 만듦 · 50-3 제자리 반 걸음 · 86-2 실제로 두 걸음 다가왔다 돌아감)
// 쓰는 법: node tools/make_umbrella.mjs  →  motions/xstage_gift_umbrella.json
// 86-2: 50-3 판은 골반을 옮기지 않고 카메라가 다가가 「가까워진 느낌」을 냈는데, 컬렉션에서 보면 걸어오는 느낌이 없었음.
//   이제 서아가 실제로 사용자 쪽(화면 쪽, +z)으로 작은 두 걸음(왼발 → 오른발 → 왼발을 옆에 모음) 다가와 멈추고, 눈을 맞춘 뒤
//   같은 발 디딤을 거꾸로 밟아(작은 뒷걸음 두 번) 처음 자리로 돌아감. 끝에서 골반 위치가 정확히 0 이라 끝 섞기 때 미끄러지지 않음.
// 흐름(이 모션 시각): 0~1.0 우산을 받고 고개를 숙인 채 망설임 → 1.0~1.6 고개를 들어 바라봄 → go[0]~go[1] 두 걸음 다가옴
//   → hold 동안 가까이 서서 눈을 맞춤 → back[0]~back[1] 같은 걸음을 거꾸로(뒷걸음) → 끝까지 제자리에 섬
// 재료(이미 변환된 모션 JSON, 원본 FBX 필요 없음):
//   서기 motions/xstage_shake_head_up_down.json(x27 의 원본) 2.0~5.2초(끄덕이기 전 가만히 선 구간)를 왕복으로 — 배우가 −7° 를 봐서 +7° 돌려 정면
//   걷기 motions/xstage_walk.json(x22) 0.8~1.967초 = 왼발이 오른발 옆을 지나는 순간부터 한 주기(왼발 디딤 → 오른발 디딤 → 다시 왼발이 옆을 지남)
// 걸음 줄이기: 다리 회전을 서기 다리에서 걷기 다리 쪽으로 stride 만큼만(slerp), 골반 앞뒤·좌우 이동도 같은 stride 배.
//   다리 각도가 작을 때는 발 위치가 각도에 거의 비례해서 디딘 발이 거의 미끄러지지 않음(앱에서 디딘 발 위치를 재서 확인).
//   걸음 시간은 처음·끝을 천천히(ease) — 다리 회전과 골반 이동이 같은 「걷기 시각」을 따르므로 빠르기를 바꿔도 발과 골반이 어긋나지 않음.
// 두 파일은 배우(뼈대 기준 방향 dir)가 달라서, 걷기 쪽 회전을 서기 쪽 기준 방향에 맞게 바꿔 담는다(q · R, R = 서기 dir → 걷기 dir).
import fs from "fs";
const THREE = await import("three");
const { Quaternion: Q, Vector3: V } = THREE;

const C = {
  walk: "motions/xstage_walk.json", stand: "motions/xstage_shake_head_up_down.json", out: "motions/xstage_gift_umbrella.json",
  standFrom: 2.0, standTo: 5.2, standTurn: 7,
  cyc: [0.8, 1.967],     // 걷기 파일: 왼발이 가장 높이 들려 오른발 옆을 지남(오른발이 골반 바로 아래) → 왼발 디딤(1.07) → 오른발 디딤(1.67) → 다시 왼발이 옆을 지남. 0.85 에서 시작하면 디딘 오른발이 골반보다 뒤라 섞어 들어갈 때 5cm 미끄러짐
  go: [1.6, 3.4],        // 이 모션 시각: 다가오기
  hold: [3.4, 4.8],      // 가까이 서서 눈을 맞춤
  back: [4.8, 6.2],      // 같은 걸음을 거꾸로(뒷걸음)
  total: 6.6, fps: 30,
  stride: 0.26,          // 걸음 크기(걷기 원본 대비, 다리 회전). 0.42(골반 이동 약 0.46m)는 대화 구도에서 머리 위가 잘려 줄임
  hipK: 1.22,            // 골반 앞뒤·좌우 이동 = 걷기 골반 이동 × stride × hipK. 다리 각도를 줄이면 발이 각도보다 조금 덜 나가서(디딘 발이 뒤로 끌림) 앱에서 디딘 발 위치를 재서 맞춘 값. 원본 한 주기 = 골반 높이 × 1.35 → × 0.26 × 1.22 ≈ 골반 높이 × 0.43(서아 약 0.35m)
  bend: { UpLeg: 1, Leg: 1.7, Foot: 1.4 },  // 뼈마다 stride 에 곱하는 몫: 허벅지는 stride 그대로(걸음 폭), 무릎·발목은 더 굽혀 드는 발이 바닥에 끌리지 않게
  legIn: 0.3,            // 걷기 처음·끝에 서기 다리 ↔ 걷기 다리를 섞는 몫의 시간 비율(걸음 구간 대비)
  arm: 0.35,             // 걷는 동안 팔을 걷기 쪽으로 섞는 몫(× stride 아님, 이 값 그대로 × 걸음 진행 무게)
  look: [  // [시각, 머리, 목, 가슴] 도(+ = 숙임). 사이는 부드럽게
    [0, 13, 6, 2], [1.0, 13, 6, 2], [1.6, -3, -1, 0], [3.4, -5, -2, 0], [4.8, -5, -2, 0], [5.4, 4, 2, 1], [6.6, 0, 0, 0]],
  stance: { Left: -3, Right: 5 },  // 50-3 그대로: 서기 파일의 벌린 발을 앱 기본 자세 발 폭에 맞춤(처음·끝 섞기 때 발이 옆으로 끌리지 않게)
};

const W = JSON.parse(fs.readFileSync(C.walk)), S = JSON.parse(fs.readFileSync(C.stand));
const BONES = Object.keys(S.tracks);
const sm = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const UP = new V(0, 1, 0), RX = new V(1, 0, 0);
function sample(J, n, t) { const f = Math.max(0, Math.min(J.frames - 1, t * J.fps)), i = Math.floor(f), j = Math.min(J.frames - 1, i + 1), u = f - i, a = J.tracks[n];
  return new Q(a[i * 4], a[i * 4 + 1], a[i * 4 + 2], a[i * 4 + 3]).slerp(new Q(a[j * 4], a[j * 4 + 1], a[j * 4 + 2], a[j * 4 + 3]), u); }
function hipAt(J, t) { const f = Math.max(0, Math.min(J.frames - 1, t * J.fps)), i = Math.floor(f), j = Math.min(J.frames - 1, i + 1), u = f - i, h = J.hip;
  return [0, 1, 2].map(k => h[i * 3 + k] + (h[j * 3 + k] - h[i * 3 + k]) * u); }
const R = {}; for (const n of BONES) R[n] = W.dir[n] && S.dir[n] ? new Q().setFromUnitVectors(new V(...S.dir[n]).normalize(), new V(...W.dir[n]).normalize()) : new Q();
const qTurn = new Q().setFromAxisAngle(UP, C.standTurn * Math.PI / 180);
const walkQ = (n, t) => sample(W, n, t).multiply(R[n]);  // 걷기 배우는 처음부터 정면이라 돌리지 않음   // 걷기 회전 → 서기 기준 방향
// 서기 구간 왕복(가만히 선 2.0~5.2초를 오가며 — 오래 멈춰 있지 않게)
const standT = t => { const L = C.standTo - C.standFrom, p = t % (2 * L); return C.standFrom + (p < L ? p : 2 * L - p); };
const standQ = (n, t) => sample(S, n, t).premultiply(qTurn);
const LEGS = /(UpLeg|Leg|Foot)$/;
// 걷기 시각: 다가올 때 cyc[0]→cyc[1], 돌아갈 때 거꾸로. 처음·끝은 천천히(smoothstep)
const ease = k => sm(k);
function phase(t) {
  if (t < C.go[0]) return { tw: C.cyc[0], g: 0, out: 0 };
  if (t < C.go[1]) { const k = (t - C.go[0]) / (C.go[1] - C.go[0]); return { tw: C.cyc[0] + (C.cyc[1] - C.cyc[0]) * ease(k), g: legW(k), out: 1 }; }
  if (t < C.back[0]) return { tw: C.cyc[1], g: 0, out: 1 };
  if (t < C.back[1]) { const k = (t - C.back[0]) / (C.back[1] - C.back[0]); return { tw: C.cyc[1] - (C.cyc[1] - C.cyc[0]) * ease(k), g: legW(k), out: 1 }; }
  return { tw: C.cyc[0], g: 0, out: 0 };
}
function legW(k) { return sm(k / C.legIn) * (1 - sm((k - (1 - C.legIn)) / C.legIn)); }  // 걸음 처음·끝에 서기 다리와 섞임(멈춘 자세는 서기 다리)
const lookAt = t => { const L = C.look; let i = 0; while (i < L.length - 2 && t > L[i + 1][0]) i++; const a = L[i], b = L[i + 1], k = sm((t - a[0]) / Math.max(1e-6, b[0] - a[0])); return [1, 2, 3].map(j => a[j] + (b[j] - a[j]) * k); };
const LOOKB = { Head: 0, neck: 1, Spine02: 2 };
// 그 다리가 들려 있는 정도(0~1): 걷기 파일 무릎 굽힘(허벅지 방향과 정강이 방향 사이 각) 10° 이하 = 디딤, 25° 이상 = 들림
const legDir = (n, t) => new V(...W.dir[n]).normalize().applyQuaternion(sample(W, n, t));
const swingOf = (side, t) => { const a = legDir(side + "UpLeg", t).angleTo(legDir(side + "Leg", t)) * 180 / Math.PI; return sm((a - 10) / 15); };

const N = Math.round(C.total * C.fps) + 1, tracks = {}, hip = [];
for (const n of BONES) tracks[n] = [];
const r3 = x => Math.round(x * 1000) / 1000 || 0;
const h0 = hipAt(W, C.cyc[0]), hs0 = hipAt(S, C.standFrom);
let maxZ = 0;
for (let f = 0; f < N; f++) {
  const t = f / C.fps, st = standT(t), P = phase(t), lk = lookAt(t);
  // 다리 무게: 걷는 중엔 g(처음·끝은 서기 다리로 섞임) — 멈춰 선 동안은 서기 다리. 가까이 선 동안도 서기 다리(골반만 앞에)
  const wl = P.g * C.stride, wa = P.g * C.arm;
  for (const n of BONES) {
    let q = standQ(n, LEGS.test(n) ? C.standFrom : st);  // 다리는 서기 첫 순간에 고정(서기 파일의 다리 흔들림을 따르면 디딘 발이 미끄러짐)
    if (LEGS.test(n)) { if (wl > 0) { const side = n.startsWith("Left") ? "Left" : "Right", sw = swingOf(side, P.tw), b = 1 + ((C.bend[n.replace(/^(Left|Right)/, "")] || 1) - 1) * sw;
      q = q.clone().slerp(walkQ(n, P.tw), Math.min(1, wl * b)); } }  // 무릎·발목을 더 굽히는 건 그 다리가 들려 있을 때만(디딘 다리는 stride 그대로 — 굽히면 디딘 발이 끌림)
    else if (wa > 0 && /(Shoulder|Arm|Hand)$/.test(n)) q = q.clone().slerp(walkQ(n, P.tw), wa);  // 팔만 조금 흔듦(골반·등·머리는 서기 그대로 — 걷기 배우의 몸 비틀림을 따르면 다가오는 동안 몸이 옆으로 돌아 눈을 못 맞춤)
    const sd = LEGS.test(n) && C.stance[n.startsWith("Left") ? "Left" : "Right"]; if (sd) q.premultiply(new Q().setFromAxisAngle(new V(0, 0, 1), sd * Math.PI / 180));
    const lb = LOOKB[n]; if (lb != null && lk[lb]) q.premultiply(new Q().setFromAxisAngle(RX, lk[lb] * Math.PI / 180));  // +x 축 = 앞으로 숙임
    if (q.w < 0) q.set(-q.x, -q.y, -q.z, -q.w);
    tracks[n].push(r3(q.x), r3(q.y), r3(q.z), r3(q.w));
  }
  // 골반: 앞뒤·좌우 = 걷기 골반 이동(걷기 시각 기준) × stride. 높이 = 서기 + 걷기 오르내림 × 다리 무게
  const hw = hipAt(W, P.tw), dz = P.out ? (hw[2] - h0[2]) * C.stride * C.hipK : 0, dx = P.out ? (hw[0] - h0[0]) * C.stride * C.hipK : 0, dy = (hw[1] - h0[1]) * wl;
  hip.push(r3(dx), r3(hs0[1] + dy), r3(dz)); maxZ = Math.max(maxZ, dz);
}
// 손가락: 서기 파일 그대로(15fps, 왕복)
function fq(J, n, t) { const F = J.fingers, s = F.scale || 100, un = (a, i) => { const x = a[i * 3] / s, y = a[i * 3 + 1] / s, z = a[i * 3 + 2] / s; return new Q(x, y, z, Math.sqrt(Math.max(0, 1 - x * x - y * y - z * z))); };
  if (F.hold && F.hold[n]) return un(F.hold[n], 0); const a = F.tracks && F.tracks[n]; if (!a) return null;
  const M = F.frames || 1, ff = Math.max(0, Math.min(M - 1, t * F.fps)), i = Math.floor(ff), j = Math.min(M - 1, i + 1); return un(a, i).slerp(un(a, j), ff - i); }
const fingers = { fps: 15, scale: 100, dir: { ...S.fingers.dir }, tracks: {}, hold: {} };
const FM = Math.round(C.total * 15) + 1, rd = x => Math.round(x * 100) || 0;
for (const n of Object.keys({ ...(S.fingers.tracks || {}), ...(S.fingers.hold || {}) })) {
  const a = []; for (let k = 0; k < FM; k++) { const q = fq(S, n, standT(k / 15)).premultiply(qTurn); if (q.w < 0) q.set(-q.x, -q.y, -q.z, -q.w); a.push(rd(q.x), rd(q.y), rd(q.z)); }
  fingers.tracks[n] = a; }
fingers.frames = FM;
const json = { name: "gift_umbrella", src: `${S.src} ${C.standFrom}~${C.standTo}s 왕복 + ${W.src} ${C.cyc[0]}~${C.cyc[1]}s × ${C.stride} (tools/make_umbrella.mjs, 86-2 두 걸음 다가왔다 돌아감)`, fps: C.fps, frames: N, duration: (N - 1) / C.fps,
  dir: S.dir, tracks, hip, found: S.found, anims: 1, fingers, _make: { go: C.go, hold: C.hold, back: C.back, stride: C.stride } };
fs.writeFileSync(C.out, JSON.stringify(json));
const last = hip.slice(-3);
console.log(JSON.stringify({ 파일: C.out, 초: json.duration, KB: Math.round(fs.statSync(C.out).size / 1024), 가장앞: `골반 높이 × ${maxZ.toFixed(3)}`, 끝골반: last }));
