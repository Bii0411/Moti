# 외부 자산 출처

저장소에서 확인할 수 있는 범위만 적었다. 출처를 모르는 것은 **확인 필요**. 원본 소스 파일(`.vroid`, `.fbx` 등)은 저장소에 넣지 않는다.

## 3D 모델

| 파일 | 쓰는 곳 | 출처 | 비고 |
| --- | --- | --- | --- |
| `seoa_vroid.glb` | `index.html`, `v1.html`(서아) | VRoid 모델 (표정 데이터 `Fcl_…`가 있어 VRoid Studio 내보내기로 보임). 제작자·라이선스 **확인 필요** | 원본 `.vroid`는 저장소 밖 |
| `seoa.glb` | `xstage.html` | Bii0411 업로드. 제작 도구·출처 **확인 필요** | 이전 서아 모델 |
| `jihu.glb` | `v1.html`(지후) | Bii0411 업로드. 출처 **확인 필요** | |

## 모션

| 파일 | 쓰는 곳 | 출처 | 비고 |
| --- | --- | --- | --- |
| `motions/xstage_embarrassing3.json` | `index.html`(m24 부끄러워하기), `xstage.html` | XSTAGE 구매 모션 「Lovely – Embarrassing 3」 (`xstage.html` 설명 기준). 라이선스 범위 **확인 필요** | 원본 `standard_Lovely - Embarrassing 3.fbx`에서 뼈 20개를 뽑아 변환. FBX는 저장소에 없음 |
| `motions/xstage_*.json` 16개 (x01~x16) | `index.html`(data/motions.json xstage 12개, 아직 단계·선물에 연결 안 됨. x04·x07·x08·x12 는 xstageReserve 로 따로 둠) | XSTAGE 모션 묶음(`XSTAGE-Motion-0.zip`, 2026-11-24 받음): 「Annoyance_1」, 「Bent Over」, 「Blunt - Handing out candy 1」, 「Evade_Jog_Spin_R」, 「Hold Forehead」, 「Idle_Arms Crossed_male」, 「MOV_Dive Roll Breakfall」, 「Macho Man - Taunt5」, 「Maid_Grab」, 「Proud - Persuasion」, 「Raise Hand to Stop」, 「Round house Kick 1」, 「Rub Neck_One Hand」, 「Shy - Surprise1」, 「Shy Walk」, 「Stealth_Squat_Idle_Alert」. 라이선스 범위 **확인 필요** | 원본 `[standard] *.fbx`를 `tools/fbx2motion.mjs`로 변환(뼈 20개, 30fps). FBX는 저장소에 없음 |
| `motions/xstage_standard_kick.json` (x17 돌려차기) | `index.html`(첫 만남 연출, 시연 패널, 무빙 카드 「첫 만남」) | XSTAGE 「돌려차기 반복」(xstage.co 상품 5093). 라이선스 범위 **확인 필요** | 원본 `standard_Kick.fbx`(2026-11-24 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개, 30fps). FBX는 저장소에 없음 |
| `motions/xstage_checking_watch.json` (x18 시계 보기) | `index.html`(내가 말이 없을 때 대화방에서, 시연 패널) | XSTAGE 「[standard] Waiting - Checking watch」. 라이선스 범위 **확인 필요** | 원본 `standard_Waiting.fbx`(2026-11-24 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개, 30fps). FBX는 저장소에 없음 |
| `motions/xstage_wave_and_laugh.json` (m13 손 흔들기) | `index.html`(대화 몸짓, 다시 들어올 때 인사, 작별 인사 키워드, 시연 패널) | XSTAGE 「[standard] Wave and Laugh」. 라이선스 범위 **확인 필요** | 원본 `standard_Wave_and_Laugh.fbx`(2026-11-24 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개, 30fps). FBX는 저장소에 없음 |
| `motion.js` m01~m25, c01~c05 | 전체 | 직접 만든 코드 몸짓 | 외부 자산 아님 |

## 그림

| 파일 | 쓰는 곳 | 출처 |
| --- | --- | --- |
| `bg_seoa_street.jpg`, `bg_seoa_rooftop.jpg`, `bg_seoa_alley.jpg`, `bg_seoa_rain.jpg`, `bg_seoa_roof.jpg` | 서아 배경 | **확인 필요** |
| `pano_seoa_bar.webp`, `pano_seoa_street.webp` | 360도 배경 (30단계, 바 1층·네온 골목) | AI 이미지 생성 후 확대(Upscayl 4x)·수평선 보정. 그림체 참고 `bg_seoa_street.jpg`·`bg_seoa_rain.jpg`·`bg_seoa_bar.jpg`. 4096×2048 webp |
| `bg_jihu_class.jpg`, `bg_jihu_hall.jpg`, `bg_jihu_night.jpg` | 지후 배경 (`v1.html`) | **확인 필요** |
| `card_doyun.jpg`, `card_haram.jpg`, `card_ijun.jpg`, `card_jihu.jpg`, `card_seoa.jpg` | 캐릭터 카드 | **확인 필요** |
| `icons/gift_button.png`, `icons/gift_coffee.png`, `icons/gift_flower.png`, `icons/gift_ramen.png`, `icons/gift_ring.png` | 선물 버튼·아이콘 | 커밋 `040b5ed`「받은 디자인 이미지」. 만든 사람 **확인 필요** |
| `assets/onboarding/film_seoa.webp` | 입장권 3D 배경 필름 띠 (`film.js`) | 앱에서 직접 찍은 그림(7-2, `tools/filmshot.mjs`). 서아 모델 `seoa_vroid.glb` + 코드 몸짓(`motion.js`)을 렌더링한 것이라 서아 모델의 출처·라이선스를 따름 |
| ＋ 기능판·촬영 화면·사진 화면 아이콘(＋·선물·카메라·사진·멈춤·재생·공유·하트·휴지통·내려받기·닫기) | `index.html`, `photos.js` (10단계) | 코드 안 SVG 로 직접 그림(선 굵기 1.8, 둥근 끝). 외부 아이콘 세트 쓰지 않음 |

## 소리

| 이름 | 쓰는 곳 | 출처 |
| --- | --- | --- |
| 셔터 소리 | `photos.js` 촬영 화면 (10단계) | Web Audio 로 코드에서 만든 짧은 잡음(값 `data/photos.json sound`). 외부 소리 파일 없음 |

## 라이브러리·폰트 (저장소에 파일 없음, CDN으로 불러옴)

| 이름 | 쓰는 곳 | 출처 · 라이선스 |
| --- | --- | --- |
| three.js r128, GLTFLoader | `index.html`, `v1.html`, `xstage.html` | cdnjs / jsDelivr · MIT |
| Noto Sans KR | `v1.html` | Google Fonts · SIL Open Font License |
| 아래 탭바 아이콘(홈·대화·앨범·마이), 마이 페이지 PLUS 혜택 아이콘(무한·기억·말풍선·다이아·사진) | `index.html` (12단계) | [Tabler Icons](https://tabler.io/icons) (MIT 라이선스) 모양을 옮겨 코드 안 SVG 로 넣음. 선 굵기 1.8 |
| 다이아 재화 아이콘 | `index.html` 헤더·마이 페이지 (12단계) | 코드 안 SVG 로 직접 그림(임시) |
