import fs from 'node:fs';

const source = process.argv[2] || 'questions.json';
const target = process.argv[3] || 'question-catalog.json';
const raw = JSON.parse(fs.readFileSync(source, 'utf8'));
const questions = Array.isArray(raw) ? raw : raw.questions;

function examOf(q) {
  return q.exam === 'pre' ? 'pre' : 'nat';
}
function inPublicExam(q, exam) {
  if (exam === 'pre') return examOf(q) === 'pre';
  if (exam === 'perm') return examOf(q) === 'nat' && q.tier !== 'advanced';
  return examOf(q) === 'nat';
}
function addCount(map, key) {
  map[key] = (map[key] || 0) + 1;
}
function summarize(exam) {
  const list = questions.filter((q) => inPublicExam(q, exam));
  const byType = {};
  const categories = {};
  for (const q of list) {
    addCount(byType, q.type || 'unknown');
    const cat = q.category || '기타';
    if (!categories[cat]) categories[cat] = { category: cat, total: 0, mc: 0, writing: 0, oral: 0 };
    categories[cat].total += 1;
    if (q.type === 'mc') categories[cat].mc += 1;
    else if (q.type === 'writing') categories[cat].writing += 1;
    else if (q.type === 'oral') categories[cat].oral += 1;
  }
  return {
    total: list.length,
    mc: byType.mc || 0,
    writing: byType.writing || 0,
    oral: byType.oral || 0,
    categories: Object.values(categories),
  };
}

const catalog = {
  version: raw.version || 'unknown',
  sourceCount: questions.length,
  exams: {
    pre: summarize('pre'),
    perm: summarize('perm'),
    nat: summarize('nat'),
  },
};

fs.writeFileSync(target, JSON.stringify(catalog, null, 2) + '\n');
console.log(`Wrote ${target}`);
