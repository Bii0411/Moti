// moti 선 아이콘 묶음(21, 23에서 search·sort·back·close, 24에서 plus, 26에서 info(동그라미 안 !), 46에서 cards(겹친 포토카드) 추가). 화면에 보이던 이모지 대신 쓰는 SVG 를 여기 한 곳에 모아 index.html·photos.js 등이 같이 쓴다.
// 선 아이콘: 선 굵기 1.8, 둥근 끝, 채우지 않음, 색 = currentColor(둘레 글자 색을 따름). 모양은 Tabler Icons(MIT)를 옮기거나 직접 그림
// Icon.svg(이름, 크기)  : 선 아이콘 하나
// Icon.gem(크기)        : 다이아 재화 아이콘(12단계 마이 페이지에서 직접 그린 것, 색 채움). 문구 안의 {gem} 자리를 Icon.fill 이 이것으로 바꿈
// Icon.heart(n, 크기)   : 관계 단계 하트(선 하트 안 가운데 숫자 n). n 이 crackAt(5, 엇갈림)이면 숫자 대신 금 간 선
// Icon.fill(html, 크기) : 이미 esc 한 문구 안의 {gem} 을 다이아 아이콘으로
const Icon=(()=>{
  const A='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const P={
    lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><path d="M12 15v2"/>',
    sparkle:'<path d="M12 3c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7z"/><path d="M19 16c.2 1.4.9 2.1 2.3 2.3-1.4.2-2.1.9-2.3 2.3-.2-1.4-.9-2.1-2.3-2.3 1.4-.2 2.1-.9 2.3-2.3z"/>',
    chat:'<path d="M8 9h8"/><path d="M8 13h6"/><path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-5l-5 3v-3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.8-4.8"/>',
    sort:'<path d="M4 8l3.5-3.5L11 8"/><path d="M7.5 4.5v15"/><path d="M20 16l-3.5 3.5L13 16"/><path d="M16.5 19.5v-15"/>',
    back:'<path d="M15 5l-7 7 7 7"/>',
    plus:'<path d="M12 5v14"/><path d="M5 12h14"/>',
    close:'<path d="M18 6 6 18"/><path d="M6 6l12 12"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 8v4.5"/><path d="M12 16h.01"/>',
    // 46: 포토카드 두 장이 겹친 모양(뒤 카드는 앞 카드에 가리지 않는 부분만, 앞 카드 아래 띠 한 줄). 아래 탭 컬렉션
    cards:'<path d="M8 17H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/><rect x="8" y="7" width="12" height="14" rx="2"/><path d="M11 17.5h6"/>',
    // 110: 이용권(가장자리 반달 홈이 있는 표). 출석 특별 에피소드 이용권
    ticket:'<path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2.2a2.8 2.8 0 0 0 0 5.6V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.2a2.8 2.8 0 0 0 0-5.6z"/><path d="M14 5.5v2"/><path d="M14 11v2"/><path d="M14 16.5v2"/>',
    gift:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C9.5 3 11 5.5 12 8c1-2.5 2.5-5 4.5-5a2.5 2.5 0 0 1 0 5"/>'
  };
  const svg=(n,sz=16)=>`<svg class="li li-${n}" width="${sz}" height="${sz}" ${A}>${P[n]||""}</svg>`;
  const gem=(sz=16)=>`<svg class="gem" width="${sz}" height="${sz}" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12l4 6-10 12L2 9z" fill="#7c5cff"/><path d="M2 9h20L12 21z" fill="#5b3fd6"/><path d="M6 3l3 6h6l3-6" fill="#a993ff"/><path d="M9 9l3 12 3-12z" fill="#6d4cf0"/></svg>`;
  // 하트: 둥근 위쪽 두 봉우리 + 아래 뾰족. 숫자가 들어갈 자리를 넓게 잡으려고 viewBox 24 안에 가득
  const HEART='<path d="M12 20.5 4.3 13a4.9 4.9 0 0 1 0-6.9 4.8 4.8 0 0 1 6.8 0l.9.9.9-.9a4.8 4.8 0 0 1 6.8 0 4.9 4.9 0 0 1 0 6.9z"/>';
  const CRACK='<path d="M12 7 10.6 10.2 13.2 12.4 11 15.6 12 18.5"/>';
  const CRACK_AT=5;
  // 숫자는 SVG 글자가 아니라 HTML 글자(가운데 맞춤이 브라우저마다 덜 흔들림). 색은 바깥 .hrt 의 color 하나로 선과 숫자가 같이 바뀜
  const heart=(n,sz=22)=>`<span class="hrt" style="width:${sz}px;height:${sz}px">${`<svg width="${sz}" height="${sz}" ${A}>${HEART}${+n===CRACK_AT?CRACK:""}</svg>`}${+n===CRACK_AT?"":`<b>${n}</b>`}</span>`;
  const fill=(html,sz=14)=>String(html).split("{gem}").join(gem(sz));
  // 공통 모양(한 번만 넣음)
  const css=`.li{display:inline-block;vertical-align:-.18em;flex:none}
.gem{display:inline-block;vertical-align:-.2em;flex:none}
.hrt{position:relative;display:inline-grid;place-items:center;flex:none;line-height:1}
.hrt svg{position:absolute;inset:0}
.hrt b{position:relative;font-size:var(--hn,9.5px);font-weight:800;line-height:1;margin-top:1px;font-variant-numeric:tabular-nums}`;
  const st=document.createElement("style");st.textContent=css;(document.head||document.documentElement).appendChild(st);
  return{svg,gem,heart,fill,CRACK_AT};
})();
