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
console.log(`- 도감 칸: 대화 ${chat.length} + 연출 ${col.items.filter(x => x.only).length} + 카드 팩 ${packAll.length} + 보류 선물 ${oldGift.length} = ${col.items.length} (그중 보류 ${held.map(x => x.id).join("·") || "없음"}, 보이는 칸 ${col.items.length - held.length})`);
const ids = col.items.map(x => x.id);
if (new Set(ids).size !== ids.length) fail("id 중복");
const want = new Set();
for (const k in story.unlock.stage) story.unlock.stage[k].motions.forEach(x => want.add(x));
for (const s of ["flag", "event"]) for (const k in story.unlock[s]) story.unlock[s][k].motions.forEach(x => want.add(x));
(story.ban || []).forEach(x => want.delete(x));
if (chat.length !== want.size || chat.some(x => !want.has(x.id))) fail("대화 몸짓이 unlock(ban 제외)과 다름");
if (chat.some(x => (story.ban || []).includes(x.id))) fail("ban 몸짓이 들어 있음");
// 49: 예전 선물 카드 g01~g12 = 카드 팩 10장(g01~g10) + 보류 2장(g11·g12, source gift 그대로)
if (packAll.length + oldGift.length !== 12) fail("카드 팩 + 보류 선물 카드가 12장이 아님");
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
// 47: 특별 카드가 모두 보류면 특별 → 레어
if (!pool.some(x => x.grade === "special")) {
  if (G.fit("special", col.items) !== "rare") fail("특별이 레어로 내려가지 않음");
  console.log(`- 특별 카드 없음(보류) → 특별 결과는 ${KO[G.fit("special", col.items)]}로`);
}
// 49: 선물은 뽑기 없이 — 예전 값은 _보류 에만
if (gifts.list.some(g => g.odds || g.lines)) fail("선물에 odds·lines 가 남아 있음(_보류 로)");
if (gifts.list.some(g => !g._보류 || !g._보류.odds || !g._보류.lines)) fail("선물 _보류 에 예전 확률·대사가 없음");
if (!(ui.gift && ui.gift.srv && ui.gift.srv.includes("{gift}") && ui.gift.fallback)) fail("ui.gift.srv·fallback 없음");
for (const k of ["title", "pity", "one", "ten", "odds", "oddsTitle", "noDia", "flipAll", "new", "owned", "summaryNew", "summaryDup", "again", "done"]) if (!(ui.pack && ui.pack[k])) fail(`ui.pack.${k} 없음`);
if (!(ui.album && ui.album.seg && ui.album.seg.pack)) fail("ui.album.seg.pack 없음");
if (JSON.stringify(ui).includes("가챠")) fail("화면 문구에 「가챠」");

// 결정적 난수(매번 같은 결과)
let seed = 20261125;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

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
// 시연 지정: 첫 장만 그것으로
{
  const a = G.draw(10, o, P.pity, P.pity.count, col.items, rnd, { item: pool[pool.length - 1].id });
  if (a.cards[0].item.id !== pool[pool.length - 1].id) fail("시연 카드 지정이 첫 장에 안 나옴");
  const b = G.draw(1, o, P.pity, P.pity.count, col.items, rnd, { grade: "special" });
  if (b.cards[0].grade !== G.fit("special", col.items)) fail("시연 특별 지정이 fit 을 안 따름");
}
console.log(bad ? `\n✗ 문제 ${bad}개` : "\n✓ 모두 통과");
process.exit(bad ? 1 : 0);
