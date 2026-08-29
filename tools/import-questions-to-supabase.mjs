import fs from 'node:fs';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const source = process.argv[2] || 'private-data/questions.backup.json';

if (!url || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this importer.');
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(source, 'utf8'));
const questions = Array.isArray(raw) ? raw : raw.questions;
if (!Array.isArray(questions) || !questions.length) {
  console.error('No questions found in source file.');
  process.exit(1);
}

function examOf(q) {
  return q.exam === 'pre' ? 'pre' : 'nat';
}

const rows = questions.map((q, idx) => ({
  id: q.id,
  category: q.category || '기타',
  type: q.type || 'mc',
  exam: examOf(q),
  question_number: idx + 1,
  content: q,
}));

const endpoint = `${url.replace(/\/$/, '')}/rest/v1/questions?on_conflict=id`;
const batchSize = Number(process.env.BATCH_SIZE || 200);

for (let i = 0; i < rows.length; i += batchSize) {
  const batch = rows.slice(i, i + batchSize);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(batch),
  });
  if (!res.ok) {
    console.error(await res.text());
    throw new Error(`Import failed at rows ${i + 1}-${i + batch.length}`);
  }
  console.log(`Imported ${Math.min(i + batch.length, rows.length)} / ${rows.length}`);
}

console.log('Question import complete.');
