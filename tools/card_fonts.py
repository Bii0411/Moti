# 87-2 무빙 카드 글꼴 서브셋 만들기
# 실행: python tools/card_fonts.py   (저장소 맨 위에서. pip install fonttools brotli 필요)
# 원본 글꼴은 저장소 밖 _src/fonts_87-2/ (Pretendard-Black.otf · ChakraPetch-BoldItalic.ttf, 모두 SIL OFL 1.1)
# - 카드 이름(한글): Pretendard Black → data/collection.json items[].name 에 쓰인 글자 + ASCII 만 남김 → assets/fonts/card-title.woff2
#   카드 이름이 늘거나 바뀌면 다시 실행(빠진 글자는 대체 글꼴로 보이고, tools/check_gacha.mjs 가 알려 줌)
# - 등급 표·카드 번호(영문·숫자): Chakra Petch Bold Italic → ASCII → assets/fonts/card-latin.woff2
import json, os
from fontTools import subset
from fontTools.ttLib import TTFont
SRC = "_src/fonts_87-2"
col = json.load(open("data/collection.json", encoding="utf-8"))
names = "".join(x.get("name", "") for x in col["items"])
ascii_ = "".join(chr(c) for c in range(0x20, 0x7F))
chars = "".join(sorted(set(names + ascii_ + "·…")))
def make(src, out, text):
    f = TTFont(os.path.join(SRC, src))
    o = subset.Options(); o.flavor = "woff2"; o.layout_features = ["kern", "liga", "ccmp", "locl", "ljmo", "vjmo", "tjmo"]; o.name_IDs = ["*"]; o.notdef_outline = True
    s = subset.Subsetter(o); s.populate(text=text); s.subset(f)
    f.flavor = "woff2"; f.save(out); print(out, os.path.getsize(out), "bytes")
make("Pretendard-Black.otf", "assets/fonts/card-title.woff2", chars)
make("ChakraPetch-BoldItalic.ttf", "assets/fonts/card-latin.woff2", ascii_)
open("assets/fonts/card-title.chars.txt", "w", encoding="utf-8").write(chars)
