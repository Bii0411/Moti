// 카드 팩 확인(49, 예전 9단계 선물 뽑기 검사): 도감·팩 데이터 검사 + 1장·10장 뽑기 시뮬레이션 (앱과 같은 gacha.js 를 씀)
// 실행: node tools/check_gacha.mjs [횟수=10000]
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const G = require("../gacha.js");
const col = JSON.parse(readFileSync("data/collection.json", "utf8"));
const pack = JSON.parse(readFileSync("data/pack.json", "utf8"));
const gifts = JSON.parse(readFileSync("data/gifts.json", "utf8"));
const ui = JSON.parse(readFileSync("data/ui.json", "utf8"));
const story = JSON.parse(readFileSync("data/seoa_story.json", "utf8"));
const N = +(process.argv[2] || 10000);
const KO = { common: "일반", rare: "레어", special: "특별" };
let bad = 0;
const fail = m => { bad++; console.log("  ✗ " + m); };

console.log("## 데이터 검사\n");
// 47: 보류(hold) 칸·연출(only) 칸은 unlock 비교에서 뺌
const chat = col.items.filter(x => x.source === "chat" && !x.hold && !x.only);
const packAll = col.items.filter(x => x.source === "pack"), pool = G.pool(col.items);
const held = col.items.filter(x => x.hold), oldGift = col.items.filter(x => x.source === "gift");
const momentC = col.items.filter(x => x.source === "moment");  // 50: 순간 선물 반응 카드(반응 몸짓이 없으면 앱에서 숨김)
console.log(`- 도감 칸: 대화 ${chat.length} + 연출 ${col.items.filter(x => x.only).length} + 카드 팩 ${packAll.length} + 보류 선물 ${oldGift.length} + 순간 선물 ${momentC.length} = ${col.items.length} (그중 보류 ${held.map(x => x.id).join("·") || "없음"}, 보이는 칸 ${col.items.length - held.length}, 순간 선물 칸은 반응 몸짓이 있을 때만)`);
{ const GJ = JSON.parse(readFileSync("data/gifts.json", "utf8")), gl = GJ.list, mg = gl.filter(g => g.kind === "moment");
  // 50-1: 순간 선물마다 카드 한 장, 카드 몸짓 = 선물 reaction, 묶음(bonds) 없음
  if (GJ.bonds) fail("gifts.json 에 bonds 가 남아 있음(50-1 에서 없앰)");
  if (gl.some(g => g.reactions)) fail("선물에 reactions(묶음별)가 남아 있음 — reaction 하나로");
  for (const x of momentC) { const g = gl.find(g => g.id === x.gift); if (!g || g.kind !== "moment") fail(`${x.id}: 순간 선물 ${x.gift} 없음`); else if (g.reaction !== (x.play || {}).m) fail(`${x.id}: 반응 몸짓이 gifts.json reaction 과 다름`); if (x.bond) fail(`${x.id}: bond 가 남아 있음`); if (x.grade !== "rare") fail(`${x.id}: 등급이 레어가 아님`) }
  for (const g of mg) if (momentC.filter(x => x.gift === g.id).length !== 1) fail(`순간 선물 ${g.id} 카드가 한 장이 아님`);
  if (momentC.some((x, i) => x.name !== (gl.find(g => g.id === x.gift) || {}).name || x.no !== 46 + i)) fail("순간 카드 이름·번호(46~)가 선물 순서와 다름");
  for (const r of ((GJ.momentFallback || {}).rules || [])) if (!mg.some(g => g.id === r.gift)) fail(`임시 규칙 ${r.gift}: 순간 선물이 아님`);
  const nos = col.items.map(x => x.no).filter(n => n > 0); if (new Set(nos).size !== nos.length || nos.some(n => (col.retiredNo || []).includes(n))) fail("카드 번호 겹침·은퇴 번호 사용") }
const ids = col.items.map(x => x.id);
if (new Set(ids).size !== ids.length) fail("id 중복");
const want = new Set();
for (const k in story.unlock.stage) story.unlock.stage[k].motions.forEach(x => want.add(x));
for (const s of ["flag", "event"]) for (const k in story.unlock[s]) story.unlock[s][k].motions.forEach(x => want.add(x));
(story.ban || []).forEach(x => want.delete(x));
(col.noCard || []).forEach(x => want.delete(x));  // 84-2: x49 = 카드 없음(g02 와 같은 모션)
if (chat.length !== want.size || chat.some(x => !want.has(x.id))) fail("대화 몸짓이 unlock(ban 제외)과 다름");
if (chat.some(x => (story.ban || []).includes(x.id))) fail("ban 몸짓이 들어 있음");
// 49: 예전 선물 카드 g01~g12 = 카드 팩 10장(g01~g10) + 보류 2장(g11·g12, source gift 그대로)
const oldPack = packAll.filter(x => /^g(0\d|10)$/.test(x.id));
if (oldPack.length + oldGift.length !== 12) fail("예전 선물 카드(카드 팩 g01~g10 + 보류 g11·g12)가 12장이 아님");
// 52: 카드 팩 새 카드 — SECRET 세 장 + 시작화면 인사 한 장(이름·한 줄은 지시문 그대로)
const motions = JSON.parse(readFileSync("data/motions.json", "utf8"));
const NEW52 = [
  ["g13", "귀여운 척 갸웃", "special", "x32", "웅?"],
  ["g14", "시간 날 때마다 연습한 춤", "special", "x33", "너한테만 보여 주는 거야"],
  ["g15", "고민하는 척", "special", "x34", "뭐~ 마실까! 아, 너무 신났나"],
  ["g16", "처음 건넨 인사", "rare", "x23", "안녕? 잘 부탁해."],
];
const NEW842 = ["x42", "x41", "x46", "x43", "x40", "x47", "x48", "g17"];  // 84-2 에 70~77번으로 붙은 카드
const maxOld = Math.max(...col.items.filter(x => !x.pose && !NEW52.some(n => n[0] === x.id) && !NEW842.includes(x.id)).map(x => x.no || 0), ...(col.retiredNo || []));  // 78: 뒤에 붙은 포즈 카드는 빼고
NEW52.forEach(([id, name, grade, m, line], i) => {
  const x = col.items.find(x => x.id === id);
  if (!x) return fail(`52: ${id} ${name} 없음`);
  if (x.name !== name || x.grade !== grade || x.source !== "pack" || x.hold || (x.play || {}).m !== m || x.line !== line) fail(`52: ${id} 값이 다름(이름·등급·source·몸짓·한 줄)`);
  if (x.no !== maxOld + 1 + i) fail(`52: ${id} 번호 ${x.no} ≠ ${maxOld + 1 + i}(이어서)`);
  const mm = motions.motions[m];
  if (!mm) fail(`52: 몸짓 ${m} 없음`);
  else if (m !== "x23" && mm.only !== "pack") fail(`52: ${m} 이 카드 팩 전용(only pack)이 아님`);
  if (!motions.xstage[m]) fail(`52: ${m} 모션 파일 연결(xstage) 없음`);
  else if (m !== "x23") { const f = JSON.parse(readFileSync(motions.xstage[m].file, "utf8")); if (!f.fingers || Object.keys(f.fingers.tracks).length + Object.keys(f.fingers.hold).length < 30) fail(`52: ${m} 손가락 없음`); if (!motions.xstage[m].inPlace) fail(`52: ${m} 제자리(inPlace) 아님`) }
});
if (motions.motions.x23.only !== "onboarding") fail("52: x23 이 시작화면 인사(only onboarding)가 아님");
// 84-2: 신규 대화 카드 7장(70~76) + 카드 팩 g17 팔꿈치로 툭 치기(77, 레어, x45 카드 팩 전용) · x49 카드 없음
{
  const maxPre = Math.max(...col.items.filter(x => !NEW842.includes(x.id)).map(x => x.no || 0));
  NEW842.forEach((id, i) => { const x = col.items.find(y => y.id === id); if (!x) return fail(`84-2: ${id} 카드 없음`); if (x.no !== maxPre + 1 + i) fail(`84-2: ${id} 번호 ${x.no} ≠ ${maxPre + 1 + i}`) });
  const g17 = col.items.find(x => x.id === "g17") || {};
  if (g17.name !== "팔꿈치로 툭 치기" || g17.source !== "pack" || g17.grade !== "rare" || (g17.play || {}).m !== "x45" || (g17.play || {}).f !== "fun" || g17.line !== "왜 그렇게 심각해?") fail("84-2: g17 값이 다름");
  if ((motions.motions.x45 || {}).only !== "pack") fail("84-2: x45 가 카드 팩 전용(only pack)이 아님");
  if (col.items.some(x => x.id === "x49" || (x.source === "chat" && (x.play || {}).m === "x49"))) fail("84-2: x49 카드가 있음");
  const g02 = col.items.find(x => x.id === "g02") || {}; if ((g02.play || {}).m !== "x19") fail("84-2: g02 가 x19 가 아님");
  const grades = { x42: "common", x41: "common", x46: "common", x43: "rare", x40: "rare", x47: "rare", x48: "rare" };
  for (const id in grades) { const x = col.items.find(y => y.id === id) || {}; if (x.grade !== grades[id] || x.source !== "chat") fail(`84-2: ${id} 등급·source 다름`) }
  const tg = JSON.parse(readFileSync("data/together.json", "utf8")); const pm = (tg.free || {}).packMotions || [];
  if (!["x32", "x34", "x45"].every(m => pm.includes(m)) || pm.includes("x33") || !(tg.free.exclude || []).includes("x33")) fail("84-2: 자유 모션 카드 팩 허용 목록(x32·x34·x45, x33 제외)이 다름");
  const acts = JSON.stringify(tg.actions) + JSON.stringify(tg.auto); if (/"x45"/.test(acts)) fail("84-2: x45 가 교감·자동 후보에 있음");
  console.log(`- 84-2 카드: 대화 ${NEW842.slice(0, 7).join("·")}(${maxPre + 1}~${maxPre + 7}) · 카드 팩 g17 x45(${maxPre + 8}, 레어) · x49 카드 없음`);
}
// 카드 팩 전용 몸짓은 대화 해금·목록에 없음(앱 unlockedIds 가 only 를 뺌)
for (const [m, v] of Object.entries(motions.motions)) if (v.only === "pack" && want.has(m)) fail(`52: 카드 팩 전용 ${m} 이 대화 해금에 있음`);
// 춤은 전신 구도(m23 과 같은 frameById)
if (JSON.stringify(col.card.frameById.x33) !== JSON.stringify(col.card.frameById.m23)) fail("52: 춤 x33 이 전신 구도가 아님");
// 50-2: 순간 선물 반응 몸짓 — 모두 모션 파일이 있고(손가락 포함) 선물 전용. 86-1: 반지(x31)도 열림
{ const GJ = JSON.parse(readFileSync("data/gifts.json", "utf8")), mg = GJ.list.filter(g => g.kind === "moment"), ready = [];
  for (const g of mg) { const m = g.reaction, x = motions.xstage[m], mm = motions.motions[m];
    if (!x || !mm) { fail(`50-2: ${g.name} 반응 ${m} 모션 없음`); continue; }
    if (mm.only !== "gift") fail(`50-2: ${m} 이 선물 전용(only gift)이 아님`);
    const f = JSON.parse(readFileSync(x.file, "utf8")); if (!f.fingers) fail(`50-2: ${m} 손가락 없음`);
    if (!(x.to > x.from) || x.to > f.duration + .01) fail(`50-2: ${m} 구간 ${x.from}~${x.to} 이 파일 길이 ${f.duration.toFixed(2)} 밖`);
    if (!(x.fadeIn >= .2 && x.fadeIn <= .3) && m !== "x30") fail(`50-2: ${m} fadeIn 이 0.2~0.3 이 아님`);
    ready.push(g.name); }
  const want = { x26: [1, 4.5, "Glancing"], x27: [3, 8, "Shake_Head"], x28: [0.1, 3, "Touching"], x29: [2, 6, "Avoiding"] };
  for (const [m, [a, b, src]] of Object.entries(want)) { const x = motions.xstage[m] || {}, f = x.file ? JSON.parse(readFileSync(x.file, "utf8")) : {};
    if (x.from !== a || x.to !== b || !String(f.src || "").includes(src)) fail(`50-2: ${m} 구간·원본이 지시와 다름(${x.from}~${x.to}, ${f.src})`); }
  if (motions.xstage.x26 && motions.xstage.x26.damp) fail("50-2: x26 에 damp 가 있음");
  const u = motions.xstage.x30 || {}; if (!u.face || !(u.faceAt > 0) || !u.frame || !(u.frameMs > 0) || !JSON.parse(readFileSync("data/config.json", "utf8")).camera[u.frame]) fail("50-2·50-3: x30 우산 표정·카메라 구도 설정 없음");
  const rules = ((GJ.momentFallback || {}).rules || []).map(r => r.gift).join();
  if (rules !== "firstaid,cocktail,towel,flower,umbrella,ring") fail(`50-2: 임시 규칙 선물 순서 ${rules}`);
  const m06 = motions.xstage.m06 || {}; if (!/flustered/.test(m06.file) || m06.to - m06.from < 2 || m06.to - m06.from > 4 || !(m06.motionVer >= 4)) fail("50-2: m06 허둥대기가 Flustered 2~4초·motionVer 4 이상이 아님");
  const d = motions.xstage.x33 || {}; if (d.from !== 4.7 || d.to !== 12 || !(d.motionVer >= 2)) fail("50-2: 춤 x33 구간이 4.7~12초·motionVer 2 이상이 아님");
  if (((col.card.photocard || {}).packNamePx) !== 9 || ((col.card.photocard || {}).packNameLines) !== 2) fail("50-3: 10장 결과 이름이 9px 두 줄(packNamePx·packNameLines)이 아님");
  if (!(motions.xstage.x26 || {}).tiltMax) fail("50-3: x26 숙임 제한(tiltMax) 없음");
  { const f = JSON.parse(readFileSync(u.file, "utf8")), h = f.hip, mv = Math.max(...h.filter((_, i) => i % 3 !== 1).map(Math.abs)); if (mv > 0.001 || !u.inPlace) fail(`50-3: x30 골반이 앞뒤·좌우로 움직임(${mv})`); }
  console.log(`- 50-2 순간 선물 반응 모션: ${ready.join("·")} 준비됨, 임시 규칙 ${rules.split(",").length}개 · m06 ${m06.from}~${m06.to}초 · 춤 ${d.from}~${d.to}초`); }
// 52: 24 손 흔들기(m13) 일반, m16 응원하기는 대화 몸짓 목록에서 빠짐(ban) · 카드 팩 「들고 흔들어 보이기」(g08)는 m16 그대로
if ((col.gradeRule.byId || {}).m13 !== "common" || col.items.find(x => x.id === "m13").grade !== "common") fail("52: m13 손 흔들기가 일반이 아님");
if (!(story.ban || []).includes("m16")) fail("52: m16 응원하기가 ban 에 없음(대화 몸짓 목록에 나옴)");
if (col.items.find(x => x.id === "g08").play.m !== "m16") fail("52: g08 이 m16 이 아님");
console.log(`- 52 새 카드: ${NEW52.map(n => `${n[0]} ${n[1]}(${KO[n[2]]})`).join(", ")} · m13 ${KO[col.items.find(x => x.id === "m13").grade]} · m16 ban`);
if (oldGift.some(x => !x.hold)) fail("보류가 아닌 source gift 칸이 남아 있음(카드 팩으로 바꿔야 함)");
if (packAll.some(x => x.hold)) console.log("  (참고) 보류인 카드 팩 칸: " + packAll.filter(x => x.hold).map(x => x.id).join("·"));
if (pool.some(x => !x.play || !x.play.m)) fail("재생 설정(play.m)이 없는 카드 팩 칸");
if (pool.some(x => !(x.no > 0))) fail("번호(no)가 없는 카드 팩 칸");
for (const src of ["chat", "pack", "all"]) {
  const L = src === "all" ? col.items.filter(x => !x.hold) : col.items.filter(x => x.source === src && !x.hold);
  console.log(`- 등급별 (${src === "all" ? "전체" : src === "chat" ? "대화" : "카드 팩"}, 보류 빼고): ` + G.ORDER.map(g => `${KO[g]} ${L.filter(x => x.grade === g).length}`).join(" · "));
}
for (const x of col.items) if (!G.ORDER.includes(x.grade)) fail(`${x.id} 등급 이상: ${x.grade}`);

// 팩 값
const P = pack;
console.log(`\n- 가격: 1장 ${P.price.one} · 10장 ${P.price.ten} 다이아, 중복 환급 ${P.refund} 다이아, 천장 ${P.pity.count}장 안에 ${KO[P.pity.min]} 이상`);
if (!(P.price.one > 0 && P.price.ten > 0)) fail("가격이 없음");
if (!(P.refund >= 0)) fail("환급 값이 없음");
if (!(P.pity.count >= 1 && P.pity.count <= 10)) fail("천장이 1~10장이 아님(10장 뽑기 보장이 깨짐)");
const raw = G.ORDER.reduce((s, k) => s + (P.odds[k] || 0), 0);
if (raw !== 100) fail(`확률 합 ${raw}`);
const o = G.odds(P.odds, col.items), sum = G.ORDER.reduce((s, k) => s + o[k], 0);
console.log(`- 확률(data) ${G.ORDER.map(k => `${KO[k]} ${P.odds[k] || 0}`).join(" / ")} → 실제(카드가 없는 등급은 아래로) ${G.ORDER.map(k => `${KO[k]} ${o[k]}`).join(" / ")}, 확률 보기 줄 ${G.grades(col.items).map(k => KO[k]).join("·")}`);
if (Math.abs(sum - 100) > 1e-9) fail(`실제 확률 합 ${sum}`);
const cardSum = pool.reduce((s, x) => s + G.cardPct(x, o, col.items), 0);
if (Math.abs(cardSum - 100) > 1e-9) fail(`카드별 확률 합 ${cardSum}`);
for (const g of G.ORDER) if (o[g] > 0 && !pool.some(x => x.grade === g)) fail(`${KO[g]} 확률이 있는데 카드가 없음`);
// 52: 특별 카드가 있으면 특별은 그대로 나옴(fit 이 레어에 더하지 않음, 확률 보기 줄에 특별)
if (pool.some(x => x.grade === "special")) {
  if (G.fit("special", col.items) !== "special" || o.special !== (P.odds.special || 0) || o.rare !== (P.odds.rare || 0)) fail("특별 카드가 있는데 특별 %가 레어에 더해짐");
  if (!G.grades(col.items).includes("special")) fail("확률 보기 줄에 특별이 없음");
  console.log(`- 특별 카드 ${pool.filter(x => x.grade === "special").length}장 → 특별 ${o.special}% 그대로(카드 한 장 ${+(o.special / pool.filter(x => x.grade === "special").length).toFixed(4)}%)`);
}
// 47: 특별 카드가 모두 보류면 특별 → 레어
if (!pool.some(x => x.grade === "special")) {
  if (G.fit("special", col.items) !== "rare") fail("특별이 레어로 내려가지 않음");
  console.log(`- 특별 카드 없음(보류) → 특별 결과는 ${KO[G.fit("special", col.items)]}로`);
}
// 49: 선물은 뽑기 없이 — 예전 값은 _보류 에만
if (gifts.list.some(g => g.odds || g.lines)) fail("선물에 odds·lines 가 남아 있음(_보류 로)");
// 50: 선물 목록 = 언제든 5 + 순간 6(50-1), 커피·라멘은 _보류.list
const allGifts = [...gifts.list, ...((gifts._보류 || {}).list || [])];
for (const id of ["coffee", "ramen", "flower", "ring"]) { const g = allGifts.find(x => x.id === id); if (!g || !g._보류 || !g._보류.odds || !g._보류.lines) fail(`선물 ${id} _보류 에 예전 확률·대사가 없음`); }
const always = gifts.list.filter(g => g.kind === "always"), moment = gifts.list.filter(g => g.kind === "moment");
if (always.length !== 5 || moment.length !== 6 || always.length + moment.length !== gifts.list.length) fail(`선물 종류 수: 언제든 ${always.length} · 순간 ${moment.length}`);
if (always.some(g => !g.motion || !(g.price > 0))) fail("언제든 선물에 motion·price 없음");
if (moment.some(g => !g.when || !(g.price > 0) || !g.reaction)) fail("순간 선물에 when·price·reaction 없음");
if (moment.map(g => g.stage).join() !== "1,2,3,4,5,6") fail(`순간 선물 stage 가 1~6 하나씩·단계 순서가 아님: ${moment.map(g => g.stage).join()}`);
if (gifts.list.some(g => g.id === "coffee" || g.id === "ramen")) fail("커피·라멘이 목록에 남아 있음");
for (const k of ["srvMoment", "srvMood", "srvAgain"]) if (!ui.gift[k]) fail(`ui.gift.${k} 없음`);
console.log(`- 선물: 언제든 ${always.map(g => g.name + " " + g.price).join(", ")} / 순간 ${moment.map(g => g.name + " " + g.price).join(", ")}`);
if (!(ui.gift && ui.gift.srv && ui.gift.srv.includes("{gift}") && ui.gift.fallback)) fail("ui.gift.srv·fallback 없음");
for (const k of ["title", "pity", "one", "ten", "odds", "oddsTitle", "noDia", "flipAll", "new", "owned", "summaryNew", "summaryDup", "again", "done"]) if (!(ui.pack && ui.pack[k])) fail(`ui.pack.${k} 없음`);
if (!(ui.album && ui.album.seg && ui.album.seg.pack)) fail("ui.album.seg.pack 없음");
if (JSON.stringify(ui).includes("가챠")) fail("화면 문구에 「가챠」");

// 결정적 난수(매번 같은 결과)
let seed = 20261125;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

// 78: 촬영 전용 포즈 카드(pose) — 무료 1장(source free, 팩에 안 나옴) + 카드 팩 카드. 몸짓은 only "pose"(대화·해금에 안 나옴), 번호는 52 카드(g16) 다음부터 이어서
{ const poseC = col.items.filter(x => x.pose), freeC = poseC.filter(x => x.free), packC = poseC.filter(x => !x.free);
  const mj = JSON.parse(readFileSync("data/motions.json", "utf8")), { existsSync } = require("node:fs");
  if (freeC.length !== 1 || freeC[0].name !== "손가락 하트" || freeC[0].source !== "chat" || freeC[0].grade !== "rare" || freeC[0].only !== "photoAsk") fail("78: 무료 포즈가 손가락 하트(대화 · RARE · 이벤트 photoAsk) 한 장이 아님");  // 78 추가
  if (poseC.some(x => pool.includes(x) === !!x.free)) fail("78: 무료 포즈가 팩에 있거나 팩 포즈가 팩에 없음");
  if (packC.some(x => x.source !== "pack" || x.hold)) fail("78: 팩 포즈 source·hold 가 다름");
  const g16 = (col.items.find(x => x.id === "g16") || {}).no || 0;
  const inUnlock = m => [story.unlock.stage, story.unlock.flag, story.unlock.event].some(sec => Object.values(sec || {}).some(s => (s.motions || []).includes(m)));
  poseC.forEach((x, i) => { if (x.no !== g16 + 1 + i) fail(`78: ${x.id} 번호 ${x.no} ≠ ${g16 + 1 + i}`);
    const m = (x.play || {}).m, mm = mj.motions[m];
    if (!mm || mm.only !== "pose") fail(`78: ${x.id} 몸짓 ${m} 이 only pose 가 아님`);
    if (!mj.xstage[m] || !existsSync(mj.xstage[m].file)) fail(`78: ${x.id} 모션 파일 없음`);
    if (inUnlock(m)) fail(`78: ${m} 이 해금 목록에 있음`); });
  const by = g => packC.filter(x => x.grade === g).map(x => x.name).join(", ");
  console.log(`- 78 포즈 카드 ${poseC.length}장: 무료 ${freeC.map(x => x.name)}(카드는 대화 · 이벤트 ${freeC.map(x => x.only)}) · 팩 일반(DAILY) ${packC.filter(x => x.grade === "common").length}장 · 레어 ${by("rare")} · 특별(SECRET) ${by("special")}`); }
console.log(`\n## 뽑기 시뮬레이션\n`);
console.log("| 방식 | 장 수 | 결과(%) " + G.ORDER.map(k => KO[k]).join("/") + " | 가장 긴 연속 일반 | 천장 발동 | 10장 뽑기에 레어 없음 |\n|---|---|---|---|---|---|");
const run = (label, plan, pityOn) => {
  const cnt = { common: 0, rare: 0, special: 0 }; let left = P.pity.count, streak = 0, maxRun = 0, forced = 0, total = 0, tenNoRare = 0;
  for (const n of plan) {
    const r = G.draw(n, o, pityOn ? P.pity : { count: Infinity, min: "rare" }, pityOn ? left : Infinity, col.items, rnd);
    if (pityOn) left = r.left;
    if (n === 10 && !r.cards.some(c => G.ORDER.indexOf(c.grade) >= G.ORDER.indexOf(P.pity.min))) tenNoRare++;
    for (const c of r.cards) {
      total++; cnt[c.grade]++; if (c.forced) forced++;
      if (!c.item || c.item.grade !== c.grade) fail(`${label} ${c.grade} 카드를 못 고름`);
      if (c.item && (c.item.hold || c.item.source !== "pack")) fail(`${label} 팩 밖 카드 ${c.item.id}`);
      streak = c.grade === "common" ? streak + 1 : 0; maxRun = Math.max(maxRun, streak);
    }
  }
  console.log(`| ${label} | ${total.toLocaleString()} | ${G.ORDER.map(k => (cnt[k] / total * 100).toFixed(1)).join(" / ")} | ${maxRun} | ${pityOn ? forced : "-"} | ${plan.includes(10) ? tenNoRare : "-"} |`);
  if (!pityOn) for (const k of G.ORDER) { const p = o[k] / 100, se = Math.sqrt(p * (1 - p) / total); if (Math.abs(cnt[k] / total - p) > 4 * se + 1e-9) fail(`${label} ${k} 비율이 확률과 다름`); }
  if (pityOn && maxRun >= P.pity.count) fail(`${label}: 연속 일반 ${maxRun}`);
  if (pityOn && tenNoRare) fail(`${label}: 레어 없는 10장 뽑기 ${tenNoRare}번`);
};
run("1장 뽑기 · 천장 끔", Array(N).fill(1), false);
run("1장 뽑기 · 천장 켬", Array(N).fill(1), true);
run("10장 뽑기 · 천장 켬", Array(Math.ceil(N / 10)).fill(10), true);
run("1장·10장 섞어 · 천장 켬", Array.from({ length: N }, () => rnd() < .3 ? 10 : 1), true);
// 천장 경계: 늘 일반이 나오는 난수로 — 1장 뽑기는 10번째에, 10장 뽑기는 마지막 장에 레어
{
  const low = () => 0.0001;
  let left = P.pity.count; const seq = [];
  for (let i = 0; i < 2 * P.pity.count; i++) { const r = G.draw(1, o, P.pity, left, col.items, low); left = r.left; seq.push(r.cards[0].grade[0] + (r.cards[0].forced ? "!" : "")); }
  const t = G.draw(10, o, P.pity, P.pity.count, col.items, low);
  console.log(`\n- 늘 일반인 난수: 1장 ×${2 * P.pity.count} = ${seq.join(" ")} · 10장 = ${t.cards.map(c => c.grade[0] + (c.forced ? "!" : "")).join("")}`);
  if (seq[P.pity.count - 1] !== "r!" || seq[2 * P.pity.count - 1] !== "r!") fail("1장 뽑기 천장 위치가 다름");
  if (t.cards[9].grade !== "rare") fail("10장 뽑기 마지막 장 천장이 다름");
  // 남은 천장 3장에서 10장 뽑기 → 3번째 장에 레어, 그 뒤 7장 동안은 보장 없음
  const t3 = G.draw(10, o, P.pity, 3, col.items, low);
  console.log(`- 천장 3장 남았을 때 10장 = ${t3.cards.map(c => c.grade[0] + (c.forced ? "!" : "")).join("")} → 다음 남은 장 ${t3.left}`);
  if (t3.cards[2].grade !== "rare") fail("남은 천장이 10장 뽑기 안에서 이어지지 않음");
}
// 86-1: 반지 반응 x31 = Receive candy 1, 선물 전용·반지 선물·gm06 카드만. 일반 대화·키워드·함께하기·카드 팩·포즈에 없음
{ const x = motions.xstage.x31 || {}, mm = motions.motions.x31 || {}, f = x.file ? JSON.parse(readFileSync(x.file, "utf8")) : {};
  if (!String(f.src || "").includes("Receive candy 1")) fail(`86-1: x31 원본이 Receive candy 1 이 아님(${f.src})`);
  if (mm.only !== "gift") fail("86-1: x31 이 선물 전용이 아님");
  const dur = x.to - x.from - (x.skip ? x.skip[1] - x.skip[0] : 0); if (!(dur > 5 && dur < 10)) fail(`86-1: x31 재생 길이 ${dur}`);
  const GJ = JSON.parse(readFileSync("data/gifts.json", "utf8")), ring = GJ.list.find(g => g.id === "ring") || {};
  if (ring.reaction !== "x31" || ring.price !== 300 || ring.stage !== 6 || ring.kind !== "moment" || ring.icon !== "icons/gift2_ring.png") fail("86-1: 반지 선물 값(반응·가격·단계·종류·그림)이 바뀜");
  const gm = col.items.find(i => i.id === "gm06") || {}; if (gm.no !== 51 || gm.grade !== "rare" || gm.gift !== "ring" || gm.source !== "moment" || (gm.play || {}).m !== "x31") fail("86-1: gm06 번호·등급·선물·몸짓이 다름");
  const others = col.items.filter(i => i.id !== "gm06" && ((i.play || {}).m === "x31" || i.id === "x31")); if (others.length) fail(`86-1: x31 을 쓰는 다른 카드 ${others.map(i => i.id)}`);
  const where = { "data/seoa_story.json": 0, "data/motion_keywords.json": 0, "data/together.json": 0, "data/pack.json": 0, "data/photos.json": 0, "data/seoa_photo.json": 0, "data/config.json": 0, "data/emotion_face.json": 0 };
  for (const p in where) if (/"x31"/.test(readFileSync(p, "utf8"))) fail(`86-1: ${p} 에 x31 이 있음`);
  if (GJ.list.some(g => g.id !== "ring" && (g.motion === "x31" || g.reaction === "x31"))) fail("86-1: 반지가 아닌 선물이 x31 을 씀");
  const mf = (motions.motionFace || {}).x31 || {}; if (!mf.gift || !Array.isArray(mf.seq) || mf.seq.length < 3) fail("86-1: x31 표정 흐름 없음");
  const GF = ["x31", "x26", "x30"];  // 86-2: 구급상자 x26·우산 x30 도 선물 반응 표정 흐름
  if (Object.entries(motions.motionFace || {}).some(([k, v]) => !GF.includes(k) && v.gift)) fail("86-1·86-2: x31·x26·x30 말고 선물 표정 흐름(gift)이 켜진 몸짓이 있음");
  console.log(`- 86-1 반지 반응 x31: ${x.from}~${x.to}초(건너뜀 ${x.skip}) = ${dur.toFixed(2)}초 · 표정 ${mf.seq.map(s => s.at + s.f).join("→")} · gm06 51번 레어`); }
// 시연 지정: 첫 장만 그것으로
{
  const a = G.draw(10, o, P.pity, P.pity.count, col.items, rnd, { item: pool[pool.length - 1].id });
  if (a.cards[0].item.id !== pool[pool.length - 1].id) fail("시연 카드 지정이 첫 장에 안 나옴");
  const b = G.draw(1, o, P.pity, P.pity.count, col.items, rnd, { grade: "special" });
  if (b.cards[0].grade !== G.fit("special", col.items)) fail("시연 특별 지정이 fit 을 안 따름");
}
console.log(bad ? `\n✗ 문제 ${bad}개` : "\n✓ 모두 통과");
process.exit(bad ? 1 : 0);
