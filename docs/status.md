# 진행 현황

기준: 2026-11-23, `main` 커밋 `7121781`

## 지금 main에 있는 화면

| 파일 | 내용 |
| --- | --- |
| `index.html` | **현재 앱.** 스타일과 스크립트가 파일 안에 들어 있다 (`app.js`·`style.css`를 쓰지 않음). `motion.js`만 불러 쓴다. |
| `v1.html` | 이전 앱. `app.js` + `style.css` + `motion.js`. 마이 탭 맨 아래 「이전 버전(v1) 보기」로 들어간다. |
| `xstage.html` | XSTAGE 모션 테스트 페이지. 구매한 모션(Lovely – Embarrassing 3)을 서아 모델(`seoa.glb`)에 옮겨 재생. |

## 지금 main(`index.html`)의 기능

- **탭 4개:** 홈 · 대화 · 추억 앨범 · 마이
- **홈:** 캐릭터 카드 5명(서도윤·한지후·이준·류하람·윤서아), 검색·정렬·태그 필터, 랭킹, 특별 에피소드 2개(무료 1, 💎 150 1)
- **대화:** 메시지 목록(안 읽은 수, 다른 캐릭터가 먼저 말 거는 알림) → 대화방
  - 서아 방만 3D 무대(VRoid 모델 `seoa_vroid.glb`), 표정(VRoid `Fcl_…` 블렌드셰이프), 눈 깜빡임, 말할 때 입 움직임
  - 나레이션(`*…*`)은 말풍선 밖 지문, 대사는 줄마다 말풍선
  - 빠른 답장 버튼 6개
  - 답장 순서: Claude 미리보기(`window.claude`) → 배포 서버 `/chat`(예전 API, `reply` 필드) → 코드에 써 둔 예시 대사
  - 서아 상태(평소·지침·삐짐·생일)와 상태별 표정
- **선물:** 4종(커피·라멘·꽃다발·반지) × 서아 상태 4가지 = 반응 16개. 처음 준 선물은 해당 몸짓을 「배운 모습」으로 대화에 추가
- **추억 앨범:** 선물 반응 16칸. 카드를 누르면 그때 장소에서 다시 재생(이때만 3D 위 자막)
- **관계:** 대화 횟수로 5단계(낯선 손님·단골·작전 파트너·비밀을 아는 사람·유일한 사람). v2의 6단계와 다름
- **마이:** 관계 단계, PLUS 구독(시연), 💎 충전(시연, 1개 70원)
- **시연 설정:** 서아 상태 강제, 생일, 장소(2곳), 💎 충전, 초기화
- **XSTAGE 모션:** `m24 부끄러워하기`만 XSTAGE 데이터(`motions/xstage_embarrassing3.json`)로 재생, 나머지는 `motion.js`의 코드 몸짓

## `step/2-v2-newapp` 브랜치 (2단계, main 병합 전)

보고서: [reports/2-대화v2-새앱.md](reports/2-대화v2-새앱.md)

- **서버 연결:** `data/config.json` `serverVersion`(기본 1, `?server=2`로 덮어쓰기), `apiUrl`(`?api=`로 덮어쓰기). 응답은 예전(`reply`)·v2(`action`·`dialogue`…) 두 형식 모두 처리
- **매 답장 몸짓:** `motion_id` → 감정에 맞는 해금된 몸짓 → 대기 몸짓(m25). 같은 몸짓 연속 금지. 서아 전용 c01~c05, m25 추가(`motion.js`)
- **표정:** 감정→표정 `data/emotion_face.json` (평온·도발·진심·질투·당황 추가)
- **관계:** 6단계(신경전·단골·끌림·고백 직전·엇갈림·연인). 서버 v2는 `/judge` 판정, v1·서버 없음은 대화 횟수(0·4·9·15·22·30)
- **해금:** `data/seoa_story.json` 해금 지도대로. 3D 확대 + 무릎 위(춤은 전신)로 처음 재생 + 토스트 + 기록
- **추억 앨범:** 「처음 본 모습」(15칸) / 「선물 반응」(16칸) 두 칸
- **인트로:** 서아 방에 처음 들어갈 때만, 서버 OPENING 원고(`data/seoa_intro.json`)를 문단별로 + m07 → m01 → m11
- **장소:** 5곳(바 1층·바 2층·네온 골목·비 내리는 골목·바 옥상), 서버 `location`으로 전환
- **서버 깨우기 (2-1):** 앱을 열 때 배포 서버에 가벼운 요청. 깨어난 게 확인되기 전 첫 답장은 45초까지 「서아가 바에 들어오는 중…」을 보이며 기다림 (`data/config.json`)
- **앨범 다시 보기 (2-1·2-2):** 그때 장소는 다시 보기 동안만, 끝나면 대화의 원래 장소로. 카메라는 무릎 위, 대사 자막은 3D 아래 칸
- **카메라·3D 확대 (2-2):** 구도 3가지(상반신·무릎 위·전신) `data/config.json` `camera`. 대화 중 몸짓이 나오면 3D 칸이 화면 높이 64%로 커지고 무릎 위(춤은 전신), 끝나고 1초 뒤 복귀. 해금 연출도 같은 방식
- **아이폰 대응 (2-2):** 입력창 16px(자동 확대 방지), 가로 넘침 제거, 토스트를 안전 영역만큼 아래로
- **이미지 필요:** 바 '라스트 오더' 1층(`bg_seoa_bar.jpg`), 2층(`bg_seoa_room.jpg`) — 지금은 `bg_seoa_alley.jpg`, `bg_seoa_roof.jpg`로 임시 대체
- **앨범 힌트:** 「처음 본 모습」 잠긴 칸 힌트 15개 들어감 (원고 `docs/drafts/2-1-앨범힌트.md`, 2-1단계)

## 열려 있는 브랜치·PR

| 저장소 | 브랜치 | PR | 상태 |
| --- | --- | --- | --- |
| Bii0411/Moti | `feat/motion-chat-v2` | [Bii0411/Moti#1](https://github.com/Bii0411/Moti/pull/1) 서아 대화 v2 | 열림. main과 `app.js`·`style.css` 충돌. 자세한 차이는 [v2-diff.md](v2-diff.md) |
| Bii0411/Moti | `step/2-v2-newapp` | 없음 | 2단계 작업. 확인 후 main 병합 예정 |
| ddododo-lang/seoa-backand | `feat/motion-chat-v2` | [ddododo-lang/seoa-backand#1](https://github.com/ddododo-lang/seoa-backand/pull/1) 상태 없는 /chat·/judge와 프롬프트 v2 | 열림 |

## 서버 배포 상태 (확인 가능한 범위)

- 주소: `https://seoa-backand.onrender.com` — 응답함.
- 공개된 API 목록(`/openapi.json`): `/chat`, `/sessions`, `/sessions/{sid}`, `/sessions/{sid}/chat`. **`/judge` 가 없다** → v2 서버는 아직 배포되지 않은 것으로 보인다.
- 주의: v2 서버가 배포되면 `/chat` 응답이 `reply` 대신 `dialogue`로 바뀐다. main의 `index.html`은 `reply`가 없으면 서버 응답을 버리고 예시 대사로 대답하므로, **서버 v2 배포 전에 `step/2-v2-newapp`을 main에 병합해야 한다** (이 브랜치는 두 형식을 모두 읽는다). 배포 뒤 `data/config.json`의 `serverVersion`을 2로.
- 2026-11-23 확인: 배포 서버 첫 요청이 25초 안에 답하지 않음(Render 깨어나는 시간). 두 번째부터 정상.
- 앱: GitHub Pages `https://bii0411.github.io/Moti/` 응답 200.

## 남은 일

- `step/2-v2-newapp` 확인 후 main 병합, 서버 v2 배포, `serverVersion` 2로
- 아이폰 사파리 확인: 새 표정 5개, 앨범 말줄임, 3D 확대 애니메이션, 카메라 전환, 가로 넘침, 토스트 위치
- **이미지 필요:** 바 '라스트 오더' 1층·2층 전용 배경 (지금은 임시 이미지)
- 코드 안 콘텐츠(선물 반응·가격·예시 대사·다른 캐릭터 대사 등)를 JSON으로 분리 (이번엔 관계·해금·장소·인트로·표정·몸짓만 분리)
- 외부 자산 출처 확인 ([CREDITS.md](CREDITS.md)의 "확인 필요")
- 기획 결정 전: 대화 화면 오버레이, 관계 진행 연출, 퀘스트와 힌트 ([plan.md](plan.md))
