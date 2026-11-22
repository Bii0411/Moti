# main과 feat/motion-chat-v2 차이

- 갈라진 지점: `1c368d1` 서아: 바로 전 디자인으로 되돌림
- v2 쪽 커밋: 5개 (`d78a4f7` · `715b8c3` · `ebdd5b4` · `2c83e5d`(병합) · `e63f7f3`)
- main 쪽 커밋: 10개 (아래 표)

## 가장 중요한 차이

v2는 **예전 앱(`app.js` + `style.css`)** 을 고쳤다. 그런데 갈라진 뒤 main은 `f63d464`에서 **새 앱을 `index.html` 한 파일**(스타일·스크립트 내장)로 다시 만들었고, 예전 앱은 `v1.html`로 옮겼다.

그래서 v2를 그대로 병합하면:
- `app.js`, `style.css` 에서 git 충돌이 난다 (main의 나레이션 분리 수정과 같은 줄).
- 충돌을 풀어도 v2 기능은 **`v1.html`에만** 들어가고, 지금 앱(`index.html`)에는 아무것도 들어가지 않는다.
- `motion.js`, `README.md` 는 충돌 없이 들어간다.

→ v2는 병합하지 않고, 기능 단위로 새 `index.html`에 다시 만드는 것을 추천한다.

## v2가 갈라진 뒤 main에 들어온 커밋

| 커밋 | 내용 | 바뀐 파일 | 바뀐 기능 |
| --- | --- | --- | --- |
| `709d2a2` | 채팅: 대사는 줄마다 별도 말풍선, 나레이션은 말풍선 밖으로 | `app.js`, `style.css` | v1 대화 표시 (`msgHtml`, `.mnarr`) |
| `f63d464` | 새 구조: 홈·대화(메시지 목록)·추억 앨범·마이, 서아 선물 반응과 표정 연동 | `index.html`, `v1.html` | 새 앱 전체. 선물·앨범·표정·관계 5단계·시연 설정. 예전 앱은 `v1.html`로 |
| `c54bfc9` | 대화: 나레이션(`*…*`)은 지문으로, 대사만 말풍선과 3D 위 말풍선에 | `index.html` | 새 앱 대화 표시, `speechOnly` |
| `b0ecfd3` | 선물 아이콘을 캐릭터 그림체로, 대화창 넓히고 서아를 상반신으로 크게 | `index.html`, `icons/*.svg` | 선물 아이콘, 무대 크기·카메라 |
| `040b5ed` | 선물 아이콘을 받은 디자인 이미지로 교체 | `icons/*.png` | 선물 아이콘 png |
| `71d2072` | 💎 1개 70원, 서아가 골반 아래까지 보이게 카메라 조정 | `index.html` | 가격 문구, 카메라 |
| `09c19e7` | 선물 버튼을 새 선물 상자 아이콘으로 | `index.html`, `icons/gift_button.png` | 선물 버튼 |
| `95de746` | 3D 화면 자막은 추억 앨범 다시 보기에서만 (대화 중엔 채팅창으로) | `index.html` | 3D 위 말풍선 조건 |
| `b66bedb` | 홈 카드 배지 '강한 맛' → '19+' | `app.js`, `index.html` | 배지 문구 |
| `7121781` | 대화 답장 아래 노란 안내 글씨(반응·모션·표정 태그) 숨김 | `index.html` | 대화 태그 숨김 |

## 특히 확인한 것

| 항목 | main (`index.html`) | v2 (`app.js`) | 정리 |
| --- | --- | --- | --- |
| 대화 표시 (나레이션·대사) | 답장 한 덩어리 텍스트를 `msgParts`로 쪼갬: `*…*` → 말풍선 밖 지문(`.mnarr`), 나머지 → 줄마다 말풍선 | 서버가 `action`·`dialogue`를 나눠 보냄: `action` → 말풍선 위 기울임 한 줄(`.actn`), `dialogue` → 말풍선. 인트로·예전 기록은 `msgParts` | 둘 다 "지문은 밖, 대사는 말풍선". main은 텍스트를 쪼개고, v2는 필드로 받는다. 새 앱에서 `action`을 `.mnarr` 지문으로 그리면 모양이 하나로 맞는다 |
| 카메라 값 | `71d2072`에서 조정: 세로 화면 `position(0,1.25,2.9)`, `lookAt(0,1.12,0)` / 가로 `(0,1.26,2.3)`, `lookAt(0,1.19,0)`, 화각 30 | 바꾸지 않음 (v1 `J3D` 값 그대로) | main 값 유지. v2에서 가져올 것 없음 |
| 서아 인트로 | 짧은 한 줄(`CH` 안 `intro`). 인트로 화면 없이 대화방 첫 메시지로 들어감 | 서버 `OPENING`과 같은 긴 원고. 인트로 화면에서 문단이 하나씩 나오며 몸짓 재생(m07 → 「웃는다」 m01 → 「내민다」 m11) | 원고는 서버 `OPENING`이 원본 → JSON으로 옮겨 새 앱에서 다시 만듦. 인트로 연출 위치(별도 화면 or 대화방 안)는 기획 결정 필요 |
| 감정·표정 연동 | 있음. `FACE`(VRoid 표정 조합) + `EMO2FACE`(감정 글자 → 표정) | 감정을 `emo`로 저장만 하고 표정에 쓰지 않음 (v1 모델엔 표정 연동 없음) | main 방식 유지. 서버 v2 감정 12개 중 `도발·진심·질투·당황·평온`은 `EMO2FACE`에 없어 기본(`soft`)이 됨 → 대응표를 JSON으로 만들어 채워야 함 |
| 판정 대기 로직 | 없음. 관계는 대화 횟수(`bondUp`)로 오름 | 답장을 보여 준 뒤 `/judge`를 뒤에서 호출(`runJudge`, `U.judgeP`). 판정 중에 보내면 끝날 때까지 기다렸다 보냄. 6턴마다 요약 요청 | 다시 만듦. 새 앱의 `send()`·`busy`에 맞춰 넣음 |
| 해금 연출 | 없음. 몸짓은 선물로 「배운 모습」이 됨(`S.learned`) | `UNLOCK.seoa`(해금 지도) → `unlockShow`: 관계 메시지 → 새 몸짓 재생 → 토스트 → `S.firsts`에 그때 대사와 기록 | 다시 만듦. 해금 지도는 JSON으로. 기록은 추억 앨범과 합칠지 기획 결정 필요 |

## 기능별 처리 표

충돌 여부: **git** = 그대로 병합하면 git 충돌, **구조** = git 충돌은 없지만 새 앱 구조와 맞지 않음, **없음** = 그대로 들어감.

| 기능 | 관련 파일·함수 (v2) | main과 충돌 | 추천 처리 |
| --- | --- | --- | --- |
| 서아 전용 몸짓 c01~c05, 대기 몸짓 m25 | `motion.js` `RIG.M.c01~c05, m25` | 없음 (main은 `motion.js`를 안 바꿈) | **가져올 것.** `motion.js`만 그대로 가져옴. 새 앱 `MNAME`에 이름 추가는 다시 만들 때 |
| 몸짓 메타(c01~c05, m25 이름·감정) | `app.js` `MX`, `mBy` | git | **다시 만들 것.** 몸짓 목록을 JSON으로 빼고 새 앱의 `BASE`/`SIGN`/`MNAME`을 대체 |
| 서버 연결 v2 (`/chat` 새 형식) | `app.js` `API_DEFAULT`, `API_URL`(`?api=`), `post`, `askAI`, `histOf`, `turnText` | git + 구조 | **다시 만들 것.** 새 앱 `askServer`를 v2 요청·응답 형식으로 교체. `?api=` 주소 바꾸기는 그대로 살림 |
| 이야기 상태 (클라이언트 보관) | `app.js` `STORY0`, `story()`, `S.story`, `STAGE_NAMES`, `STAGE_AT` | git + 구조 | **다시 만들 것.** 초기값·단계 이름·기준값은 JSON으로. 새 앱의 관계 5단계(`BOND`)는 v2 6단계로 바꿈 |
| 판정 호출과 대기 | `app.js` `runJudge`, `send()` 첫 줄 `U.judgeP` 대기 | git + 구조 | **다시 만들 것** |
| 몸짓 해금 지도 | `app.js` `UNLOCK.seoa`, `unlockGrant`, `unlockedIds`, `motionList` | git + 구조 | **다시 만들 것.** 지도는 서버 `yoon_seoa_prompt.md` 표를 원본으로 JSON화 |
| 해금 연출과 기록 | `app.js` `unlockShow`, `S.firsts` | git + 구조 | **다시 만들 것.** 새 앱 `Stage.play` + `toast`로 |
| 매 답장 몸짓 재생, 연속 같은 몸짓 금지 | `app.js` `send()` 서버 분기, `S.lastMotion` | git + 구조 | **다시 만들 것.** 새 앱은 이미 매 답장 `react()`로 몸짓을 재생하므로 `motion_id`와 직전 몸짓 제외만 붙임 |
| 답장 기다리는 동안 m25 | `app.js` `send()` `J3D.play(mBy("m25"))` | git + 구조 | **다시 만들 것** (`Stage.play("m25")`) |
| 장소 5곳 (서버 `location`과 1:1) | `app.js` `SCENES.seoa`, `sceneOf` | git + 구조 | **다시 만들 것.** 새 앱 `SCENES`(2곳)를 5곳 JSON으로. 바 1·2층은 임시 이미지 |
| 행동 한 줄 표시 | `app.js` `renderChat` `.actn`, `style.css .actn` | git | **다시 만들 것.** 새 앱의 `.mnarr` 지문 모양으로 그림 |
| 서아 인트로 원고 | `app.js` `CH` seoa `intro` | git | **다시 만들 것.** 원고를 JSON으로(원본은 서버 `OPENING`) |
| 인트로 문단 연출 | `app.js` `INTRO_SEQ`, `introRun`, `intro`, `style.css .intro .itx` | git + 구조 | **다시 만들 것.** 순서표는 JSON으로 |
| `msgParts` 줄바꿈·따옴표 처리 | `app.js` `msgParts` | git | **버릴 것.** 새 앱 `msgParts`가 이미 줄마다 나누고 따옴표를 벗김 |
| 다시 그려도 쓰던 글 유지 | `app.js` `renderChat` `keep`/`foc` | git | **버릴 것.** 새 앱은 입력창을 다시 그리지 않음 |
| 3지선다 끄기 | `app.js` `send()` 주석 | git | **버릴 것.** 새 앱에 3지선다가 없음 |
| 릴스 단계 이름 (`bondName`) | `app.js` `savereel` | git | **버릴 것.** 새 앱에 릴스 없음 |
| 새 회차 시작 시 이야기 상태 초기화 | `app.js` `restart` | git | **다시 만들 것.** 새 앱 시연 설정 「처음부터 다시」에 이야기 상태 초기화 포함 |
| 서버 없을 때 예시 대사 | `app.js` `send()` 아래쪽 | git | **버릴 것** (새 앱 `localReply`가 있음). 대사는 나중에 JSON으로 |
| README (v2 설명·시험 방법) | `README.md` | 없음 | **다시 만들 것.** 새 구조 기준으로 고쳐 씀 (`?api=`, `LLM_PROVIDER=fake` 시험법은 살림) |
