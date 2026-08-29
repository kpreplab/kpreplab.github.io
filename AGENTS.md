# 귀화시험 앱 작업 규칙

이 저장소를 고치는 AI 에이전트(Codex·Claude 등)와 사람이 함께 지키는 규칙이다.
전역 사용자 지시가 있으면 그것을 먼저 따르고, 이 저장소 안의 일은 아래를 따른다.

앱 소개와 문항 형식은 `README.md` 에 있다. 이 문서는 **고치고 배포하는 절차**만 다룬다.

- 라이브 주소: (배포 후 여기에 적기)
- 공개 저장소의 `questions.json` 은 빈 자리표시자다. 실제 문항은 Supabase `questions` 테이블에 있고, 로컬 비공개 백업은 `private-data/questions.backup.json` 에 둔다. `private-data/` 는 `.gitignore` 되어 있으므로 공개 저장소에 올리지 않는다.
- 회원 명단은 이미 존재하는 Supabase `public.members` 테이블을 쓴다(`id int8`, `created_at`, `note`, `email`, `active`). 이 표를 마이그레이션에서 새로 만들거나 바꾸지 말고, 관리자 추가/비활성화는 Dashboard Table Editor 에서 한다.
- 공개 홈의 영역명과 문항 수는 `question-catalog.json` 에서 읽는다. 화면·로직은 `index.html` · `app.js` · `membership.js` · `styles.css`, 타자 연습 서브앱은 `typing/` 아래에 따로 있다.

## 1. 문항 고치기 — `private-data/questions.backup.json` + Supabase

- **고칠 문항을 찾는 법**: 앱 화면에서 본 문제 문장을 로컬 비공개 백업에서 검색한다. 문항마다 `id`(예: `g123`, `pa-ora101`)가 있지만 앱 화면에는 보이지 않으므로, 사용자가 알려주는 것은 보통 문제 문장이다.
  `grep -n "문제 문장 일부" private-data/questions.backup.json`
- **부분만 고친다.** 파일 전체를 다시 써서 저장하지 않는다. 4.5MB · 59,000줄이라 전체가 다시 쓰이면 무엇이 바뀌었는지 아무도 확인할 수 없다.
- 스크립트로 고쳐야 한다면 원본과 **바이트가 같은 형식**으로 다시 써야 한다. 검증된 방법은 두 가지뿐이다.
  - Node: `fs.writeFileSync('private-data/questions.backup.json', JSON.stringify(data, null, 1))`
  - Python: `open('private-data/questions.backup.json','w',encoding='utf-8').write(json.dumps(data, ensure_ascii=False, indent=1))`
  - 들여쓰기는 **1칸**, 한글·중문·베트남어·태국어는 **이스케이프하지 않는다**. `ensure_ascii=True`(파이썬 기본값)로 저장하면 파일 전체가 `\uXXXX` 로 바뀌므로 절대 쓰지 않는다.
- **네 개 언어를 함께 채운다.** 한국어(`q`, `choices`, `explanation`, `guide`, `model`)를 고쳤으면 중국어(`_zh`) · 베트남어(`_vi`) · 태국어(`_th`)도 같은 뜻으로 함께 고친다. 한국어가 원본이고, 나머지는 그 뜻을 각 언어답게 옮긴 것이다. 한 언어라도 비면 그 사용자에게는 번역이 사라진 채로 보인다.
- `answer` 는 **0부터 센다**. `0`=①, `1`=②, `2`=③, `3`=④. 객관식 보기는 항상 4개다.
- 새 문항을 넣을 때 `id` 는 기존과 겹치지 않게 짓는다(사전평가 문항은 `pa-` 로 시작하는 관례가 있다). `exam` 은 사회통합 사전평가 문항에만 `"pre"` 로 넣고, 귀화용 종합평가 문항에는 넣지 않는다.
- 저작권이 있는 교재의 문제를 그대로 옮기지 않는다. 공개 견본이나 직접 정리한 문항만 넣는다.

## 2. 커밋 전에 반드시 검사

```bash
node tools/check-questions.mjs private-data/questions.backup.json
node tools/build-public-catalog.mjs private-data/questions.backup.json question-catalog.json
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node tools/import-questions-to-supabase.mjs private-data/questions.backup.json
```

JSON 문법, 파일 형식, `id` 중복, `answer` 범위, 4개 언어 누락, 영역 이름을 한 번에 검사한다. 통과하지 못하면 Supabase 로 가져오지 않는다.

## 3. 화면에서 확인

`index.html` 은 공개 목차 파일과 Supabase 를 읽으므로 파일을 더블클릭해서 열면(`file://`) 인증/동기화가 정상 동작하지 않는다. 로컬 서버로 연다.

```bash
python -m http.server 8080
```

그다음 <http://localhost:8080/> 을 연다. 비밀번호 잠금 화면이 먼저 나오는데, 소유자에게 받은 비밀번호를 넣으면 된다.

## 4. 배포 — 캐시 번호

- 화면에 보이는 파일(`index.html`·`app.js`·`styles.css`·`typing/`)을 고쳤으면 `sw.js` 맨 위 `CACHE` 번호를 반드시 올린다.
  올리지 않으면 기존 사용자에게 옛 파일이 그대로 나간다.
- 문항만 고쳤다면(Supabase 쪽) 캐시 번호는 건드리지 않아도 된다.
- 푸시하면 GitHub Pages 가 자동으로 다시 배포한다. 반영까지 1~2분 걸린다.

```bash
git add -A && git commit -m "설명" && git push origin main
```


## 5. 손대지 말 것

- `app.js` 의 `GATE_HASH` · `GATE_ALT` 는 공유 비밀번호 잠금이다. 소유자가 명시적으로 비밀번호 교체를 지시할 때만 고치고, 그때는 두 값을 함께 바꾼다. 비밀번호 평문을 저장소 안 어떤 파일에도 적지 않는다.
- Supabase service-role key 는 브라우저 코드, `supabase-config.js`, GitHub 저장소에 절대 넣지 않는다. `supabase-config.js` 에는 URL 과 anon/publishable key 만 넣는다.
- `questions.json`, `typing/data.js`, Service Worker precache 에 실제 문항/모범답안을 다시 넣지 않는다.
- `.nojekyll` 은 GitHub Pages 설정이다. 지우지 않는다.

## 6. 디자인을 건드릴 때 (Clarity)

이 앱은 소유자의 다른 앱들과 같은 "Clarity" 디자인(토스풍: 중성 회색 바탕 + 파랑 하나 + Pretendard)을 쓴다. UI 요소를 새로 만들 때도 아래 값을 그대로 쓴다.

- 바탕 `#fafafa` · 카드 `#ffffff` · 옅은 면 `#f4f5f7` · 선 `#e5e8eb`
- 글자 `#191f28` · 부드러운 글자 `#4e5968` · 흐린 글자 `#6b7684`
- 파랑 `#3182f6`(누름 `#2272eb`, 옅은 배경 `#e8f3ff`) — 기본 버튼은 파랑 바탕에 흰 글자
- 정답/경고/오답 `#067647` / `#b25b00` / `#d22030`
- 글꼴은 Pretendard, 굵기는 400·600·700만. 기울임꼴은 쓰지 않는다.
- 모서리 8 / 12 / 16px, 알약형 `9999px`. 바탕에 그라데이션·무늬를 넣지 않는다.

## 7. 한국어 문구 규칙

앱에 새로 넣는 한국어 문장은 주어와 목적어를 분명히 쓴다. "남는다", "장부", "손대다" 같은 비유 표현 대신 무엇이 어떻게 되는지 그대로 쓴다. 대시(—)는 UI 문구에 쓰지 않는다. 한국어를 고쳤으면 중국어·베트남어·태국어 UI 문구도 같은 턴에 맞춘다.
