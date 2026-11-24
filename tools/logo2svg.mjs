// 글자를 글꼴 없이 그려지는 SVG 경로로(35 로고 「moti」, 38 캐릭터 영문 이름). 글꼴 파일은 저장소에 넣지 않는다(_src/).
// 쓰는 법: (한 번만, 저장소 밖 임시 폴더에) npm i opentype.js
//   node tools/logo2svg.mjs                                   → 로고(기본값: _src/Fredoka-SemiBold.ttf, 「moti」, 간격 -1%, assets/logo_moti.svg)
//   node tools/logo2svg.mjs --font _src/GreatVibes-Regular.ttf --text Seoa --track 0 --out assets/name_seoa.svg
//   (예전처럼 위치 인자 [글꼴] [출력] 도 됨)
// 글자 간격: 글꼴 기본 간격(advance + 커닝)에서 글자 크기의 track 만큼 더하거나 뺌(-0.01 = -1%). 색은 fill="currentColor"(CSS 색을 따름).
// 이어 쓰는 글씨체(Great Vibes 등)는 글자끼리 이어지도록 track 0 을 권함.
// viewBox 는 여백 없이 글자 테두리에 딱 맞게. 좌표는 글자 크기 1000(= em) 기준, 소수 한 자리
import fs from "fs";
import opentype from "opentype.js";

const argv = process.argv.slice(2), opt = {}, pos = [];
for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith("--")) opt[a.slice(2)] = argv[++i]; else pos.push(a); }
const inp = opt.font || pos[0] || "_src/Fredoka-SemiBold.ttf";
const out = opt.out || pos[1] || "assets/logo_moti.svg";
const TEXT = opt.text || "moti", SIZE = 1000, TRACK = opt.track != null ? Number(opt.track) : -0.01;
const buf = fs.readFileSync(inp);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
// 글꼴의 대체 규칙(GSUB)을 opentype.js 가 못 읽으면(Great Vibes 등) 글자마다 기본 글리프로
let glyphs, plain = false;
try { glyphs = font.stringToGlyphs(TEXT); } catch (e) { glyphs = [...TEXT].map(c => font.charToGlyph(c)); plain = true; }
const k = SIZE / font.unitsPerEm;
const path = new opentype.Path();
let x = 0;
glyphs.forEach((g, i) => {
  path.extend(g.getPath(x, 0, SIZE));
  x += g.advanceWidth * k + (i < glyphs.length - 1 ? font.getKerningValue(g, glyphs[i + 1]) * k + TRACK * SIZE : 0);
});
const b = path.getBoundingBox(), r = v => Math.round(v * 10) / 10;
const vb = [r(b.x1), r(b.y1), r(b.x2 - b.x1), r(b.y2 - b.y1)];
const d = path.toPathData(1);
const nm = n => n && (n.en || Object.values(n)[0]), N = font.names, name = nm(N.fullName) || nm(N.windows && N.windows.fullName) || nm(N.macintosh && N.macintosh.fullName) || inp;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(" ")}" role="img" aria-label="${TEXT}"><title>${TEXT}</title><!-- ${name}, SIL OFL 1.1 · tools/logo2svg.mjs --><path fill="currentColor" d="${d}"/></svg>\n`;
fs.writeFileSync(out, svg);
console.log(JSON.stringify({ 글꼴: name, 글자: TEXT, viewBox: vb.join(" "), ...(plain ? { 대체규칙: "못 읽어 기본 글리프" } : {}), 가로세로비: +(vb[2] / vb[3]).toFixed(4), 바이트: svg.length }));
