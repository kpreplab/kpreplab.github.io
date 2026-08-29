/* Supabase import source checker · Supabase 导入源检查器
   사용법 / 用法:  node tools/check-questions.mjs [private-data/questions.backup.json]
   문항을 고친 뒤 커밋 전에 반드시 한 번 돌린다.
   改完题目、提交之前必须先跑一次。 */

import { existsSync, readFileSync } from 'node:fs';

const DEFAULT_PRIVATE = 'private-data/questions.backup.json';
const FILE = process.argv[2] || (existsSync(DEFAULT_PRIVATE) ? DEFAULT_PRIVATE : 'questions.json');
const LANGS = ['zh', 'vi', 'th'];
const TYPES = ['mc', 'writing', 'oral'];
const CATEGORIES = [
  // 귀화용 종합평가
  '한국어', '사회', '교육', '문화', '정치', '경제', '법', '역사', '지리',
  // 사회통합 사전평가
  '어휘', '문법', '읽기·이해', '대화', '한국문화', '한국사회',
  // 공통
  '작문', '구술',
];

const errors = [];
const warns = [];
const err = (id, ko, zh) => errors.push(`✗ ${id} — ${ko} (${zh})`);
const warn = (id, ko, zh) => warns.push(`△ ${id} — ${ko} (${zh})`);

let raw;
try {
  raw = readFileSync(FILE, 'utf8');
} catch {
  console.error(`✗ ${FILE} 을 열 수 없습니다 (打不开 ${FILE})`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error(`✗ JSON 문법 오류 (JSON 语法错误): ${e.message}`);
  console.error('  → 되돌리려면 / 想撤销就跑:  git checkout -- questions.json');
  process.exit(1);
}

/* 1. 파일 형식 — 들여쓰기 1칸, 한글·중문 그대로. 전체가 다시 쓰이면 여기서 걸린다.
      文件格式 — 缩进 1 格，非英文原样保留。整份文件被重写就会在这里被拦下。 */
const normalized = raw.replace(/\r\n/g, '\n');
if (normalized !== JSON.stringify(data, null, 1)) {
  err(FILE, '파일 형식이 원본과 다릅니다 — 들여쓰기 1칸 + 유니코드 그대로여야 합니다',
    '文件格式与原来不一致 — 必须是缩进 1 格、非英文字符不转义');
}

/* 2. 최상위 구조 / 顶层结构 */
for (const k of ['version', 'title', 'questions']) {
  if (!(k in data)) err('(파일)', `최상위 "${k}" 필드가 없습니다`, `缺少顶层字段 "${k}"`);
}
const qs = Array.isArray(data.questions) ? data.questions : [];
if (!qs.length && FILE === 'questions.json' && data.version === 'migrated-to-supabase') {
  console.log('공개 questions.json 은 Supabase 이전 후 빈 자리표시자입니다.');
  console.log('公开 questions.json 是迁移到 Supabase 后的空占位文件。');
  console.log(`실제 문항 검사는 ${DEFAULT_PRIVATE} 를 두고 다시 실행하세요.`);
  process.exit(0);
}
if (!qs.length) err('(파일)', 'questions 배열이 비었습니다', 'questions 数组是空的');

/* 3. 문항별 검사 / 逐题检查 */
const seen = new Map();
const nonEmpty = (v) => typeof v === 'string' && v.trim() !== '';

for (const [i, q] of qs.entries()) {
  const id = nonEmpty(q.id) ? q.id : `(${i}번째 문항)`;

  if (!nonEmpty(q.id)) err(id, 'id 가 없습니다', '没有 id');
  else if (seen.has(q.id)) err(id, `id 가 ${seen.get(q.id)}번째 문항과 겹칩니다`, `id 与第 ${seen.get(q.id)} 题重复`);
  else seen.set(q.id, i);

  if (!TYPES.includes(q.type)) err(id, `type 은 ${TYPES.join('/')} 중 하나여야 합니다`, `type 只能是 ${TYPES.join('/')}`);
  if (!CATEGORIES.includes(q.category)) err(id, `모르는 category "${q.category}"`, `未知的 category "${q.category}"`);
  if (!nonEmpty(q.q)) err(id, '문제 본문(q)이 비었습니다', '题干 (q) 是空的');

  for (const lang of LANGS) {
    if (!nonEmpty(q[`q_${lang}`])) err(id, `q_${lang} 번역이 없습니다 — 4개 언어를 함께 채웁니다`, `缺少 q_${lang} 翻译 — 四种语言要一起写`);
  }

  if (q.type === 'mc') {
    if (!Array.isArray(q.choices) || q.choices.length !== 4) {
      err(id, '객관식은 보기(choices)가 4개여야 합니다', '选择题必须有 4 个选项');
    } else if (q.choices.some((c) => !nonEmpty(c))) {
      err(id, '빈 보기가 있습니다', '有空的选项');
    }
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) {
      err(id, 'answer 는 0~3 정수입니다 (0=①, 1=②, 2=③, 3=④)', 'answer 是 0~3 的整数（0=①，1=②，2=③，3=④）');
    }
    if (!nonEmpty(q.explanation)) err(id, '해설(explanation)이 없습니다', '缺少解析 (explanation)');
    for (const lang of LANGS) {
      const ch = q[`choices_${lang}`];
      if (!Array.isArray(ch) || ch.length !== 4 || ch.some((c) => !nonEmpty(c))) {
        err(id, `choices_${lang} 가 없거나 4개가 아닙니다`, `choices_${lang} 缺失或不是 4 个`);
      }
      if (!nonEmpty(q[`explanation_${lang}`])) err(id, `explanation_${lang} 이 없습니다`, `缺少 explanation_${lang}`);
    }
  } else {
    if (!nonEmpty(q.guide)) err(id, '작문·구술은 도움말(guide)이 필요합니다', '写作·口试需要 guide');
    if (!nonEmpty(q.model)) err(id, '작문·구술은 모범답안(model)이 필요합니다', '写作·口试需要 model');
    for (const lang of LANGS) {
      if (!nonEmpty(q[`guide_${lang}`])) err(id, `guide_${lang} 이 없습니다`, `缺少 guide_${lang}`);
      if (!nonEmpty(q[`model_${lang}`])) err(id, `model_${lang} 이 없습니다`, `缺少 model_${lang}`);
    }
    if ('answer' in q) warn(id, '작문·구술에는 answer 가 필요 없습니다', '写作·口试不需要 answer');
  }

  if ('exam' in q && q.exam !== 'pre') err(id, `exam 은 "pre" 이거나 아예 없어야 합니다`, `exam 只能是 "pre" 或者干脆不写`);
  if ('level' in q && ![0, 1, 2, 3].includes(q.level)) err(id, 'level 은 0~3 입니다', 'level 是 0~3');
  if ('tier' in q && q.tier !== 'advanced') err(id, 'tier 는 "advanced" 만 씁니다', 'tier 只用 "advanced"');
  if ('listen' in q) {
    for (const lang of LANGS) {
      if (!nonEmpty(q[`listen_${lang}`])) err(id, `listen_${lang} 이 없습니다`, `缺少 listen_${lang}`);
    }
  }
}

/* 3.5 작문 자동채점 데이터 / 作文自动评分数据
   - 사전평가 단답형: accept 로 모범답안이 만점을 받아야 한다.
   - 종합평가 서술형: parts 표지어로 모범답안이 ①②③④ 를 전부 통과해야 한다.
   채점기(app.js 의 ws* 함수)와 같은 규칙을 여기서 다시 구현하지 않고 최소한만 본다. */
const wNorm = (x) => String(x == null ? '' : x)
  .replace(/<[^>]*>/g, '').replace(/[\s　]+/g, '')
  .replace(/[.,!?~…·、。'"“”‘’`()（）\[\]{}:;/\\-]+/g, '').toLowerCase();

for (const q of qs) {
  if (q.type !== 'writing') continue;
  const id = q.id;
  const isPre = q.exam === 'pre';

  if (isPre) {
    if (!Array.isArray(q.accept) || !q.accept.length) {
      warns.push(`  ⚠ ${id}: accept 가 없어 자동채점이 안 됩니다 (缺少 accept，无法自动评分)`);
      continue;
    }
    if ('nearMiss' in q && !Array.isArray(q.nearMiss)) err(id, 'nearMiss 는 배열이어야 합니다', 'nearMiss 必须是数组');
    if (!nonEmpty(q.hint)) warns.push(`  ⚠ ${id}: hint 가 없습니다 (缺少 hint)`);
    // 모범답안이 만점을 받는가 — nearMiss 가 정답을 가로채면 여기서 걸린다
    const t = wNorm(q.model);
    const acc = q.accept.map(wNorm).filter(Boolean);
    const near = (q.nearMiss || []).map(wNorm).filter(Boolean);
    let best = null;
    for (const a of acc) if (t.includes(a) && (!best || a.length > best.s.length)) best = { s: a, ok: true };
    for (const a of near) if (t.includes(a) && (!best || a.length > best.s.length)) best = { s: a, ok: false };
    if (!best) err(id, '모범답안이 accept 에 하나도 안 걸립니다', '参考答案没有命中任何 accept');
    else if (!best.ok) err(id, `모범답안이 nearMiss "${best.s}" 에 먼저 걸려 만점이 안 됩니다`, `参考答案先命中了 nearMiss "${best.s}"，拿不到满分`);
  } else {
    if (!Array.isArray(q.parts) || !q.parts.length) {
      warns.push(`  ⚠ ${id}: parts 가 없어 자동채점이 안 됩니다 (缺少 parts，无法自动评分)`);
      continue;
    }
    const t = wNorm(q.model);
    q.parts.forEach((p, i) => {
      if (!nonEmpty(p.label)) err(id, `parts[${i}].label 이 없습니다`, `parts[${i}] 缺少 label`);
      if (!Array.isArray(p.anyOf) || p.anyOf.length < 6) {
        err(id, `parts[${i}] 의 표지어가 6개 미만입니다`, `parts[${i}] 的标记词少于6个`);
        return;
      }
      if (!p.anyOf.some((k) => { const kk = wNorm(k); return kk && t.includes(kk); })) {
        err(id, `모범답안이 ①②③④[${i + 1}] "${p.label}" 을 통과하지 못합니다`,
                `参考答案通不过第${i + 1}小点 "${p.label}"`);
      }
    });
    // 소주제끼리 부분문자열로 겹치면 한쪽을 쓴 답안이 다른 쪽까지 통과시킨다
    for (let i = 0; i < q.parts.length; i++) {
      for (let j = i + 1; j < q.parts.length; j++) {
        for (const a of (q.parts[i].anyOf || [])) {
          for (const b of (q.parts[j].anyOf || [])) {
            const A = wNorm(a), B = wNorm(b);
            if (A && B && (A.includes(B) || B.includes(A))) {
              err(id, `①②③④[${i + 1}] "${a}" 와 [${j + 1}] "${b}" 가 겹칩니다`,
                      `第${i + 1}小点 "${a}" 与第${j + 1}小点 "${b}" 重叠`);
            }
          }
        }
      }
    }
  }
}

/* 4. 결과 / 结果 */
const nat = qs.filter((q) => q.exam !== 'pre').length;
const pre = qs.length - nat;
console.log(`문항 ${qs.length}개 — 귀화용 종합평가 ${nat} · 사회통합 사전평가 ${pre}`);
console.log(`共 ${qs.length} 道题 — 归化综合评价 ${nat} 道 · 社会统合预评价 ${pre} 道`);

for (const w of warns) console.log(w);

if (errors.length) {
  console.error(`\n문제 ${errors.length}건을 찾았습니다 (发现 ${errors.length} 个问题):`);
  for (const e of errors.slice(0, 40)) console.error('  ' + e);
  if (errors.length > 40) console.error(`  ... 그리고 ${errors.length - 40}건 더 (还有 ${errors.length - 40} 个)`);
  console.error('\n고친 뒤 다시 돌리세요. 되돌리려면: git checkout -- questions.json');
  console.error('改好后再跑一次。想撤销就跑: git checkout -- questions.json');
  process.exit(1);
}

console.log('\n✓ 이상 없습니다. 커밋해도 됩니다. (没问题，可以提交了。)');
