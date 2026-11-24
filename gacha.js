// 선물 뽑기(9-A). 앱(index.html)과 확인용 시뮬레이션(tools/check_gacha.mjs)이 같은 코드를 쓴다.
// 숫자(확률·보너스·천장)는 모두 data/gifts.json, 몸짓·등급은 data/collection.json
(function(root){
  const ORDER=["common","rare","special"];
  // 이 선물의 등급 확률(%). 기분 맞춤이면 희귀 +bonus.rare %p, 그만큼 bonus.from(일반)에서 뺀다
  // 47: items(도감 칸)를 주면 몸짓이 없는 등급의 확률을 fit 으로 내린 등급에 더함(특별 % → 레어 %). 확률 표·뽑기가 같은 값을 씀
  function odds(gift,matched,bonus,items){
    const o={...gift.odds};
    if(matched&&bonus&&bonus.rare){const take=Math.min(bonus.rare,o[bonus.from||"common"]||0);o[bonus.from||"common"]-=take;o.rare=(o.rare||0)+take}
    if(!items)return o;
    const r={};ORDER.forEach(k=>r[k]=0);ORDER.forEach(k=>{r[fit(k,items)]+=o[k]||0});
    return r;
  }
  // 47: 그 등급에 얻을 수 있는 선물 몸짓(보류 hold 빼고)이 있는지
  function has(items,g){return items.some(x=>x.source==="gift"&&x.grade===g&&!x.hold)}
  // 47: 그 등급 선물 몸짓이 하나도 없으면(특별 g11·g12 가 모두 보류) 있는 등급까지 한 단계씩 내림 → 특별은 레어로
  function fit(grade,items){if(!items)return grade;let i=ORDER.indexOf(grade);while(i>0&&!has(items,ORDER[i]))i--;return ORDER[Math.max(0,i)]}
  // 47: 얻을 수 있는 등급만(확률 표 열)
  function grades(items){return ORDER.filter(k=>has(items,k))}
  // 등급 하나 뽑기. pityLeft === 1 이면 pity.min 이상(그 위 등급들의 확률 비율대로)
  function rollGrade(o,pityLeft,pity,rnd){
    rnd=rnd||Math.random;
    let keys=ORDER;
    if(pity&&pityLeft<=1){const i=ORDER.indexOf(pity.min||"rare");keys=ORDER.slice(i)}
    const tot=keys.reduce((a,k)=>a+(o[k]||0),0);
    let r=rnd()*tot;
    for(const k of keys){r-=o[k]||0;if(r<0)return k}
    return keys[keys.length-1];
  }
  // 다음 천장 남은 횟수: pity.min 이상이 나오면 count 로, 아니면 하나 줄임
  function nextPity(grade,pityLeft,pity){
    const min=ORDER.indexOf(pity.min||"rare");
    return ORDER.indexOf(grade)>=min?pity.count:Math.max(1,pityLeft-1);
  }
  // 그 등급의 선물 몸짓 중 하나
  function pickItem(items,grade,rnd){rnd=rnd||Math.random;const L=items.filter(x=>x.source==="gift"&&x.grade===grade&&!x.hold);return L[Math.floor(rnd()*L.length)]||null}
  // 대사: 나온 등급으로. 기분 맞춤이고 결과가 일반이면 mood
  function line(gift,grade,matched){return matched&&grade==="common"&&gift.lines.mood?gift.lines.mood:gift.lines[grade]}
  const api={ORDER,odds,fit,grades,rollGrade,nextPity,pickItem,line};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.Gacha=api;
})(typeof window!=="undefined"?window:globalThis);
