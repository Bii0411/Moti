// [81] 부재중 셀카 로직 테스트: seoaphoto.js 를 그대로 불러 시간(Date.now)·화면 상태를 조작해 확인
// 실행: node tools/test_away_selfie.mjs .   (저장소 맨 위 폴더에서. 브라우저·서버 없이 Date.now 를 앞당겨 확인)
import fs from "fs";import vm from "vm";
const ROOT=process.argv[2];
const src=fs.readFileSync(ROOT+"/seoaphoto.js","utf8").replace("const r=await make(x);","const r=await (globalThis.__make||make)(x);");  // 테스트용: 사진 만들기만 바꿔 끼움
const html=fs.readFileSync(ROOT+"/index.html","utf8");
const trimSrc=html.slice(html.indexOf("const isTalk="),html.indexOf("function addMsg("));
const addSrc=html.slice(html.indexOf("function addMsg("),html.indexOf("// 캐릭터 답장 한 개"));
const sendLine=html.split("\n").find(l=>l.includes("SeoaPhoto.talked()"));
const DATA={seoaPhoto:JSON.parse(fs.readFileSync(ROOT+"/data/seoa_photo.json","utf8")),config:JSON.parse(fs.readFileSync(ROOT+"/data/config.json","utf8"))};
let NOW=Date.UTC(2026,10,26,3,0,0);
class FD extends Date{constructor(...a){a.length?super(...a):super(NOW)}static now(){return NOW}}
const ticks=[];const H={};let photos=[],nid=0;
const ctx={console,Promise,setTimeout:(f,ms)=>setTimeout(f,0),clearTimeout,setInterval:(f)=>{ticks.push(f);return 1},Date:FD,Math,JSON,Set,Object,Array,String,Error,
  performance:{now:()=>0},requestAnimationFrame:()=>0,CSS:{escape:x=>x},
  document:{hidden:false,addEventListener(e,f){H[e]=f},getElementById:()=>null,querySelector:()=>null,body:{appendChild(){}},createElement:()=>({classList:{add(){globalThis.BANNERS=(globalThis.BANNERS||0)+1},remove(){}},addEventListener(){},querySelector:()=>null})},window:{addEventListener(e,f){H[e]=f}},
  DATA,S:null,save(){},UI:(k)=>k,renderLog(){},renderUnread(){},setTab(t){ctx.curTab=t},openRoom(){},chBy:()=>({intro:"intro",img:""}),esc:x=>x,
  curTab:"home",busy:false,unlockBusy:false,unlockQ:[],GEN:0,SCENES:[{name:"바",img:""}],MNAME:{},IDLE:"m00",curStage:()=>3,
  Cam:{isOpen:()=>false},Onboard:{isOpen:()=>false},End:{locked:()=>false},Stage:{recentMotion:()=>false},
  Photos:{list:()=>photos,newId:()=>"p"+(++nid),add:async(m)=>{photos.push(m);return{ms:1}},remove:async()=>{},onChange(){},thumbUrl:()=>""},
  Thread:{cur:()=>ctx.S.thread||"main"}};
vm.createContext(ctx);
vm.runInContext(trimSrc+addSrc+"\nthis.trimChat=trimChat;this.addMsg=addMsg;this.chatOf=function(c){return S.chats[c]||(S.chats[c]=[])};",ctx);
vm.runInContext("function chatOf(c){return S.chats[c]||(S.chats[c]=[])}",ctx);
vm.runInContext(src+"\nthis.SeoaPhoto=SeoaPhoto;",ctx);
const SP=ctx.SeoaPhoto;
const blank=()=>({chats:{seoa:[]},read:{},threads:{},thread:"main",sp:null,room:null});
const wait=()=>new Promise(r=>setTimeout(r,5));
const MIN=60e3;
let pass=0,fail=0;const ok=(c,name)=>{if(c){pass++;console.log("  ✓ "+name)}else{fail++;console.log("  ✗ "+name)}};
// 화면 조작
const enterRoom=()=>{ctx.curTab="chat";ctx.S.room="seoa";SP.enter()};
const leaveRoom=()=>{ctx.curTab="home";ctx.S.room=null};
const tick=()=>ticks.forEach(f=>f());
const awayCount=(k)=>{const L=k&&k!==(ctx.S.thread||"main")?ctx.S.threads[k].chat:ctx.S.chats.seoa;return L.filter(m=>m.r==="ph"&&m.away).length};
const talk=(t="안녕",o,poseId)=>{const room="seoa";ctx.addMsg("u",t,o&&o.srv?{srv:o.srv}:poseId?{poseAsk:1}:null,room);
  // index.html send() 의 실제 줄과 같은 조건
  if(room==="seoa"&&!o&&!poseId)SP.talked();ctx.addMsg("c","응",null,room)};
const reset=()=>{ctx.S=blank();photos=[];ctx.curTab="home";ticks.length=0;ctx.__make=null;SP.init();};
ctx.__make=null;
const goThread=(to)=>{const S=ctx.S,k=S.thread||"main";S.threads[k]={...(S.threads[k]||{}),chat:S.chats.seoa};const t=S.threads[to];S.thread=to;S.chats.seoa=t&&t.chat?t.chat:[]};

console.log("send() 줄 확인:",sendLine.trim().slice(0,90));
ok(/room==="seoa"&&!o&&!poseId\)SeoaPhoto\.talked\(\)/.test(sendLine),"send(): 선물·순간 선물·밤 요청(o)·포즈 부탁(poseId)이면 talked 안 부름");
const uLine=html.split(String.fromCharCode(10)).find(l=>l.includes('addMsg("u",text,'));ok(uLine.split("//")[0].includes('Wait.start(room==="seoa");renderLog();'),"send(): 내 말 기록 줄의 Wait.start·renderLog 가 살아 있음(주석에 안 묻힘)");
const sendBody=html.slice(html.indexOf("async function send(text,o){"),html.indexOf("SeoaPhoto.talked()"));
ok(sendBody.includes("End.locked())return")&&sendBody.includes("Night.retry();return}"),"send(): talked 는 입력 제한·잠김·밤 넘기기 관문 뒤");

// 1~3
reset();
(async()=>{
console.log("1. 실제 대화 → 부재중 10분 → 셀카 한 장");
enterRoom();talk();leaveRoom();tick();
ok(ctx.S.sp.leave.main&&ctx.S.sp.leave.main.at===NOW,"떠난 시각 기록");
NOW+=9*MIN;tick();ok(awayCount()===0,"9분: 아직 없음");
NOW+=1*MIN;tick();ok(awayCount()===1,"10분: 한 장");ok(ctx.S.sp.can.main===false,"예약 즉시 can=false");
console.log("2. 이후 10분·30분·1시간 → 추가 없음");
for(const m of [10,30,60]){NOW+=m*MIN;tick();}ok(awayCount()===1,"그대로 한 장");
console.log("3. 대화 없이 재입장·퇴장 반복");
ctx.busy=true;  // 그림은 만들지 않게(대기)
for(let i=0;i<4;i++){enterRoom();leaveRoom();tick();NOW+=15*MIN;tick()}
ok(awayCount()===1,"재입장·퇴장 4번 뒤에도 한 장");ok(!ctx.S.sp.leave.main,"떠남 타이머 시작 안 함");
console.log("4. 새로고침·백그라운드");
const saved=JSON.parse(JSON.stringify(ctx.S));ctx.S=saved;ticks.length=0;SP.init();
NOW+=20*MIN;tick();enterRoom();leaveRoom();NOW+=20*MIN;tick();ok(awayCount()===1,"새로고침 뒤에도 한 장");
enterRoom();ctx.document.hidden=true;/* 백그라운드: onVis 와 같음 */ SP.tick();NOW+=30*MIN;ctx.document.hidden=false;SP.enter();ok(awayCount()===1,"백그라운드 뒤에도 한 장");
console.log("5. 다시 대화 → 10분 → 새 한 장");
enterRoom();talk("또 왔어");ok(ctx.S.sp.can.main===true,"실제 대화로 can=true");leaveRoom();tick();NOW+=10*MIN;tick();ok(awayCount()===2,"두 번째 셀카");
console.log("6. 인사·선물·포즈·밤 전환·되감기로 재활성화 안 됨");
enterRoom();ctx.addMsg("c","왔어?",{greet:1},"seoa");ctx.addMsg("sys","[다음 밤]",{night:1},"seoa");
talk("선물",{srv:"gift",gift:"g1"});talk("포즈 부탁",null,"p1");
ok(ctx.S.sp.can.main===false,"인사·시스템·선물·포즈 뒤 can=false");
// 되감기: 대화 기록만 예전으로(can 은 그대로)
ctx.S.chats.seoa=ctx.S.chats.seoa.slice(0,3);ok(ctx.S.sp.can.main===false,"되감기 뒤 can=false");
leaveRoom();tick();NOW+=30*MIN;tick();ok(awayCount()===0||!ctx.S.sp.leave.main,"타이머 없음");
const nAway=ctx.S.chats.seoa.filter(m=>m.away).length;ok(nAway===awayCount(),"추가 셀카 없음");
console.log("7. 10분 전 재입장 → 취소, 다음 퇴장부터 다시 셈");
reset();enterRoom();talk();leaveRoom();tick();const t0=NOW;NOW+=5*MIN;tick();enterRoom();ok(!ctx.S.sp.leave.main,"5분에 돌아옴: 타이머 취소");
NOW+=2*MIN;leaveRoom();tick();ok(ctx.S.sp.leave.main.at===NOW,"다시 나간 때부터 셈");NOW+=8*MIN;tick();ok(awayCount()===0,"8분: 없음(처음 떠난 때부터면 15분)");
NOW+=2*MIN;tick();ok(awayCount()===1,"10분: 한 장");
console.log("A3. markLeave 중복 호출(백그라운드 + pagehide)이 시각을 덮어쓰지 않음");
reset();enterRoom();talk();const a0=NOW;ctx.document.hidden=true;H.visibilitychange();ok(ctx.S.sp.leave.main.at===a0,"백그라운드로 떠난 시각");
NOW+=3*MIN;H.pagehide();ok(ctx.S.sp.leave.main.at===a0,"pagehide 가 첫 시각을 덮지 않음");
ctx.document.hidden=false;NOW+=8*MIN;H.visibilitychange();ok(awayCount()===1,"앞으로 오면(대화방) 떠난 지 11분 → 한 장");
ctx.document.hidden=true;H.visibilitychange();H.pagehide();ok(!ctx.S.sp.leave.main,"이미 받았으니 다시 세지 않음");ctx.document.hidden=false;
console.log("A3. 사진 만들기 실패해도 다시 예약 안 함");
reset();ctx.busy=false;ctx.__make=async()=>{throw new Error("실패")};enterRoom();talk();leaveRoom();tick();NOW+=10*MIN;tick();enterRoom();await wait();await wait();
ok(ctx.S.sp.pend.length===0&&ctx.S.sp.can.main===false,"실패 뒤 can=false, 예약 없음");leaveRoom();tick();NOW+=30*MIN;tick();ok(awayCount()===1,"새 예약 없음(자리 한 개 그대로)");
console.log("8. 본편·크리스마스 분리");
reset();enterRoom();talk("본편");leaveRoom();goThread("s2");tick();
ok(ctx.S.sp.leave.main&&!ctx.S.sp.leave.s2,"본편만 떠남 시각");
enterRoom();leaveRoom();tick();ok(!ctx.S.sp.leave.s2,"크리스마스: 대화 전엔 떠남을 세지 않음");enterRoom();talk("이브");leaveRoom();tick();NOW+=10*MIN;tick();
ok(awayCount("s2")===1,"크리스마스에서 한 장");ok(ctx.S.sp.can.s2===false&&ctx.S.sp.can.main===true,"크리스마스만 can=false");
goThread("main");tick();ok(awayCount("main")===1&&awayCount("s2")===1,"본편으로 돌아가면 본편 한 장(각자)");
const snap=JSON.parse(JSON.stringify(ctx.S.sp));ctx.S=JSON.parse(JSON.stringify(ctx.S));ticks.length=0;SP.init();ok(JSON.stringify(ctx.S.sp.can)===JSON.stringify(snap.can),"새로고침 뒤 줄기별 상태 유지");
console.log("9. 사진 만드는 중 중복 예약 없음 · 다른 줄기에 안 넣음");
reset();let rel;ctx.__make=()=>new Promise(r=>{rel=r});
enterRoom();talk();leaveRoom();tick();NOW+=10*MIN;tick();enterRoom();await wait();await wait();
ok(SP.isSending(),"그림 만드는 중");leaveRoom();tick();NOW+=30*MIN;tick();ok(awayCount()===1&&!ctx.S.sp.leave.main,"만드는 중 떠나도 새 예약 없음");
goThread("s2");ctx.S.chats.seoa.push({r:"u",t:"x",at:NOW});
rel({full:{size:1000},thumb:{size:100},w:3,h:4,mid:"m00",face:"soft",selfie:null,ms:{}});await wait();await wait();
ok(ctx.S.chats.seoa.every(m=>m.r!=="ph"),"크리스마스 기록에 사진 없음");
const mm=ctx.S.threads.main.chat.find(m=>m.away);ok(mm&&!mm.wait&&photos.length===1,"본편 자리에 채움(wait 지움)");
console.log("B. 예전 저장값 처음 상태");
const mk=(chat,sp)=>{ctx.S={...blank(),chats:{seoa:chat},sp};ticks.length=0;SP.init();return ctx.S.sp.can.main};
ok(mk([{r:"u",t:"a",at:1},{r:"c",t:"b",at:2}],null)===true,"마지막이 실제 대화 → 보낼 수 있음");
ok(mk([{r:"u",t:"a",at:1},{r:"ph",away:1,pid:"x",at:5}],null)===false,"대화 뒤 부재중 사진 → 불가");
ok(mk([{r:"u",t:"a",at:1}],{pend:[{type:"away",th:"main"}]})===false,"예약 사진 → 불가");
ok(mk([{r:"u",t:"a",at:1}],{leave:{main:{at:1,done:true}}})===false,"leave.done → 불가");
ok(mk([{r:"c",t:"intro",at:1}],null)===false,"실제 대화 없음 → 불가");
ok(mk([{r:"u",t:"선물",srv:"x",gift:"g",at:1}],null)===false,"선물 줄만 → 불가");
console.log("B. 처음부터·전체 초기화");
reset();enterRoom();talk();leaveRoom();tick();NOW+=10*MIN;tick();SP.resetThread("main");ctx.S.chats.seoa=[];
ok(!ctx.S.sp.leave.main&&!ctx.S.sp.pend.length&&ctx.S.sp.can.main===undefined,"처음부터: 줄기 상태 지움");leaveRoom();tick();ok(!ctx.S.sp.leave.main,"처음부터 뒤 대화 전엔 안 셈");
ctx.S=blank();SP.init();ok(ctx.S.sp.can.main===false,"전체 초기화 뒤 can=false");
console.log("B. 시연 「10분 지난 뒤 셀카 받기」");
reset();ctx.busy=true;enterRoom();talk();leaveRoom();tick();NOW+=10*MIN;tick();ok(awayCount()===1,"일반 한 장");
SP.now();await new Promise(r=>setTimeout(r,10));tick();ok(awayCount()===2,"시연은 can 상관없이 한 장 더");
console.log("10. 실제 대화 100개 보관(셀카 끼워 넣기 전후)");
reset();ctx.busy=true;enterRoom();for(let i=0;i<70;i++){ctx.addMsg("u","u"+i,null,"seoa");ctx.addMsg("c","c"+i,null,"seoa");NOW+=1000}
for(let i=0;i<5;i++)ctx.addMsg("sys","s",null,"seoa");
const talkN=()=>ctx.S.chats.seoa.filter(m=>(m.r==="u"||m.r==="c")&&!m.intro).length;
ok(talkN()===100,"끼워 넣기 전 실제 대화 100");SP.talked();leaveRoom();tick();NOW+=10*MIN;tick();
ok(talkN()===100&&awayCount()===1,"셀카 끼워 넣은 뒤에도 100 (예전 60줄 자르기 없음) · 전체 "+ctx.S.chats.seoa.length+"줄");
ok(ctx.trimChat("other",Array(80).fill({r:"u"})).length===60,"다른 캐릭터 60줄");
const many=[...Array(250)].flatMap((_,i)=>[{r:"u"},{r:"sys"}]);ok(ctx.trimChat("seoa",many).length<=300,"전체 최대 300줄");
console.log(`\n통과 ${pass} · 실패 ${fail}`);process.exit(fail?1:0)})();
