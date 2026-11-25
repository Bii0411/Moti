// x30 우산 반응 모션 만들기 (50-2 처음 만듦 · 50-3 제자리 반 걸음으로 다시 만듦)
// 쓰는 법: node tools/make_umbrella.mjs [--log]  →  motions/xstage_gift_umbrella.json
// 50-3: 몸 위치(골반 앞뒤·좌우)는 옮기지 않는다. 서아가 제자리에서 왼발을 반 걸음 내딛고(체중이 앞으로 실림) → 고개를 들어 씩 → 끝에 발을 살짝 들어 제자리로 거둠.
//   가까워진 느낌은 앱 카메라가 맡음(data/motions.json xstage x30 frame = 다가가는 구도). 그래서 끝에 미끄러지며 돌아가는 일이 없음.
// 재료(이미 변환된 모션 JSON, 원본 FBX 필요 없음):
//   서기 motions/xstage_shake_head_up_down.json(x27 의 원본) — 고개를 끄덕이기 전 가만히 선 구간(2.0초~). 배우가 −7° 를 봐서 +7° 돌려 정면
//   걷기 motions/xstage_walk.json(x22) — 왼다리만 빌림: 왼발이 떨어져(0.567초) 앞에 디딜 때(1.03초)까지의 다리 각도를 서기 쪽과 legK 만큼 섞음(반 걸음)
// 두 파일은 배우(뼈대 기준 방향 dir)가 달라서, 걷기 쪽 회전을 서기 쪽 기준 방향에 맞게 바꿔 담는다(q · R, R = 서기 dir → 걷기 dir).
// 디딘 오른발은 서기 자세 그대로(골반도 그대로)라 움직이지 않음. 숫자는 아래 C 에서 바꿈.
import fs from "fs";
const THREE = await import("three");
const { Quaternion: Q, Vector3: V } = THREE;

const C = {
  walk: "motions/xstage_walk.json", stand: "motions/xstage_shake_head_up_down.json", out: "motions/xstage_gift_umbrella.json",
  standFrom: 2.0, standTurn: 7,
  swing: [0.70, 1.03],   // 걷기 파일: 왼발이 오른발 옆을 지나 들릴 때 ~ 앞에 디딜 때(뒤에서 차고 나오는 앞부분은 서 있는 자세와 안 맞아 뺌)
  lift: 0.767,           // 걷기 파일: 왼발이 가장 높이 든 때(거둘 때 발을 살짝 드는 데 씀)
  step: [0.25, 0.85],    // 이 모션 시각: 반 걸음 내딛기
  back: [2.7, 3.3],      // 이 모션 시각: 발을 거둬 제자리로
  legK: 0.6,             // 걷기 왼다리 각도를 쓰는 몫(1 = 한 걸음 그대로, 0.6 ≈ 반 걸음)
  liftK: 0.5,            // 거둘 때 발을 드는 몫
  lean: { Spine01: 2, Spine02: 2 },  // 체중이 앞으로 실림(도, 내딛는 동안 기울였다가 거둘 때 폄)
  look: { at: 0.95, ramp: 0.5, Head: 9, neck: 5, Spine02: 2 },  // at 초부터 ramp 초 동안 고개를 듦(도), 끝까지
  stance: { Left: -3, Right: 5 },  // 다리 전체를 골반에서 안쪽으로 모으는 각도(도) — 서기 파일의 벌린 발을 앱 기본 자세 발 폭에 맞춰, 처음·끝 섞기 때 발이 옆으로 끌리지 않게
  total: 3.4, fps: 30,
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
const standQ = (n, t) => sample(S, n, t).premultiply(qTurn);
const LLEG = /^Left(UpLeg|Leg|Foot)$/, LEGS = /(UpLeg|Leg|Foot)$/;

const N = Math.round(C.total * C.fps) + 1, tracks = {}, hip = [], log = [];
for (const n of BONES) tracks[n] = [];
const r3 = x => Math.round(x * 1000) / 1000 || 0;
for (let f = 0; f < N; f++) {
  const t = f / C.fps, st = C.standFrom + t;
  const s1 = Math.max(0, Math.min(1, (t - C.step[0]) / (C.step[1] - C.step[0])));   // 내딛기 진행(걷기 시간은 고르게)
  const out = sm((t - C.step[0]) / (C.step[1] - C.step[0])) * (1 - sm((t - C.back[0]) / (C.back[1] - C.back[0])));  // 반 걸음 나가 있는 몫
  const bk = (t - C.back[0]) / (C.back[1] - C.back[0]), arc = bk > 0 && bk < 1 ? Math.sin(Math.PI * bk) * C.liftK : 0;
  const lk = sm((t - C.look.at) / C.look.ramp);
  for (const n of BONES) {
    let q = standQ(n, LEGS.test(n) ? C.standFrom : st);  // 다리는 서기 첫 순간에 고정(골반을 안 옮기므로 서기 파일의 다리 흔들림을 따르면 디딘 발이 미끄러짐)
    if (LLEG.test(n)) {
      const wt = t < C.back[0] ? C.swing[0] + (C.swing[1] - C.swing[0]) * s1 : C.swing[1];
      const stepQ = q.clone().slerp(walkQ(n, wt), C.legK);
      q = q.clone().slerp(stepQ, t < C.back[0] ? sm(s1 / 0.3) : out);  // 처음 30% 동안 서기 다리에서 걷기 다리로 섞어 들어감
      if (arc > 0) q.slerp(walkQ(n, C.lift), arc);
    }
    const sd = LEGS.test(n) && C.stance[n.startsWith("Left") ? "Left" : "Right"]; if (sd) q.premultiply(new Q().setFromAxisAngle(new V(0, 0, 1), sd * Math.PI / 180));
    const lean = (C.lean[n] || 0) * out, look = (C.look[n] || 0) * lk;
    if (lean || look) q.premultiply(new Q().setFromAxisAngle(RX, (lean - look) * Math.PI / 180));  // +x 축 = 앞으로 숙임, −x = 고개 들기
    if (q.w < 0) q.set(-q.x, -q.y, -q.z, -q.w);
    tracks[n].push(r3(q.x), r3(q.y), r3(q.z), r3(q.w));
  }
  const hs = hipAt(S, C.standFrom); hip.push(0, r3(hs[1]), 0);   // 골반 앞뒤·좌우는 0(제자리), 높이만 서기 그대로
}
// 손가락: 서기 파일 그대로(15fps)
function fq(J, n, t) { const F = J.fingers, s = F.scale || 100, un = (a, i) => { const x = a[i * 3] / s, y = a[i * 3 + 1] / s, z = a[i * 3 + 2] / s; return new Q(x, y, z, Math.sqrt(Math.max(0, 1 - x * x - y * y - z * z))); };
  if (F.hold && F.hold[n]) return un(F.hold[n], 0); const a = F.tracks && F.tracks[n]; if (!a) return null;
  const M = F.frames || 1, ff = Math.max(0, Math.min(M - 1, t * F.fps)), i = Math.floor(ff), j = Math.min(M - 1, i + 1); return un(a, i).slerp(un(a, j), ff - i); }
const fingers = { fps: 15, scale: 100, dir: { ...S.fingers.dir }, tracks: {}, hold: {} };
const FM = Math.round(C.total * 15) + 1, rd = x => Math.round(x * 100) || 0;
for (const n of Object.keys({ ...(S.fingers.tracks || {}), ...(S.fingers.hold || {}) })) {
  const a = []; for (let k = 0; k < FM; k++) { const q = fq(S, n, C.standFrom + k / 15).premultiply(qTurn); if (q.w < 0) q.set(-q.x, -q.y, -q.z, -q.w); a.push(rd(q.x), rd(q.y), rd(q.z)); }
  fingers.tracks[n] = a; }
fingers.frames = FM;
const json = { name: "gift_umbrella", src: `${S.src} ${C.standFrom}s~ + ${W.src} 왼다리 ${C.swing[0]}~${C.swing[1]}s (tools/make_umbrella.mjs, 50-3 제자리)`, fps: C.fps, frames: N, duration: (N - 1) / C.fps,
  dir: S.dir, tracks, hip, found: S.found, anims: 1, fingers };
fs.writeFileSync(C.out, JSON.stringify(json));
console.log(JSON.stringify({ 파일: C.out, 초: json.duration, KB: Math.round(fs.statSync(C.out).size / 1024), 골반이동: "없음(제자리)" }));
