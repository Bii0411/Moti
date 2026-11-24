# 21 · XSTAGE 모션 16개 연결 (+ 답장 차례차례, 답장 대기 시간)

## 바뀐 파일

| 파일 | 내용 |
| --- | --- |
| `tools/fbx2motion.mjs` | 새로 만듦. XSTAGE FBX → 모션 JSON 변환기 (뼈 20개, 30fps, 0초 = T자 기준 자세). `npm i three@0.160.0` 후 `node tools/fbx2motion.mjs 입력.fbx 출력.json` |
| `motions/xstage_*.json` | 16개 추가 (원본 `XSTAGE-Motion-0.zip`, FBX는 저장소에 없음) |
| `data/motions.json` | `xstage`(몸짓 번호 → 모션 파일·재생 구간·제자리), `xstageReserve`(따로 둔 모션), 새 몸짓 x01·x02·x09·x11·x15·x16 |
| `data/motion_keywords.json` | 놀라기에 「놀란」「놀랐」, 툭 건네주기에 「건넨」 추가 (「놀란다」「건넨다」가 안 걸리던 것) |
| `index.html` | XSTAGE 모션을 여러 개 불러오기(3D 준비 뒤 하나씩 미리 받기, 아직이면 받는 대로 처음부터), `inPlace`, 시연 패널 몸짓 목록에 새 몸짓 표시. 답장 지문·대사를 조각별로 차례차례 보여 주기 |
| `data/config.json` | `replyReveal`(조각 간격), `replyTimeoutMs` 8초 → 30초 |
| `docs/CREDITS.md` | XSTAGE 모션 16개 출처 |

## 연결

| 몸짓 | 모션 파일 | 재생 구간 |
| --- | --- | --- |
| m07 팔짱 끼기 | Idle_Arms Crossed_male | 3.5~10초 |
| m19 자신감 있게 설득하기 | Proud - Persuasion | 0~7초 |
| m09 툭 건네주기 | Blunt - Handing out candy 1 | 전체 |
| m03 놀라기 | Shy - Surprise1 | 전체 |
| m04 한숨 쉬기 | Hold Forehead | 3.5~10초 |
| m05 시선 피하기 | Rub Neck_One Hand | 2~9초 |

- 새 몸짓(아직 단계·선물·키워드에 안 붙음, 시연 패널 `?debug=1` 에서만 재생): x01 짜증 내기, x02 허리 숙이기, x09 붙잡기, x11 손 들어 막기, x15 수줍게 걷기(제자리), x16 몸 낮춰 경계하기
- 따로 둠(`xstageReserve`, 감정 태그 없음, 불러오지 않음): x04 몸 돌려 피하기, x07 구르며 낙법, x08 으스대며 도발하기, x12 돌려차기

## 캡처

- 390px 대화 화면에서 m07 팔짱 재생 확인 (헤드리스 크롬). 모션 17개 미리보기 페이지로 기획자 확인

## 제가 정한 것

- 연결할 기존 몸짓은 이름이 가장 가까운 것으로 고름(위 표). 도발하기(m20)는 Taunt5 를 따로 빼기로 해서 연결 안 함
- 긴 모션(11~21초)은 동작이 가장 뚜렷한 구간만 6~7초로 자름
- 연결한 몸짓의 키워드 규칙은 그대로. 단 동사 활용형이 안 걸리던 두 곳만 단어 추가
- m19 는 키워드가 없어 「도발을 받아치면」 해금 연출에서만 나옴(전과 같음)
- 선물 몸짓 g06(툭 받아 챙기기)은 m09 를 쓰므로 이제 사탕 건네기 모션으로 재생됨

## 확인 필요

- 아이폰 사파리에서 XSTAGE 모션 재생·미리 받기(약 2MB)가 깨지지 않는지 — 아직 못 봄
- XSTAGE 모션 라이선스 범위
