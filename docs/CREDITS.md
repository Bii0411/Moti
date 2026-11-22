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
| `motion.js` m01~m25, c01~c05 | 전체 | 직접 만든 코드 몸짓 | 외부 자산 아님 |

## 그림

| 파일 | 쓰는 곳 | 출처 |
| --- | --- | --- |
| `bg_seoa_street.jpg`, `bg_seoa_rooftop.jpg`, `bg_seoa_alley.jpg`, `bg_seoa_rain.jpg`, `bg_seoa_roof.jpg` | 서아 배경 | **확인 필요** |
| `bg_jihu_class.jpg`, `bg_jihu_hall.jpg`, `bg_jihu_night.jpg` | 지후 배경 (`v1.html`) | **확인 필요** |
| `card_doyun.jpg`, `card_haram.jpg`, `card_ijun.jpg`, `card_jihu.jpg`, `card_seoa.jpg` | 캐릭터 카드 | **확인 필요** |
| `icons/gift_button.png`, `icons/gift_coffee.png`, `icons/gift_flower.png`, `icons/gift_ramen.png`, `icons/gift_ring.png` | 선물 버튼·아이콘 | 커밋 `040b5ed`「받은 디자인 이미지」. 만든 사람 **확인 필요** |

## 라이브러리·폰트 (저장소에 파일 없음, CDN으로 불러옴)

| 이름 | 쓰는 곳 | 출처 · 라이선스 |
| --- | --- | --- |
| three.js r128, GLTFLoader | `index.html`, `v1.html`, `xstage.html` | cdnjs / jsDelivr · MIT |
| Noto Sans KR | `v1.html` | Google Fonts · SIL Open Font License |
