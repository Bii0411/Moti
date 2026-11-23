// 선물 뽑기(9-A). 앱(index.html)과 확인용 시뮬레이션(tools/check_gacha.mjs)이 같은 코드를 쓴다.
// 숫자(확률·보너스·천장)는 모두 data/gifts.json, 몸짓·등급은 data/collection.json
(function(root){
  const ORDER=["common","rare","special"];
  // 이 선물의 등급 확률(%). 기분 맞춤이면 희귀 +bonus.rare %p, 그만큼 bonus.from(일반)에서 뺀다
  function odds(gift,matched,bonus){
    const o={...gift.odds};
    if(matched&&bonus&&bonus.rare){const take=Math.min(bonus.rare,o[bonus.from||"common"]||0);o[bonus.from||"common"]-=take;o.rare=(o.rare||0)+take}
    return o;
  }
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
  function pickItem(items,grade,rnd){rnd=rnd||Math.random;const L=items.filter(x=>x.source==="gift"&&x.grade===grade);return L[Math.floor(rnd()*L.length)]||null}
  // 대사: 나온 등급으로. 기분 맞춤이고 결과가 일반이면 mood
  function line(gift,grade,matched){return matched&&grade==="common"&&gift.lines.mood?gift.lines.mood:gift.lines[grade]}
  const api={ORDER,odds,rollGrade,nextPity,pickItem,line};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.Gacha=api;
})(typeof window!=="undefined"?window:globalThis);
