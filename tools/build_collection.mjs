// 몸짓 도감(data/collection.json)의 items 를 다시 만든다 (9-A).
// 대화 몸짓 = data/seoa_story.json unlock 의 stage·flag·event 몸짓 전부(ban 제외), 등급은 gradeRule 로 계산해 grade 에 적는다.
// 선물 몸짓 g01~g12 = data/collection.json 에 이미 적힌 값(원고 docs/drafts/9-선물-앨범-원고.md 1절)을 그대로 둔다.
// 실행: node tools/build_collection.mjs
import { readFileSync, writeFileSync } from "node:fs";

const story = JSON.parse(readFileSync("data/seoa_story.json", "utf8"));
const motions = JSON.parse(readFileSync("data/motions.json", "utf8")).motions;
const col = JSON.parse(readFileSync("data/collection.json", "utf8"));
const R = col.gradeRule;
const ban = new Set(story.ban || []);
const seoaOnly = new Set(R.seoaOnly.ids);

const chat = [];
const seen = new Set();
const push = (id, from) => {
  if (ban.has(id) || seen.has(id)) return;
  seen.add(id);
  let grade;
  if (seoaOnly.has(id)) grade = R.seoaOnly.grade;
  else if (from.stage) grade = R.stage[from.stage];
  else grade = R[from.sec];
  chat.push({ id, name: (motions[id] || {}).name || id, source: "chat", grade, from });
};
for (const k of Object.keys(story.unlock.stage).sort()) for (const id of story.unlock.stage[k].motions) push(id, { stage: +k });
for (const sec of ["flag", "event"]) for (const k in story.unlock[sec]) for (const id of story.unlock[sec][k].motions) push(id, { sec, key: k });

const gift = col.items.filter(x => x.source === "gift");
col.items = [...chat.map(({ from, ...x }) => ({ ...x, ...(from.stage ? { stage: from.stage } : { [from.sec]: from.key }) })), ...gift];
writeFileSync("data/collection.json", JSON.stringify(col, null, 2) + "\n");
console.log(`대화 ${chat.length} + 선물 ${gift.length} = ${col.items.length}칸`);
