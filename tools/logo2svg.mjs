// 로고 「moti」를 글꼴 없이 그려지는 SVG 경로로(35). 글꼴 파일은 저장소에 넣지 않는다(_src/).
// 쓰는 법: (한 번만) npm i opentype.js  →  node tools/logo2svg.mjs [글꼴 _src/Fredoka-SemiBold.ttf] [출력 assets/logo_moti.svg]
// 글자 간격: 글꼴 기본 간격(advance + 커닝)에서 글자 크기의 TRACK 만큼 좁힘(-0.01 = -1%). 색은 fill="currentColor"(CSS 색을 따름).
// viewBox 는 여백 없이 글자 테두리에 딱 맞게. 좌표는 글자 크기 1000(= em) 기준, 소수 한 자리
import fs from "fs";
import opentype from "opentype.js";

const TEXT = "moti", SIZE = 1000, TRACK = -0.01;
const [inp = "_src/Fredoka-SemiBold.ttf", out = "assets/logo_moti.svg"] = process.argv.slice(2);
const buf = fs.readFileSync(inp);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const k = SIZE / font.unitsPerEm, glyphs = font.stringToGlyphs(TEXT);
const path = new opentype.Path();
let x = 0;
glyphs.forEach((g, i) => {
  path.extend(g.getPath(x, 0, SIZE));
  x += g.advanceWidth * k + (i < glyphs.length - 1 ? font.getKerningValue(g, glyphs[i + 1]) * k + TRACK * SIZE : 0);
});
const b = path.getBoundingBox(), r = v => Math.round(v * 10) / 10;
const vb = [r(b.x1), r(b.y1), r(b.x2 - b.x1), r(b.y2 - b.y1)];
const d = path.toPathData(1);
const nm = n => n && (n.en || Object.values(n)[0]), N = font.names, name = nm(N.fullName) || nm(N.windows && N.windows.fullName) || nm(N.macintosh && N.macintosh.fullName) || "Fredoka";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(" ")}" role="img" aria-label="${TEXT}"><title>${TEXT}</title><!-- ${name}, SIL OFL 1.1 · tools/logo2svg.mjs --><path fill="currentColor" d="${d}"/></svg>\n`;
fs.writeFileSync(out, svg);
console.log(JSON.stringify({ 글꼴: name, viewBox: vb.join(" "), 가로세로비: +(vb[2] / vb[3]).toFixed(4), 바이트: svg.length }));
