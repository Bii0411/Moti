// 9단계 확인: 도감 데이터 검사 + 선물 뽑기 시뮬레이션 (앱과 같은 gacha.js 를 씀)
// 실행: node tools/check_gacha.mjs [횟수=10000]
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const G = require("../gacha.js");
const col = JSON.parse(readFileSync("data/collection.json", "utf8"));
const gifts = JSON.parse(readFileSync("data/gifts.json", "utf8"));
const story = JSON.parse(readFileSync("data/seoa_story.json", "utf8"));
const N = +(process.argv[2] || 10000);
const KO = { common: "일반", rare: "희귀", special: "특별" };
let bad = 0;
const fail = m => { bad++; console.log("  ✗ " + m); };

console.log("## 데이터 검사\n");
// 47: 보류(hold) 칸·연출(only) 칸은 unlock 비교에서 뺌. 선물 몸짓 수는 보류 포함 12
const chat = col.items.filter(x => x.source === "chat" && !x.hold && !x.only), gift = col.items.filter(x => x.source === "gift");
const held = col.items.filter(x => x.hold);
console.log(`- 도감 칸: 대화 ${chat.length} + 연출 ${col.items.filter(x => x.only).length} + 선물 ${gift.length} = ${col.items.length} (그중 보류 ${held.map(x => x.id).join("·") || "없음"}, 보이는 칸 ${col.items.length - held.length})`);
const ids = col.items.map(x => x.id);
if (new Set(ids).size !== ids.length) fail("id 중복");
const want = new Set();
for (const k in story.unlock.stage) story.unlock.stage[k].motions.forEach(x => want.add(x));
for (const s of ["flag", "event"]) for (const k in story.unlock[s]) story.unlock[s][k].motions.forEach(x => want.add(x));
(story.ban || []).forEach(x => want.delete(x));
if (chat.length !== want.size || chat.some(x => !want.has(x.id))) fail("대화 몸짓이 unlock(ban 제외)과 다름");
if (chat.some(x => (story.ban || []).includes(x.id))) fail("ban 몸짓이 들어 있음");
if (gift.length !== 12) fail("선물 몸짓이 12개가 아님");
for (const src of ["chat", "gift", "all"]) {
  const L = src === "all" ? col.items : col.items.filter(x => x.source === src);
  console.log(`- 등급별 (${src === "all" ? "전체" : src === "chat" ? "대화" : "선물"}): ` + G.ORDER.map(g => `${KO[g]} ${L.filter(x => x.grade === g).length}`).join(" · "));
}
for (const x of col.items) if (!G.ORDER.includes(x.grade)) fail(`${x.id} 등급 이상: ${x.grade}`);
console.log("\n| 선물 | 기분 맞춤 | 확률(일반/희귀/특별) | 합 | 기분 맞춤 적용 | 합 |\n|---|---|---|---|---|---|");
for (const g of gifts.list) {
  const a = G.odds(g, false, gifts.moodBonus, col.items), b = G.odds(g, true, gifts.moodBonus, col.items);
  const sa = G.ORDER.reduce((s, k) => s + a[k], 0), sb = G.ORDER.reduce((s, k) => s + b[k], 0);
  console.log(`| ${g.e} ${g.name} | ${g.rec} | ${G.ORDER.map(k => a[k]).join(" / ")} | ${sa} | ${G.ORDER.map(k => b[k]).join(" / ")} | ${sb} |`);
  if (sa !== 100) fail(`${g.name} 확률 합 ${sa}`);
  if (sb !== 100) fail(`${g.name} 기분 맞춤 확률 합 ${sb}`);
  for (const k of [...G.ORDER, "mood"]) if (!g.lines[k]) fail(`${g.name} ${k} 대사 없음`);
}

// 결정적 난수(매번 같은 결과)
let seed = 20261123;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

console.log(`\n## 뽑기 시뮬레이션 (선물마다 ${N.toLocaleString()}번)\n`);
console.log("| 선물 | 조건 | 확률(%) 일반/희귀/특별 | 결과(%) 일반/희귀/특별 | 가장 긴 연속 일반 | 천장 발동 |\n|---|---|---|---|---|---|");
for (const g of gifts.list) {
  for (const mode of ["천장 끔", "천장 켬", "기분 맞춤 + 천장 끔", "기분 맞춤 + 천장 켬"]) {
    const matched = mode.startsWith("기분"), pityOn = mode.endsWith("켬");
    const o = G.odds(g, matched, gifts.moodBonus, col.items);
    const cnt = { common: 0, rare: 0, special: 0 };
    let left = gifts.pity.count, run = 0, maxRun = 0, forced = 0;
    for (let i = 0; i < N; i++) {
      if (pityOn && left <= 1) forced++;
      const gr = G.rollGrade(o, pityOn ? left : Infinity, pityOn ? gifts.pity : null, rnd);
      cnt[gr]++;
      const it = G.pickItem(col.items, gr, rnd);
      if (!it || it.grade !== gr) fail(`${g.name} ${gr} 몸짓을 못 고름`);
      if (it && it.hold) fail(`${g.name} 보류 몸짓 ${it.id} 이 나옴`);
      if (pityOn) left = G.nextPity(gr, left, gifts.pity);
      run = gr === "common" ? run + 1 : 0; maxRun = Math.max(maxRun, run);
    }
    const pct = G.ORDER.map(k => (cnt[k] / N * 100).toFixed(1)).join(" / ");
    console.log(`| ${g.e} ${g.name} | ${mode} | ${G.ORDER.map(k => o[k]).join(" / ")} | ${pct} | ${maxRun} | ${pityOn ? forced : "-"} |`);
    if (!pityOn) for (const k of G.ORDER) { const p = o[k] / 100, se = Math.sqrt(p * (1 - p) / N); if (Math.abs(cnt[k] / N - p) > 4 * se + 1e-9) fail(`${g.name} ${mode} ${k} 비율이 확률과 다름`); }
    if (pityOn && maxRun >= gifts.pity.count) fail(`${g.name} ${mode}: 연속 일반 ${maxRun}`);
  }
}
// 선물 섞어 주기(천장은 모든 선물 합쳐서)
{
  let left = gifts.pity.count, run = 0, maxRun = 0;
  for (let i = 0; i < N * 4; i++) {
    const g = gifts.list[Math.floor(rnd() * 4)];
    const gr = G.rollGrade(G.odds(g, false, gifts.moodBonus, col.items), left, gifts.pity, rnd);
    left = G.nextPity(gr, left, gifts.pity); run = gr === "common" ? run + 1 : 0; maxRun = Math.max(maxRun, run);
  }
  console.log(`\n- 4종 섞어 ${(N * 4).toLocaleString()}번(천장 공유): 가장 긴 연속 일반 ${maxRun}`);
  if (maxRun >= gifts.pity.count) fail("섞어 주기에서 연속 일반 10");
}
// 47: 특별 선물 몸짓이 모두 보류면 특별 → 레어
if (!gift.some(x => x.grade === "special" && !x.hold)) {
  if (G.fit("special", col.items) !== "rare") fail("특별이 레어로 내려가지 않음");
  console.log(`- 특별 선물 몸짓 모두 보류 → 특별 결과는 ${KO[G.fit("special", col.items)]}로 (확률 표 열: ${G.grades(col.items).map(k => KO[k]).join("·")})`);
}
// 대사 규칙
for (const g of gifts.list) {
  if (G.line(g, "common", true) !== g.lines.mood) fail(`${g.name} 기분 맞춤 일반 → mood 대사 아님`);
  if (G.line(g, "rare", true) !== g.lines.rare) fail(`${g.name} 기분 맞춤 희귀 → rare 대사 아님`);
  if (G.line(g, "common", false) !== g.lines.common) fail(`${g.name} 일반 → common 대사 아님`);
}
console.log(bad ? `\n✗ 문제 ${bad}개` : "\n✓ 모두 통과");
process.exit(bad ? 1 : 0);
