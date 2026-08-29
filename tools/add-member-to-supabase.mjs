const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function usage() {
  console.error([
    'Usage:',
    '  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node tools/add-member-to-supabase.mjs <email> [note]',
    '',
    'Examples:',
    '  node tools/add-member-to-supabase.mjs student@example.com',
    '  node tools/add-member-to-supabase.mjs student@example.com "paid until 2026-12-31"',
  ].join('\n'));
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

const email = normalizeEmail(process.argv[2]);
const note = process.argv.slice(3).join(' ').trim();

if (!url || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before adding a member.');
  usage();
  process.exit(1);
}

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Provide a valid member email address.');
  usage();
  process.exit(1);
}

const row = {
  email,
  active: true,
};
if (note) row.note = note;

const base = url.replace(/\/$/, '');
const headers = {
  apikey: serviceKey,
  authorization: `Bearer ${serviceKey}`,
  'content-type': 'application/json',
};

const listUrl = new URL(`${base}/rest/v1/members`);
listUrl.searchParams.set('select', 'id,email,active,note');
listUrl.searchParams.set('email', `ilike.${email}`);

const listRes = await fetch(listUrl, { headers });
if (!listRes.ok) {
  console.error(await listRes.text());
  throw new Error(`Failed to check member: ${email}`);
}

const existing = await listRes.json();
if (existing.length > 1) {
  console.warn(`Warning: found ${existing.length} rows matching ${email}. Updating the first row only.`);
}

const target = existing[0];
const endpoint = new URL(`${base}/rest/v1/members`);
if (target && target.id != null) endpoint.searchParams.set('id', `eq.${target.id}`);

const res = await fetch(endpoint, {
  method: target ? 'PATCH' : 'POST',
  headers: Object.assign({}, headers, {
    prefer: 'return=representation',
  }),
  body: JSON.stringify(row),
});

if (!res.ok) {
  console.error(await res.text());
  throw new Error(`Failed to add member: ${email}`);
}

const data = await res.json();
const saved = Array.isArray(data) ? data[0] : data;
console.log(`Member active: ${saved.email}`);
