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
| `motions/xstage_standard_kick.json` (x17 돌려차기) | `index.html`(첫 만남 연출, 시연 패널, 무빙 카드 「첫 만남」) | XSTAGE 「돌려차기 반복」(xstage.co 상품 5093). 라이선스 범위 **확인 필요** | 원본 `standard_Kick.fbx`(2026-11-24 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps). FBX는 저장소에 없음 |
| `motions/xstage_checking_watch.json` (x18 시계 보기) | `index.html`(내가 말이 없을 때 대화방에서, 시연 패널) | XSTAGE 「[standard] Waiting - Checking watch」. 라이선스 범위 **확인 필요** | 원본 `standard_Waiting.fbx`(2026-11-24 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps). FBX는 저장소에 없음 |
| `motions/xstage_wave_and_laugh.json` (m13 손 흔들기) | `index.html`(대화 몸짓, 다시 들어올 때 인사, 작별 인사 키워드, 시연 패널) | XSTAGE 「[standard] Wave and Laugh」. 라이선스 범위 **확인 필요** | 원본 `standard_Wave_and_Laugh.fbx`(2026-11-24 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps). FBX는 저장소에 없음 |
| `motions/xstage_shy_short_laugh.json` (x19 입 가리고 웃기) | `index.html`(선물 반응 g02, 시연 패널) | XSTAGE 「[standard] Shy - Short laugh」. 라이선스 범위 **확인 필요** | 원본 `standard_Shy_Short laugh.fbx`(2026-11-24 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps). 원본 배우가 옆을 보고 있어 재생 때 95° 돌림(`turn`). FBX는 저장소에 없음 |
| `motions/xstage_wave_hand.json` (x20 손 인사) | `onboarding.js`(입장권 「눌러서 입장」 인사, 시연 패널) | XSTAGE 「[standard] Wave Hand」. 라이선스 범위 **확인 필요** | 원본 `standard_Wave_Hand.fbx`(2026-11-24 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps). FBX는 저장소에 없음 |
| `motions/xstage_run_look_back.json` (x21 뒤돌아보며 달리기) | `index.html`(첫 만남 연출의 골목 프롤로그 첫 장면) | XSTAGE 「[standard] run_look back」. 라이선스 범위 **확인 필요** | 원본 `[standard] run_look back.fbx`(2026-11-24 기획자가 zip 으로 줌)를 `tools/fbx2motion.mjs`로 변환(뼈 20개, 30fps, 2.95초). 앞으로 골반 높이의 약 9배를 달려서 inPlace. FBX는 저장소에 없음(`_src/`) |
| `motions/xstage_walk.json` (x22 걷기) | `index.html`(크리스마스 에피소드 4단계 장면의 걸어서 화면 밖으로·안으로) | XSTAGE 「[standard] Walk」. 라이선스 범위 **확인 필요** | 원본 `standard_Walk.fbx`(2026-11-25 받음, `_src/` 에 이름 그대로)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps, 3.53초). 2.067~3.233초(한 걸음 주기)를 되풀이, 앞으로 가는 거리는 원본 골반 이동 그대로. FBX는 저장소에 없음. 53: 손가락 데이터가 없는 몸짓의 기본 손(`data/motions.json` `hands.relaxed`)도 이 모션의 손가락(2.6초)에서 뽑음 |
| `motions/xstage_wave_hands_upward.json` (x23 두 손 흔들기) | `onboarding.js`(입장권 「눌러서 입장」 인사, 시연 패널) | XSTAGE 「[standard] Wave Hands Upward」. 라이선스 범위 **확인 필요** | 원본 `standard_Wave_Hands_Upward.fbx`(2026-11-25 받음, `_src/` 에 이름 그대로)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps, 11.85초). FBX는 저장소에 없음 |
| `motions/xstage_arms_crossed_female.json` (m07 팔짱 끼기) | `index.html`(대화 몸짓, 답장을 기다릴 때, 시연 패널, 무빙 카드) | XSTAGE 「[standard] Idle_Arms Crossed_female」. 라이선스 범위 **확인 필요** | 원본 `standard_Idle_Arms_Crossed_female.fbx`(2026-11-25 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps, 20.41초). 25 의 남자 배우 파일 `xstage_idle_arms_crossed_male.json` 은 남겨 둠. FBX는 저장소에 없음 |
| `motions/xstage_brushing_hair_back.json` (c02 머리 쓸어 넘기기) | `index.html`(대화 몸짓, 시연 패널, 무빙 카드) | XSTAGE 「[standard] Shy_Brushing hair back」. 라이선스 범위 **확인 필요** | 원본 `standard_Shy_Brushing_hair_back.fbx`(2026-11-25 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps, 7.34초). 원본 배우가 옆을 보고 있어 재생 때 83° 돌림(`turn`). FBX는 저장소에 없음 |
| `motions/xstage_glancing_nervously.json` (50-2 부터 x26 구급상자 반응. 43~50-1 은 m06 허둥대기) | `index.html`(순간 선물 구급상자, gm01) | XSTAGE 「[standard] Shy _Glancing around nervously」. 라이선스 범위 **확인 필요** | 원본 `standard_Shy _Glancing_around_nervously.fbx`(2026-11-25 받음, 이름에 띄어쓰기 그대로)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps, 5.07초). 원본 배우가 옆을 보고 있어 90° 돌림(`turn`), 등·목·머리를 덜 숙이게(`damp`). FBX는 저장소에 없음 |
| `motions/xstage_think_chin.json` (x24 턱 괴고 생각하기) | `index.html`(답장을 기다릴 때, 시연 패널) | XSTAGE 「[standard] Standing_Think_Chin」. 라이선스 범위 **확인 필요** | 원본 `standard_Standing_Think_Chin.fbx`(2026-11-25 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps, 10초). FBX는 저장소에 없음 |
| `motions/xstage_take_selfie.json` (x25 셀카 자세 · m14 셀카 찍기) | `index.html`·`seoaphoto.js`(서아가 보내는 셀카의 자세, 선물 반응 g07 「같이 셀카 찍기」, 시연 패널) | XSTAGE 「[standard] Take Selfie」. 라이선스 범위 **확인 필요** | 원본 `standard_Take_Selfie.fbx`(2026-11-25 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps, 16.3초). FBX는 저장소에 없음 |
| `motions/xstage_cute_fluffy_tilt.json` (x32 귀여운 척 갸웃) | `index.html`·`cards.js`(카드 팩 SECRET g13, 시연 패널) | XSTAGE 「[standard] Cute Fluffy Tilt」. 라이선스 범위 **확인 필요** | 원본 `[standard]_Cute_Fluffy_Tilt.fbx`(2026-11-25 받음, `_src/` 에 이름 그대로)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps, 7.07초). FBX는 저장소에 없음 |
| `motions/xstage_catch_catch.json` (x33 시간 날 때마다 연습한 춤) | `index.html`·`cards.js`(카드 팩 SECRET g14, 시연 패널) | XSTAGE 「[standard] Catch Catch」. 라이선스 범위 **확인 필요** | 원본 `[standard]_Catch_Catch.fbx`(2026-11-25 받음, `_src/` 에 이름 그대로)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps, 21.92초). FBX는 저장소에 없음 |
| `motions/xstage_cute_thinking.json` (x34 고민하는 척) | `index.html`·`cards.js`(카드 팩 SECRET g15, 시연 패널) | XSTAGE 「[standard] Cute Thinking」. 라이선스 범위 **확인 필요** | 원본 `[standard]Cute_Thinking.fbx`(2026-11-25 받음, `_src/` 에 이름 그대로)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps, 7.13초). FBX는 저장소에 없음 |
| `motions/xstage_shake_head_up_down.json` (x27 칵테일 반응, x30 우산의 서기 자세) | `index.html`(순간 선물 칵테일, 컬렉션 「선물」 gm02) | XSTAGE 「[standard] Shake Head Up and Down」. 라이선스 범위 **확인 필요** | 원본 `[standard]_Shake_Head_Up_and_Down.fbx`(2026-11-25 받음, `_src/` 에 이름 그대로)를 `tools/fbx2motion.mjs`로 변환(45-1 방식, 손가락 포함, 12.06초). FBX는 저장소에 없음 |
| `motions/xstage_shy_touching_hands.json` (x28 따뜻한 수건 반응) | `index.html`(순간 선물 따뜻한 수건, gm03) | XSTAGE 「[standard] Shy Touching hands nervously」. 라이선스 범위 **확인 필요** | 원본 `[standard]_Shy_Touching_handsnervously.fbx`(2026-11-25 받음)를 같은 방식으로 변환(9.69초). FBX는 저장소에 없음 |
| `motions/xstage_shy_avoiding_eye_contact.json` (x29 꽃다발 반응) | `index.html`(순간 선물 꽃다발, gm04) | XSTAGE 「[standard] Shy Avoiding eye contact」. 라이선스 범위 **확인 필요** | 원본 `[standard]_Shy_Avoiding_eye_contact.fbx`(2026-11-25 받음)를 같은 방식으로 변환(9.01초). FBX는 저장소에 없음 |
| `motions/xstage_flustered_hand_gesture.json` (m06 허둥대기) | `index.html`(대화 몸짓 m06, 무빙 카드 17) | XSTAGE 「[standard] Flustered Hand Gesture」. 라이선스 범위 **확인 필요** | 원본 `[standard]_Flustered_Hand_Gesture.fbx`(2026-11-25 받음)를 같은 방식으로 변환(10.95초). FBX는 저장소에 없음 |
| `motions/xstage_gift_umbrella.json` (x30 우산 반응) | `index.html`(순간 선물 우산, gm05) | 위 XSTAGE 「[standard] Walk」(한 걸음)와 「[standard] Shake Head Up and Down」(서기 자세)를 이어 만든 것. 라이선스 범위 **확인 필요** | `tools/make_umbrella.mjs` 로 두 변환 결과(`xstage_walk.json`·`xstage_shake_head_up_down.json`)에서 만듦(3초). 새 원본 없음 |
| `motion.js` m01~m25, c01~c05 | 전체 | 직접 만든 코드 몸짓 | 외부 자산 아님 |

## 그림

| 파일 | 쓰는 곳 | 출처 |
| --- | --- | --- |
| `bg_seoa_street.jpg`, `bg_seoa_rooftop.jpg`, `bg_seoa_alley.jpg`, `bg_seoa_rain.jpg`, `bg_seoa_roof.jpg` | 서아 배경 | **확인 필요** |
| `pano_seoa_bar.webp`, `pano_seoa_street.webp` | 360도 배경 (30단계, 바 1층·네온 골목) | AI 이미지 생성 후 확대(Upscayl 4x)·수평선 보정. 그림체 참고 `bg_seoa_street.jpg`·`bg_seoa_rain.jpg`·`bg_seoa_bar.jpg`. 4096×2048 webp |
| `pano_seoa_room.webp`, `pano_seoa_rain.webp`, `pano_seoa_rooftop.webp`, `pano_seoa_castle.webp`, `pano_seoa_xmas.webp`, `pano_seoa_xmas_room.webp` | 360도 배경 (41단계, 바 2층·비 내리는 골목·바 옥상·드라큘라의 성·크리스마스 거리·서아의 자취방) | 기획자가 다운로드 폴더로 준 것(2026-11-25). 이미 4096×2048 webp 로 다듬어져 있어 그대로 씀. 만든 방법 **확인 필요**(30단계 두 장과 같은 방식으로 보임) |
| `bg_seoa_room.jpg`, `bg_seoa_xmas_room.jpg` | 바 2층·서아의 자취방 평평한 배경(41단계, 360도 그림을 불러오는 동안·실패 때, 홈 썸네일 등) | 위 `pano_seoa_room.webp`·`pano_seoa_xmas_room.webp` 의 가운데를 1600×900 으로 자른 것 |
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
| `motions/xstage_sexy_standing_still.json` (x35 섹시하게 서 있기) | `index.html`(대화 몸짓, 서아의 자취방에서만) | XSTAGE 「[standard] Sexy - Standing still」. 라이선스 범위 **확인 필요** | 원본 `standard_Sexy_-_Standing_still.fbx`(2026-11-25 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps). FBX는 저장소에 없음 |
| `motions/xstage_sexy_hesitating.json` (x36 섹시하게 머뭇거리기) | `index.html`(대화 몸짓, 서아의 자취방에서만) | XSTAGE 「[standard] Sexy - Hesitating」. 라이선스 범위 **확인 필요** | 원본 `standard_Sexy_-_Hesitating.fbx`(2026-11-25 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps). FBX는 저장소에 없음 |
| `motions/xstage_sexy_walking_show_neck.json` (x37 걸으며 목선 강조) | `index.html`(대화 몸짓, 어디서나: 어디 가자·걸어갈 때·장소가 바뀔 때) | XSTAGE 「[standard] Sexy - Walking Show Neck」. 라이선스 범위 **확인 필요** | 원본 `standard_Sexy_-_Walking_Show_Neck.fbx`(2026-11-25 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps). FBX는 저장소에 없음 |
| `motions/xstage_proud_looking_down.json` (m21 도도하게 내려다보기, 예전 원투 펀치) | `index.html`(대화 몸짓, 판정 protect 해금) | XSTAGE 「[standard] Proud - Looking down」. 라이선스 범위 **확인 필요** | 원본 `standard_Proud_-_Looking_down.fbx`(2026-11-26 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps). FBX는 저장소에 없음 |
| `motions/xstage_one_hand_on_hip.json` (m20 도발하기) | `index.html`(대화 몸짓, 1단계) | XSTAGE 「[standard] Standing weight to one leg with One Hands on Hips」. 라이선스 범위 **확인 필요** | 원본 `standard_Standing_weight_to_one_leg_with_One_Hands_on_Hips.fbx`(2026-11-26 받음)를 같은 방법으로 변환. FBX는 저장소에 없음 |
| `motions/pose_pass_finger_heart.json` (p01 손가락 하트) | `index.html`·`pose.js`(촬영 전용 포즈, 78) | XSTAGE 「[standard] Pass Finger Heart」. 라이선스 범위 **확인 필요** | 원본 `standard_Pass_Finger_Heart.fbx`(2026-11-26 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps). FBX는 저장소에 없음 |
| `motions/pose_cute_hand_heart.json` (p02 볼 옆 하트) | `index.html`·`pose.js`(촬영 전용 포즈, 78) | XSTAGE 「[standard] Cute - Hand heart」. 라이선스 범위 **확인 필요** | 원본 `standard_Cute_-_Hand_heart.fbx`(2026-11-26 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps). FBX는 저장소에 없음 |
| `motions/pose_lovely_heart_2.json` (p03 온몸으로 하트) | `index.html`·`pose.js`(촬영 전용 포즈, 78) | XSTAGE 「[standard] Lovely - Heart 2」. 라이선스 범위 **확인 필요** | 원본 `standard_Lovely_-_Heart_2.fbx`(2026-11-26 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps). FBX는 저장소에 없음 |
| `motions/pose_v_sign_pose.json` (p04 연달아 브이) | `index.html`·`pose.js`(촬영 전용 포즈, 78) | XSTAGE 「[standard] V Sign Pose」. 라이선스 범위 **확인 필요** | 원본 `standard_V_Sign_Pose.fbx`(2026-11-26 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps). FBX는 저장소에 없음 |
| `motions/pose_body_pose_53.json` (p05) | `index.html`·`pose.js`(촬영 전용 포즈, 78) | XSTAGE 「[standard] Body pose 53」. 라이선스 범위 **확인 필요** | 원본 `standard_Body_pose_53.fbx`(2026-11-26 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps). 한 장짜리 포즈라 끝 키를 뽑아 5초 두 장으로. FBX는 저장소에 없음 |
| `motions/pose_body_pose_54.json` (p06) | `index.html`·`pose.js`(촬영 전용 포즈, 78) | XSTAGE 「[standard] Body pose 54」. 라이선스 범위 **확인 필요** | 원본 `standard_Body_pose_54.fbx`(2026-11-26 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps). 한 장짜리 포즈라 끝 키를 뽑아 5초 두 장으로. FBX는 저장소에 없음 |
| `motions/pose_body_pose_68.json` (p07) | `index.html`·`pose.js`(촬영 전용 포즈, 78) | XSTAGE 「[standard] Body pose 68」. 라이선스 범위 **확인 필요** | 원본 `standard_Body_pose_68.fbx`(2026-11-26 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps). 한 장짜리 포즈라 끝 키를 뽑아 5초 두 장으로. FBX는 저장소에 없음 |
| `motions/pose_body_pose_71.json` (p08) | `index.html`·`pose.js`(촬영 전용 포즈, 78) | XSTAGE 「[standard] Body pose 71」. 라이선스 범위 **확인 필요** | 원본 `standard_Body_pose_71.fbx`(2026-11-26 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps). 한 장짜리 포즈라 끝 키를 뽑아 5초 두 장으로. FBX는 저장소에 없음 |
| `motions/pose_body_pose_74.json` (p09) | `index.html`·`pose.js`(촬영 전용 포즈, 78) | XSTAGE 「[standard] Body pose 74」. 라이선스 범위 **확인 필요** | 원본 `standard_Body_pose_74.fbx`(2026-11-26 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps). 한 장짜리 포즈라 끝 키를 뽑아 5초 두 장으로. FBX는 저장소에 없음 |
| `motions/pose_body_pose_78.json` (p10) | `index.html`·`pose.js`(촬영 전용 포즈, 78) | XSTAGE 「[standard] Body pose 78」. 라이선스 범위 **확인 필요** | 원본 `standard_Body_pose_78.fbx`(2026-11-26 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps). 한 장짜리 포즈라 끝 키를 뽑아 5초 두 장으로. FBX는 저장소에 없음 |
| `motions/pose_body_pose_82.json` (p11) | `index.html`·`pose.js`(촬영 전용 포즈, 78) | XSTAGE 「[standard] Body pose 82」. 라이선스 범위 **확인 필요** | 원본 `standard_Body_pose_82.fbx`(2026-11-26 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps). 한 장짜리 포즈라 끝 키를 뽑아 5초 두 장으로. FBX는 저장소에 없음 |
| `motions/pose_body_pose_90.json` (p12) | `index.html`·`pose.js`(촬영 전용 포즈, 78) | XSTAGE 「[standard] Body pose 90」. 라이선스 범위 **확인 필요** | 원본 `standard_Body_pose_90.fbx`(2026-11-26 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps). 한 장짜리 포즈라 끝 키를 뽑아 5초 두 장으로. FBX는 저장소에 없음 |
| `motions/pose_body_pose_94.json` (p13) | `index.html`·`pose.js`(촬영 전용 포즈, 78) | XSTAGE 「[standard] Body pose 94」. 라이선스 범위 **확인 필요** | 원본 `standard_Body_pose_94.fbx`(2026-11-26 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps). 한 장짜리 포즈라 끝 키를 뽑아 5초 두 장으로. FBX는 저장소에 없음 |
| `motions/pose_body_pose_95.json` (p14) | `index.html`·`pose.js`(촬영 전용 포즈, 78) | XSTAGE 「[standard] Body pose 95」. 라이선스 범위 **확인 필요** | 원본 `standard_Body_pose_95.fbx`(2026-11-26 받음)를 `tools/fbx2motion.mjs`로 변환(뼈 20개 + 손가락 30개, 30fps). 한 장짜리 포즈라 끝 키를 뽑아 5초 두 장으로. FBX는 저장소에 없음 |
| `motions/xstage_point_finger_up_down.json` (x40 손가락으로 가리키기) · `xstage_ridiculous_raise_hands.json` (x41 어이없어 양손 들기) · `xstage_standing_look_side.json` (x42 옆을 바라보기) · `xstage_adjusting_hair_head.json` (x43 머리 가볍게 만지기) · `xstage_backstep_tease.json` (x44 장난스럽게 물러서기) · `xstage_elbow_nudge.json` (x45 팔꿈치로 툭 치기) · `xstage_head_tilt_raised_hand.json` (x46 고개 갸웃하며 손 올리기) · `xstage_cute_jealousy2.json` (x47 질투하기) · `xstage_lovely_embarrassing2.json` (x48 부끄러워 얼굴 가리기) | `index.html`(84-1: 검수 전용 `only "preview"` — 시연 패널 「신규 모션 검수」에서만 재생, 대화·함께하기·카드에 안 나옴) | XSTAGE 「[standard] Point, Move Finger Up-Down」「[standard] Ridiculous_Raising both hands」「[standard] Standing - Look Side」「[standard] Adjusting Hair or Head」「[standard] Backstep Tease」「[standard] Elbow Nudge」「[standard] Head Tilt with Raised Hand」「[standard] Cute - Jealousy2」「[standard] Lovely - Embarrassing 2」(기획자가 2026-11-26 받아 `Downloads/new_motion_data` 로 줌). 라이선스 범위 **확인 필요** | 원본 FBX 9개를 `_src/xstage_84-1/`(gitignore)에 이름 그대로 두고 `tools/fbx2motion.mjs` 로 변환(뼈 20개 + 손가락 30개, 30fps). FBX는 저장소에 없음 |
| `motions/xstage_natural_laugh.json` (m01 웃음, 84-1 부터) | `index.html`(대화 몸짓 m01·키워드·첫 만남/인트로/엔딩/에피소드 연출의 m01, 함께하기 장난치기, 무빙 카드 m01) | **XSTAGE AI 생성 모션** 「smile_haveto_fix」(기획자가 XSTAGE AI 로 만들어 2026-11-26 줌). AI 생성 리소스의 사용·배포 라이선스 범위 **확인 필요**(허가됐다고 판단하지 않음) | 원본 `smile_haveto_fix.fbx`(`_src/xstage_84-1/`)를 `tools/fbx2motion.mjs` 로 변환한 뒤 `tools/xs_upright.mjs` 로 상체·목·머리의 앞뒤 기울기만 줄임(변환 원본 JSON 은 `_src/xstage_84-1/natural_laugh_raw.json`). FBX는 저장소에 없음 |
| (보류) `[standard] Lovely - Receive candy 1.fbx` | 아직 안 씀(86 반지 반응 x31 예정) | XSTAGE 「[standard] Lovely - Receive candy 1」. 라이선스 범위 **확인 필요** | 84-1 에서는 원본만 `_src/xstage_84-1/` 에 복사해 둠. 변환·등록하지 않음 |
| `icons/gift2_*.png` 9개 (사탕·초콜릿·물 한 잔·반창고·손난로·구급상자·칵테일·따뜻한 수건·꽃다발) | `index.html`(선물 창, 선물 그림이 떠오르는 연출) | 팀 디자인 시안(2026-11-25 받은 선물 창 화면)에서 그림만 잘라 배경을 투명하게 만듦 | 원본 시안 이미지는 저장소에 없음 |
| `icons/gift2_*.png` 11개 (93: 사탕·초콜릿·물 한 잔·반창고·손난로·구급상자·칵테일·따뜻한 수건 교체, 바 여분 열쇠 `gift2_key`·우산 `gift2_umbrella`·반지 `gift2_ring` 추가) | `index.html`(선물 창, 순간 선물 칸, 선물 그림이 떠오르는 연출) | 기획자 제공, ChatGPT 생성 이미지 | 512×512 RGBA PNG, 투명 배경, 중앙 정렬(기획자가 생성 이미지 2장에서 아이콘을 나누고 투명도 정리). 받은 그대로 넣음(크기·색 바꾸지 않음). 위 56단계 9개는 이걸로 바뀜 |
| Noto Sans KR | `v1.html` | Google Fonts · SIL Open Font License |
| ~~Fredoka SemiBold(600)~~ (59단계에서 안 씀) | 예전 로고 「moti」 그림 | — | 59: `assets/logo_moti.svg` 를 기획자 시안 로고로 바꿈 |
| 기획자 시안 로고 「moti」(2026-11-25 받은 그림) | `assets/logo_moti.svg` (시작 화면, 헤더, 카드 뒷면, 카드 공유 그림) | 팀 자체 시안 | 그림의 윤곽을 따라 SVG 경로로 그림(59단계). 원본 그림은 저장소에 없음 |
| Great Vibes Regular | 무빙 카드 뒷면(잠긴 칸) 가운데 영문 이름 그림 `assets/name_seoa.svg` (38단계). 글꼴 파일은 앱에서 불러오지 않고 저장소에도 없음(`_src/GreatVibes-Regular.ttf`), `tools/logo2svg.mjs` 로 「Seoa」 글자 모양만 경로로 바꿈 | [Google Fonts · Great Vibes](https://fonts.google.com/specimen/Great+Vibes) (TTF, fonts.gstatic.com, 2026-11-25 받음, 글꼴 안 저작권 「Copyright 2010 The Great Vibes Pro Project Authors」, [github.com/googlefonts/great-vibes](https://github.com/googlefonts/great-vibes)) · SIL Open Font License 1.1 |
| opentype.js | `tools/logo2svg.mjs`(개발 도구, 앱에 안 들어감) | npm `opentype.js` · MIT |
| 아래 탭바 아이콘(홈·대화·앨범·마이), 마이 페이지 PLUS 혜택 아이콘(무한·기억·말풍선·다이아·사진) | `index.html` (12단계) | [Tabler Icons](https://tabler.io/icons) (MIT 라이선스) 모양을 옮겨 코드 안 SVG 로 넣음. 선 굵기 1.8 |
| 다이아 재화 아이콘 | `index.html` 헤더·마이 페이지 (12단계) | 코드 안 SVG 로 직접 그림(임시) |
