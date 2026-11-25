// 51: 배포 버전 꼬리표 한 번에 바꾸기. 배포(main 병합) 전에 한 번 실행한다.
//   node tools/version.mjs            → 지금 시각(YYYYMMDD-HHmm)으로
//   node tools/version.mjs 51-1       → 그 값으로
// 바꾸는 곳: index.html 의 <meta name="moti-version"> · 이 저장소 js/css 를 부르는 ?v= 꼬리표, data/version.json 의 v.
// 앱은 data/*.json 을 같은 ?v= 로 부르고, 열 때 data/version.json(캐시 안 씀)과 화면의 버전이 다르면 한 번만 새로고침한다.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const pad=n=>String(n).padStart(2,"0"),d=new Date();
const v=process.argv[2]||`${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
if(!/^[\w.-]+$/.test(v))throw new Error("버전은 영문·숫자·.-_ 만: "+v);
const ip=path.join(root,"index.html");let h=fs.readFileSync(ip,"utf8");
h=h.replace(/(<meta name="moti-version" content=")[^"]*(")/,`$1${v}$2`);
// 이 저장소 파일만(http 로 시작하지 않는 것)
h=h.replace(/(<script src=")(?!https?:)([^"?]+\.js)(\?v=[^"]*)?(")/g,`$1$2?v=${v}$4`);
h=h.replace(/(<link rel="stylesheet" href=")(?!https?:)([^"?]+\.css)(\?v=[^"]*)?(")/g,`$1$2?v=${v}$4`);
fs.writeFileSync(ip,h);
const vp=path.join(root,"data","version.json");
fs.writeFileSync(vp,JSON.stringify({_설명:"51 배포 버전. node tools/version.mjs 가 index.html 과 같이 바꿈(손으로 바꾸지 않음). 앱 화면(index.html meta moti-version)과 다르면 한 번 새로고침",v},null,2)+"\n");
console.log("버전",v);
