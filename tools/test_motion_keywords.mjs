// 84-2 C-3: 지문 단어 → 몸짓 고르기(data/motion_keywords.json) 확인.
// index.html pickMotion 의 ② 지문 단어 단계와 같은 규칙: 단어가 지문에 들어 있으면 맞음, not 에 든 말은 지우고 찾음,
// 여럿이면 지문에서 먼저 나온 것 → 같은 자리면 목록 앞의 것. (해금·최근·장소는 여기서 보지 않고 allowed 로만 거름)
// 실행: node tools/test_motion_keywords.mjs            — 아래 기대값 확인
//       node tools/test_motion_keywords.mjs old.json corpus.json — 예전 단어 목록과 비교(말뭉치 문장마다 고른 몸짓이 바뀐 것만 출력)
import { readFileSync } from "node:fs";

const load = p => JSON.parse(readFileSync(p, "utf8"));
const KW = load("data/motion_keywords.json");

export function pick(kw, act, allowed) {
  let at = Infinity, r = null;
  for (const k of kw.keywords || []) {
    if (allowed && !allowed.includes(k.id)) continue;
    let t = act;
    for (const n of k.not || []) t = t.split(n).join(" ".repeat(n.length));
    for (const w of k.words || []) { const i = t.indexOf(w); if (i >= 0 && i < at) { at = i; r = k.id } }
  }
  return r;
}

const [oldPath, corpusPath] = process.argv.slice(2);
if (oldPath && corpusPath) {
  const OLD = load(oldPath), C = load(corpusPath);
  let changed = 0;
  for (const s of C) { const a = pick(OLD, s), b = pick(KW, s); if (a !== b) { changed++; console.log(`${a || "-"} → ${b || "-"} | ${s}`) } }
  console.log(`말뭉치 ${C.length}문장 중 바뀜 ${changed}`);
  process.exit(0);
}

// [지문, 기대 몸짓(null = 몸짓 없음)]
const cases = [
  ["고개를 돌려 옆을 바라본다", "x42"],
  ["부끄러워 시선을 피한다", "m05"],
  ["고개를 돌린다", "m05"],
  ["머리카락을 귀 뒤로 쓸어 넘긴다", "c02"],
  ["머리를 긁적인다", "x43"],
  ["수줍게 입을 가리고 웃는다", "x49"],
  ["웃음을 터뜨린다", "m01"],
  ["환하게 웃는다", "m01"],
  ["피식 웃는다", null],
  ["코웃음을 친다", "m20"],
  ["입꼬리가 올라간다", null],
  ["검지로 가리키며 눈을 가늘게 뜬다", "x40"],
  ["어이가 없다는 듯 양손을 들어 올린다", "x41"],
  ["양손을 들어 올리며 어깨를 으쓱한다", "x41"],
  ["손을 들어 막는다", "x11"],
  ["고개를 갸웃한다", "x46"],
  ["궁금한 듯 고개를 기울인다", "x46"],
  ["질투하는 듯 입술을 삐죽인다", "x47"],
  ["질투 안 해. 그냥 물어본 거야", null],
  ["당신의 질투를 눈치챈다", null],
  ["손으로 얼굴을 가린다", "x48"],
  ["얼굴을 감싸며 당황한다", "x48"],
  ["당황한다", "m06"],
  ["당신이 고개를 갸웃하자 웃는다", null],
  ["팔짱을 낀다", "m07"],
  ["카운터에 팔꿈치를 괴고 몸을 숙인다", "c03"]
];
let fail = 0;
for (const [s, want] of cases) { const got = pick(KW, s); if (got !== want) { fail++; console.log(`✗ ${s} → ${got} (기대 ${want})`) } }
// 신규 몸짓 단어가 다른 몸짓 단어와 똑같이 겹치지 않는지
const seen = {};
for (const k of KW.keywords) for (const w of k.words) { if (seen[w] && seen[w] !== k.id && !(["x37", "x38"].includes(k.id) && ["x37", "x38"].includes(seen[w]))) console.log(`· 같은 단어 「${w}」 ${seen[w]} · ${k.id}`); seen[w] = seen[w] || k.id }
// x45(카드팩 전용)는 단어로 고르지 않음
if (KW.keywords.some(k => k.id === "x45")) { fail++; console.log("✗ x45 가 단어 목록에 있음") }
console.log(fail ? `실패 ${fail}` : `✓ ${cases.length}개 모두 통과`);
process.exit(fail ? 1 : 0);
