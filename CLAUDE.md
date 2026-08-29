# Claude Instructions for This Repository

@AGENTS.md

특히 다음 세 가지에서 사고가 난다. 매번 확인할 것.

1. 실제 문항은 공개 `questions.json` 이 아니라 `private-data/questions.backup.json` 과 Supabase `questions` 테이블에 있다. 공개 저장소·PWA 캐시에 전체 문항을 넣지 않는다.
2. 회원 명단은 기존 Supabase `public.members` 테이블이다. 새 회원 테이블을 만들지 않는다.
3. 한국어를 고쳤으면 `_zh` · `_vi` · `_th` 를 같은 턴에 함께 고친다.
4. 앱 파일을 고쳤으면 `sw.js` 의 캐시 번호를 올리고, `origin` 과 `gw2` **두 리모트 모두** 푸시한다.

문항을 고쳤으면 `node tools/check-questions.mjs private-data/questions.backup.json` 를 돌리고, `tools/import-questions-to-supabase.mjs` 로 다시 가져온다.
