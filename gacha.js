// 카드 팩 뽑기(49, 예전 9-A 선물 뽑기). 앱(index.html·pack.js)과 확인용 시뮬레이션(tools/check_gacha.mjs)이 같은 코드를 쓴다.
// 숫자(가격·확률·천장·환급)는 모두 data/pack.json, 카드·등급은 data/collection.json(source pack)
(function(root){
  const ORDER=["common","rare","special"];
  const SRC="pack";
  // 팩에서 나오는 카드(보류 hold 빼고)
  const pool=items=>(items||[]).filter(x=>x.source===SRC&&!x.hold);
  // 그 등급에 팩 카드가 있는지
  const has=(items,g)=>pool(items).some(x=>x.grade===g);
  // 47: 그 등급 카드가 하나도 없으면(특별 g11·g12 가 모두 보류) 있는 등급까지 한 단계씩 내림 → 특별은 레어로
  function fit(grade,items){if(!items)return grade;let i=ORDER.indexOf(grade);while(i>0&&!has(items,ORDER[i]))i--;return ORDER[Math.max(0,i)]}
  // 얻을 수 있는 등급만(확률 보기 줄)
  function grades(items){return ORDER.filter(k=>has(items,k))}
  // 등급 확률(%). items 를 주면 카드가 없는 등급의 %를 fit 으로 내린 등급에 더함(특별 % → 레어 %). 확률 보기·뽑기가 같은 값을 씀
  function odds(base,items){
    const o={...base};
    if(!items)return o;
    const r={};ORDER.forEach(k=>r[k]=0);ORDER.forEach(k=>{r[fit(k,items)]+=o[k]||0});
    return r;
  }
  // 카드 한 장의 확률(%) = 그 등급 % ÷ 그 등급 카드 수(확률 보기 목록)
  function cardPct(item,o,items){const n=pool(items).filter(x=>x.grade===item.grade).length;return n?(o[item.grade]||0)/n:0}
  // 등급 하나 뽑기. pityLeft <= 1 이면 pity.min 이상(그 위 등급들의 확률 비율대로)
  function rollGrade(o,pityLeft,pity,rnd){
    rnd=rnd||Math.random;
    let keys=ORDER;
    if(pity&&pityLeft<=1){const i=ORDER.indexOf(pity.min||"rare");keys=ORDER.slice(i)}
    const tot=keys.reduce((a,k)=>a+(o[k]||0),0);
    let r=rnd()*tot;
    for(const k of keys){r-=o[k]||0;if(r<0)return k}
    return keys[keys.length-1];
  }
  // 다음 천장 남은 장 수: pity.min 이상이 나오면 count 로, 아니면 하나 줄임
  function nextPity(grade,pityLeft,pity){
    const min=ORDER.indexOf(pity.min||"rare");
    return ORDER.indexOf(grade)>=min?pity.count:Math.max(1,pityLeft-1);
  }
  // 그 등급 카드 중 하나
  function pickItem(items,grade,rnd){rnd=rnd||Math.random;const L=pool(items).filter(x=>x.grade===grade);return L[Math.floor(rnd()*L.length)]||null}
  // n장 뽑기. left = 지금 천장 남은 장 수(1장·10장 뽑기가 같이 씀 → 10장 뽑기 한 번 안에는 min 이상이 꼭 있음)
  // force(시연 패널): {grade} 또는 {item} — 첫 장만 그것으로(천장 계산은 그대로 이어짐)
  // 돌려줌: {cards:[{item, grade, forced(천장으로 나온 장)}], left(다음 남은 장 수)}
  function draw(n,o,pity,left,items,rnd,force){
    const cards=[];let L=left==null?pity.count:left;
    for(let i=0;i<n;i++){
      let item=null,grade,forced=false;
      if(i===0&&force&&force.item){item=pool(items).find(x=>x.id===force.item)||null}
      if(item)grade=item.grade;
      else if(i===0&&force&&force.grade)grade=fit(force.grade,items);
      else{forced=L<=1;grade=rollGrade(o,L,pity,rnd)}
      if(!item)item=pickItem(items,grade,rnd);
      L=nextPity(grade,L,pity);
      cards.push({item,grade,forced});
    }
    return{cards,left:L};
  }
  const api={ORDER,pool,odds,fit,grades,cardPct,rollGrade,nextPity,pickItem,draw};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.Gacha=api;
})(typeof window!=="undefined"?window:globalThis);
