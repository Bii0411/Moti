// 몸짓 도감(data/collection.json)의 items 를 다시 만든다 (9-A).
// 대화 몸짓 = data/seoa_story.json unlock 의 stage·flag·event 몸짓 전부(ban 제외), 등급은 gradeRule 로 계산해 grade 에 적는다.
// 카드 팩 칸 g01~g10(49, 예전 선물)·보류 선물 칸 g11·g12 = data/collection.json 에 이미 적힌 값(원고 docs/drafts/9-선물-앨범-원고.md 1절)을 그대로 둔다.
// 38: 카드 번호(no)는 칸마다 고정. 새 칸은 다음 번호, 없어진 칸의 번호는 retiredNo 에 남겨 다시 쓰지 않음.
// 실행: node tools/build_collection.mjs
import { readFileSync, writeFileSync } from "node:fs";

const story = JSON.parse(readFileSync("data/seoa_story.json", "utf8"));
const motions = JSON.parse(readFileSync("data/motions.json", "utf8")).motions;
const col = JSON.parse(readFileSync("data/collection.json", "utf8"));
const R = col.gradeRule;
const ban = new Set(story.ban || []);
const seoaOnly = new Set(R.seoaOnly.ids);
// 84-2 E-2: noCard = 대화 몸짓이지만 카드를 만들지 않는 몸짓(x49 수줍게 웃기 = 카드 팩 g02 「입 가리고 웃기」·x19 와 같은 모션이라 같은 카드를 무료로 또 얻지 않게)
const noCard = new Set(col.noCard || []);

const chat = [];
const seen = new Set();
const push = (id, from) => {
  if (ban.has(id) || seen.has(id) || noCard.has(id)) return;
  seen.add(id);
  let grade;
  if ((R.byId || {})[id]) grade = R.byId[id];  // 52: 몸짓 하나만 규칙에서 빼고 정한 등급(m13 손 흔들기 = 일반)
  else if (seoaOnly.has(id)) grade = R.seoaOnly.grade;
  else if (from.stage) grade = R.stage[from.stage];
  else grade = R[from.sec];
  chat.push({ id, name: (motions[id] || {}).name || id, source: "chat", grade, from });
};
for (const k of Object.keys(story.unlock.stage).sort()) for (const id of story.unlock.stage[k].motions) push(id, { stage: +k });
for (const sec of ["flag", "event"]) for (const k in story.unlock[sec]) for (const id of story.unlock[sec][k].motions) push(id, { sec, key: k });

const gift = col.items.filter(x => x.source === "gift" || x.source === "pack" || x.source === "moment" || x.source === "free");  // 78: 촬영 전용 포즈 카드(pose, 팩 p02~p14 · 무료 p01)도 그대로  // 49: 카드 팩(pack) + 보류 선물(gift) · 50: 순간 선물 반응 카드(moment)
// 31: only 가 있는 칸 = 단계 해금이 아니라 정해진 연출에서만 얻는 칸(x17 「첫 만남」 = only "firstMeet"). 다시 만들어도 그대로 둠(대화 칸 뒤)
const only = col.items.filter(x => x.only && !seen.has(x.id));
// 44: hold(보류) 칸 = 지금은 얻을 수 없어 숨긴 칸(m23 바디웨이브 댄스, 옥상 춤 보류). ban·unlock 에서 빠져도 그대로 두고 번호를 지킴.
//   나중에 hold 를 지우고 unlock 에 몸짓을 붙이면 같은 번호로 다시 나타남(그때는 unlock 쪽 칸이 되고 이 줄은 건너뜀)
const held = col.items.filter(x => x.hold && !gift.includes(x) && !seen.has(x.id) && !only.includes(x));  // 47: 선물 칸의 hold(g11·g12)는 선물 줄에 그대로
const items = [...chat.map(({ from, ...x }) => ({ ...x, ...(from.stage ? { stage: from.stage } : { [from.sec]: from.key }) })), ...held, ...only, ...gift];
// 38: 카드 번호 no 는 한 번 정하면 그대로(예전 칸의 번호를 id 로 찾아 씀). 새 칸은 지금 가장 큰 번호 다음부터 차례로. 빠진 칸의 번호는 다시 쓰지 않음
const oldNo = Object.fromEntries(col.items.filter(x => x.no).map(x => [x.id, x.no]));
let nextNo = Math.max(0, ...Object.values(oldNo), ...(col.retiredNo || []));
col.items = items.map(({ no, id, ...x }) => ({ id, no: oldNo[id] || ++nextNo, ...x }));
const gone = Object.keys(oldNo).filter(id => !col.items.some(x => x.id === id));
if (gone.length) col.retiredNo = [...new Set([...(col.retiredNo || []), ...gone.map(id => oldNo[id])])].sort((a, b) => a - b);
writeFileSync("data/collection.json", JSON.stringify(col, null, 2) + "\n");
console.log(`대화 ${chat.length}${held.length ? ` + 보류 ${held.length}` : ""}${only.length ? ` + 연출 ${only.length}` : ""} + 카드 팩·선물 ${gift.length} = ${col.items.length}칸`);
