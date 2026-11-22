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

## 열려 있는 브랜치·PR

| 저장소 | 브랜치 | PR | 상태 |
| --- | --- | --- | --- |
| Bii0411/Moti | `feat/motion-chat-v2` | [Bii0411/Moti#1](https://github.com/Bii0411/Moti/pull/1) 서아 대화 v2 | 열림. main과 `app.js`·`style.css` 충돌. 자세한 차이는 [v2-diff.md](v2-diff.md) |
| ddododo-lang/seoa-backand | `feat/motion-chat-v2` | [ddododo-lang/seoa-backand#1](https://github.com/ddododo-lang/seoa-backand/pull/1) 상태 없는 /chat·/judge와 프롬프트 v2 | 열림 |

## 서버 배포 상태 (확인 가능한 범위)

- 주소: `https://seoa-backand.onrender.com` — 응답함.
- 공개된 API 목록(`/openapi.json`): `/chat`, `/sessions`, `/sessions/{sid}`, `/sessions/{sid}/chat`. **`/judge` 가 없다** → v2 서버는 아직 배포되지 않은 것으로 보인다.
- 주의: v2 서버가 배포되면 `/chat` 응답이 `reply` 대신 `dialogue`로 바뀐다. 지금 `index.html`은 `reply`가 없으면 서버 응답을 버리고 예시 대사로 대답하므로, **서버 v2 배포 전에 앱 쪽 연결을 먼저 바꿔야 한다.**
- 앱: GitHub Pages `https://bii0411.github.io/Moti/` 응답 200.

## 남은 일

- v2 기능을 새 `index.html` 구조에 맞게 다시 만들기 ([v2-diff.md](v2-diff.md)의 "다시 만들 것")
- 코드 안 콘텐츠(대사·선물 반응·가격·관계 단계 이름 등)를 JSON으로 분리
- 서아 장소 5곳 배경 중 바 1층·2층 전용 이미지 제작 (지금은 임시 이미지)
- 외부 자산 출처 확인 ([CREDITS.md](CREDITS.md)의 "확인 필요")
- `.gitignore` 없음 → `.env.local` 등 비밀 파일 제외 규칙 추가 필요
- 기획 결정 전: 대화 화면 오버레이, 관계 진행 연출, 퀘스트와 힌트 ([plan.md](plan.md))
