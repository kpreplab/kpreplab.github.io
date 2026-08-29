# 귀화시험 종합평가 연습 앱 (KIIP 종합평가 / 귀화용)

> 대한민국 **귀화용 종합평가**(사회통합프로그램 KIIP)를 연습하는 회원용 웹앱입니다.
> 공개 비밀번호로 홈과 목차를 보고, 회원은 이메일 인증번호 로그인 후 객관식 모의고사 · 영역별 연습 · 작문/구술 · 오답노트 · 학습통계를 이용합니다.

## 🔗 바로 사용하기

**👉 (배포 후 여기에 주소 적기)**

공개 비밀번호를 입력하면 홈과 목차를 볼 수 있습니다. 실제 문제 풀이는 회원 로그인 후 이용합니다.

---

## 누구에게 좋은가

- 귀화용·영주용 **종합평가**(필기 객관식 + 작문 + 구술)를 준비하는 분
- 사회통합프로그램(KIIP) 5단계 종합평가, 또는 단계 배정용 **사전평가**를 앞둔 분
- 한국어가 아직 어려운 분 — **한국어·中文·Tiếng Việt·ภาษาไทย 4개 언어** 지원 (문제 아래에 번역을 함께 표시)

## 기능

- **📝 모의고사** — 실제 시험 구성 그대로: 종합평가는 객관식 36 + 작문 1 + 구술 5(영역별 출제 비율도 실제 시험 기준), 사전평가는 객관식 48 + 단답 2 + 구술 5. 60분 타이머 → 자동 채점, 합격선(60점)·예상 단계 표시
- **📚 영역별 연습** — 한국어·사회·교육·문화·정치·경제·법·역사·지리 9개 영역, 한 문제씩 풀고 바로 해설
- **✍️ 작문·구술 연습** — 주제별 글쓰기(200자 글자수 표시)와 말하기 연습, 도움말 제공
- **🔁 오답 노트** — 틀린 문제 자동 저장, 다시 맞히면 사라짐
- **📊 학습 통계** — 정답률, 영역별 성적, 모의고사 기록
- **📴 PWA** — 홈 화면에 설치 가능. 회원 문제 데이터는 Supabase 권한 확인 후 온라인에서 불러옵니다.

## 앱처럼 설치하기 (선택)

브라우저로 위 링크를 연 뒤:

- **아이폰/아이패드 (Safari)** — 공유 버튼 → *홈 화면에 추가*
- **안드로이드 (Chrome)** — 메뉴(⋮) → *앱 설치 / 홈 화면에 추가*
- **PC/맥 (Chrome·Edge)** — 주소창 오른쪽의 설치 아이콘(⊕) 클릭
- **맥 (Safari, Sonoma 이상)** — 파일 → *Dock에 추가*

설치하면 독/홈 화면에 "귀화시험" 아이콘이 생기고, 앱처럼 전체화면으로 열립니다.

---

## 문제 추가·수정

공개 저장소의 `questions.json` 은 빈 자리표시자입니다. 실제 문제은행은 Supabase `questions` 테이블에 있고, 로컬 비공개 백업은 `private-data/questions.backup.json` 로 둡니다. 이 폴더는 `.gitignore` 처리되어 GitHub Pages 에 배포되지 않습니다.

문항 형식은 기존 JSON 객체를 그대로 사용합니다.

```json
{
  "id": "h08",
  "category": "역사",
  "type": "mc",
  "q": "문제 내용",
  "q_zh": "中文 번역(선택)",
  "choices": ["보기1", "보기2", "보기3", "보기4"],
  "choices_zh": ["选项1", "选项2", "选项3", "选项4"],
  "answer": 1,
  "explanation": "해설(선택)",
  "explanation_zh": "解析(선택)"
}
```

- 영역(`category`): 한국어 / 사회 / 교육 / 문화 / 정치 / 경제 / 법 / 역사 / 지리
- 작문 문제: `"type": "writing"`, `q`(주제) + `guide`(도움말)
- 구술 문제: `"type": "oral"`, `q`(질문) + `guide`(도움말)
- 번역 필드는 중국어(`*_zh`)·베트남어(`*_vi`)·태국어(`*_th`)이며 선택입니다. 없으면 한국어만 보입니다.

수정 후에는 `node tools/check-questions.mjs private-data/questions.backup.json` 로 검사하고, `node tools/import-questions-to-supabase.mjs private-data/questions.backup.json` 로 Supabase 에 다시 가져옵니다.

## Supabase 연결

이 프로젝트는 Vite/빌드 앱이 아니라 GitHub Pages 에 바로 올리는 정적 PWA 입니다. Supabase JS v2 는 `index.html` 과 `typing/index.html` 에서 CDN 으로 불러오고, 초기화 값은 `supabase-config.js` 에 둡니다.

`supabase-config.js`:

```js
window.GWIWHA_SUPABASE = {
  url: 'https://YOUR_PROJECT_ID.supabase.co',
  anonKey: 'YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY',
};
```

- `url`: Supabase Dashboard → Project Settings → API, 또는 Integrations → Data API 에서 API URL 을 복사합니다.
- `anonKey`: Supabase Dashboard → Settings → API Keys 에서 Publishable key 또는 legacy `anon` key 를 복사합니다.
- `service_role` / Secret key 는 브라우저 코드와 GitHub 저장소에 넣지 않습니다.
- 현재 GitHub Pages 정적 배포는 GitHub Secrets 가 필요 없습니다. Secrets 는 빌드 단계에서 `supabase-config.js` 를 생성하도록 바꿀 때만 필요합니다.

Auth 이메일 로그인 리디렉트가 필요하면 Supabase Dashboard → Authentication → URL Configuration 에 GitHub Pages 주소를 Site URL / Redirect URLs 로 등록합니다.

## 회원 추가

회원은 기존 Supabase `public.members` 테이블에 이메일을 소문자로 추가합니다. 브라우저에는 service-role key 를 넣지 말고, 로컬 터미널 또는 Supabase Dashboard 에서만 관리하세요.

```bash
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY \
node tools/add-member-to-supabase.mjs student@example.com "paid"
```

Dashboard 에서 직접 추가할 때는 Table Editor → `members` → Insert row 에서 `email` 과 `active=true` 를 넣습니다.

회원 이용을 중지하려면 Supabase Dashboard 의 `members` 테이블에서 해당 이메일의 `active` 값을 `false` 로 바꿉니다.

## 파일 구조

| 파일 | 설명 |
|---|---|
| `index.html` | 앱 화면 |
| `styles.css` | 디자인 |
| `app.js` | 공개 목차·회원 로그인·퀴즈·채점·통계 로직 |
| `membership.js` | Supabase Auth + 회원 상태 확인 |
| `supabase-config.js` | 브라우저용 Supabase URL/anon key 설정 |
| `question-catalog.json` | 공개 목차와 문항 수 |
| `questions.json` | 공개 빈 자리표시자 |
| `supabase/migrations/001_membership_and_questions.sql` | members/questions/RLS 생성 SQL |
| `tools/import-questions-to-supabase.mjs` | 로컬 비공개题库를 Supabase 로 가져오는 스크립트 |
| `tools/add-member-to-supabase.mjs` | Supabase `members` 테이블에 회원 이메일을 추가하는 스크립트 |
| `sw.js` | 오프라인/자동 업데이트 서비스워커 |
| `manifest.webmanifest` | 앱 설치 정보 |

## 출처·주의

- 시험 구조·합격 기준 출처: 한국이민재단 kiiptest.org, 사회통합정보망 socinet.go.kr, 법무부 종합평가 안내
- 기본 제공 문제는 공개 사실과 공식 견본 구조를 바탕으로 작성한 **연습용**입니다.
- 저작권이 있는 교재의 문제를 그대로 복제·배포하지 마세요. 공개 견본 또는 직접 정리한 문제만 사용하세요.

## 라이선스

개인 학습용으로 자유롭게 사용하세요. 문제 기여·개선 제안 환영합니다.
