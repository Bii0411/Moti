// 입장권 필름 사진 다시 만들기(7-2). 의존성 없음(Node 22 이상 + Chrome).
// 사용법: 저장소 폴더에서 로컬 서버를 켠 뒤(python -m http.server 8765)
//   node tools/filmshot.mjs [주소, 기본 http://localhost:8765/]
// → 헤드리스 Chrome 으로 ?filmshot=1&skipintro=1 을 열고(film.js FilmShot), 만든 webp 를
//   data/onboarding.json film.image 위치(기본 assets/onboarding/film_seoa.webp)에 저장한다.
// 찍을 몸짓·순간·구도는 data/onboarding.json film.shots·shotFrame. Chrome 위치가 다르면 환경 변수 CHROME 에.
import {spawn} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const base=(process.argv[2]||"http://localhost:8765/").replace(/\/?$/,"/");
const film=JSON.parse(fs.readFileSync(path.join(ROOT,"data/onboarding.json"),"utf8")).film||{};
const out=path.join(ROOT,film.image||"assets/onboarding/film_seoa.webp");
const CHROME=process.env.CHROME||({win32:"C:/Program Files/Google/Chrome/Application/chrome.exe",darwin:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}[process.platform]||"google-chrome");
const PORT=9339,sleep=ms=>new Promise(r=>setTimeout(r,ms));

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"filmshot-"));
const chrome=spawn(CHROME,["--headless=new",`--remote-debugging-port=${PORT}`,`--user-data-dir=${dir}`,"--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--no-first-run","about:blank"],{stdio:"ignore"});
let ws;
try{
  let page;for(let i=0;i<60&&!page;i++){try{page=(await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(t=>t.type==="page")}catch(e){}if(!page)await sleep(250)}
  if(!page)throw new Error("Chrome 을 열지 못했어요: "+CHROME);
  ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
  let id=0;const pend={};ws.onmessage=e=>{const m=JSON.parse(e.data);if(pend[m.id]){pend[m.id](m);delete pend[m.id]}};
  const send=(method,params={})=>new Promise((r,j)=>{const i=++id;pend[i]=m=>m.error?j(new Error(m.error.message)):r(m.result);ws.send(JSON.stringify({id:i,method,params}))});
  // 픽셀 비율 2: 칸 크기의 두 배로 그려서 줄여 붙임(외곽선 굵기도 화면과 같은 비율)
  await send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:2,mobile:true});
  await send("Page.navigate",{url:base+"?filmshot=1&skipintro=1"});
  const t0=Date.now();let r=null;
  let last="";
  while(Date.now()-t0<600000){await sleep(1000);
    try{const v=(await Promise.race([send("Runtime.evaluate",{expression:"window.__film||{p:window.__filmProgress||'준비 중'}",returnByValue:true}),sleep(3000)]));
      const x=v&&v.result&&v.result.value;if(x&&x.p){if(x.p!==last)console.log("찍는 중 "+(last=x.p))}else if(x)r=x}catch(e){}
    if(r)break}
  if(!r)throw new Error("시간 초과: 사진을 만들지 못했어요");
  if(r.error)throw new Error(r.error);
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,Buffer.from(r.url.slice(r.url.indexOf(",")+1),"base64"));
  console.log(`저장: ${path.relative(ROOT,out)} (${r.w}×${r.h}, ${(fs.statSync(out).size/1024).toFixed(1)}KB)`);
}finally{try{ws&&ws.close()}catch(e){}chrome.kill();await sleep(300);try{fs.rmSync(dir,{recursive:true,force:true})}catch(e){}}
