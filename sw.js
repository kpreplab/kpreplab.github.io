/* 서비스워커 — 항상 최신 + 오프라인 + 새 버전 자동 적용
   - network-first: 인터넷이 되면 항상 최신 앱 셸을 받고 캐시에도 저장. 오프라인이면 캐시.
   - 회원 문제 데이터는 Supabase RLS로 보호되므로 서비스워커에 저장하지 않는다.
   - 새 버전이 설치되면(업데이트) 열려 있는 창을 자동으로 새로고침해 즉시 최신으로 교체.
   - 앱을 새로 배포할 때 CACHE 숫자만 올리면 모든 기기가 다음 접속 때 자동 갱신됩니다. */
const CACHE = 'gwiwha-v51';
const CORE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './membership.js',
  './supabase-config.js',
  './manifest.webmanifest',
  './question-catalog.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
];

let isUpdate = false;

self.addEventListener('install', (e) => {
  isUpdate = !!self.registration.active; // 기존 워커가 있으면 '업데이트'(최초 설치 아님)
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
    // 업데이트인 경우에만 열린 창을 새로고침(최초 설치 땐 새로고침 안 함)
    if (isUpdate) {
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const c of clients) { try { c.navigate(c.url); } catch (err) {} }
    }
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const isSensitive = url.pathname.endsWith('questions.json') || url.pathname.endsWith('/typing/data.js');
  if (isSensitive) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => {
        return caches.match(req).then((c) => c || (req.mode === 'navigate' ? caches.match('./index.html') : undefined));
      })
  );
});

self.addEventListener('message', (e) => {
  if (!e.data || e.data.type !== 'CLEAR_MEMBER_CACHE') return;
  e.waitUntil((async () => {
    const keys = await caches.keys();
    for (const key of keys) {
      const cache = await caches.open(key);
      const reqs = await cache.keys();
      await Promise.all(reqs
        .filter((req) => /questions\.json|typing\/data\.js/.test(new URL(req.url).pathname))
        .map((req) => cache.delete(req)));
    }
  })());
});
